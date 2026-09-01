<?php

namespace App\Controllers\Api\V1;

use App\Controllers\Api\BaseCrudController;
use App\Models\CategoryModel;
use App\Models\ProductModel;
use App\Models\StoreModel;
use App\Models\StoreProductPriceModel;
use App\Models\TaxRateModel;
use App\Models\UnitModel;
use CodeIgniter\Database\Exceptions\DatabaseException;
use Config\Services;

class ProductsController extends BaseCrudController
{
    protected string $modelClass = ProductModel::class;
    protected array $allowedFilters = ['company_id', 'category_id', 'unit_id', 'tax_rate_id', 'is_active', 'track_inventory'];
    protected array $allowedSorts = ['id', 'name', 'sku', 'minimum_stock', 'is_active', 'created_at'];
    protected array $searchableFields = ['name', 'sku', 'barcode', 'description'];
    protected string $defaultSort = 'name';

    /**
     * A ?store_id= on the list endpoint resolves each product's price
     * (and on-hand stock_quantity) at that store — both left-joined, so
     * an unpriced or never-stocked product still appears, just with a
     * null value — this is what the POS product search relies on.
     * listResource() can't express a join, so this path bypasses it
     * entirely rather than bolting one onto the generic helper.
     */
    public function index()
    {
        $storeId = $this->request->getGet('store_id');
        if ($storeId !== null && $storeId !== '') {
            return $this->indexWithStorePrice((int) $storeId);
        }

        // "category" isn't a real column — the list shows the category's
        // NAME, not its id, so sorting has to order by the joined name too
        // or the visible order wouldn't look sorted at all. listResource()
        // only knows how to order by a column on this table directly, so
        // that one case is the only reason to bypass it here.
        $sortParam = ltrim((string) $this->request->getGet('sort'), '-');
        if ($sortParam === 'category') {
            return $this->indexSortedByCategory();
        }

        return parent::index();
    }

    private function indexSortedByCategory()
    {
        $auth = Services::authContext();
        $direction = str_starts_with((string) $this->request->getGet('sort'), '-') ? 'DESC' : 'ASC';

        $builder = model(ProductModel::class)->builder();
        $builder->select('products.*')
            ->join('categories', 'categories.id = products.category_id', 'left')
            ->where('products.company_id', $auth->companyId);

        foreach (['category_id', 'unit_id', 'tax_rate_id', 'is_active', 'track_inventory'] as $field) {
            $value = $this->request->getGet($field);
            if ($value !== null && $value !== '') {
                $builder->where("products.$field", $value);
            }
        }

        $search = trim((string) $this->request->getGet('q'));
        if ($search !== '') {
            $builder->groupStart();
            foreach (['name', 'sku', 'barcode', 'description'] as $i => $field) {
                $method = $i === 0 ? 'like' : 'orLike';
                $builder->{$method}("products.$field", $search);
            }
            $builder->groupEnd();
        }

        $perPage = max(1, min((int) ($this->request->getGet('per_page') ?? 15), 100));
        $page = max(1, (int) ($this->request->getGet('page') ?? 1));
        $total = $builder->countAllResults(false);
        // NULLs (products with no category) sort last in both directions —
        // otherwise DESC would put them first, ahead of every real category.
        $rows = $builder
            ->orderBy('categories.name IS NULL', 'ASC', false)
            ->orderBy('categories.name', $direction)
            ->orderBy('products.name', 'ASC')
            ->get($perPage, ($page - 1) * $perPage)
            ->getResult();

        return $this->ok($rows, '', [
            'page' => $page,
            'per_page' => $perPage,
            'total' => $total,
            'last_page' => (int) ceil($total / $perPage) ?: 1,
        ]);
    }

    private function indexWithStorePrice(int $storeId)
    {
        $auth = Services::authContext();
        $store = model(StoreModel::class)->where('company_id', $auth->companyId)->find($storeId);
        if (! $store) {
            return $this->apiFail('Unknown store_id', 422);
        }

        $builder = model(ProductModel::class)->builder();
        $builder->select('products.*, spp.cost_price, spp.selling_price, inv.quantity AS stock_quantity')
            ->where('products.company_id', $auth->companyId)
            ->join('store_product_prices spp', "spp.product_id = products.id AND spp.store_id = {$storeId}", 'left')
            ->join('inventory inv', "inv.product_id = products.id AND inv.store_id = {$storeId}", 'left');

        foreach (['category_id', 'unit_id', 'tax_rate_id', 'is_active', 'track_inventory'] as $field) {
            $value = $this->request->getGet($field);
            if ($value !== null && $value !== '') {
                $builder->where("products.$field", $value);
            }
        }

        $search = trim((string) $this->request->getGet('q'));
        if ($search !== '') {
            $builder->groupStart();
            foreach (['name', 'sku', 'barcode', 'description'] as $i => $field) {
                $method = $i === 0 ? 'like' : 'orLike';
                $builder->{$method}("products.$field", $search);
            }
            $builder->groupEnd();
        }

        $perPage = max(1, min((int) ($this->request->getGet('per_page') ?? 15), 100));
        $page = max(1, (int) ($this->request->getGet('page') ?? 1));
        $total = $builder->countAllResults(false);
        $rows = $builder->orderBy('products.name', 'ASC')->get($perPage, ($page - 1) * $perPage)->getResult();

        return $this->ok($rows, '', [
            'page' => $page,
            'per_page' => $perPage,
            'total' => $total,
            'last_page' => (int) ceil($total / $perPage) ?: 1,
        ]);
    }

    /**
     * category_id/unit_id/tax_rate_id are checked here, before the write,
     * rather than relying on the DB's FK constraint to reject a bad one —
     * a constraint violation surfaces as a raw DatabaseException (SQL text
     * and all), not a clean 422. Mirrors CategoriesController's parent_id
     * pre-check. Returns an error string, or null when everything named in
     * the payload exists (and, for category/tax rate, belongs to the
     * caller's own company).
     */
    private function foreignKeyError(array $payload): ?string
    {
        $companyId = Services::authContext()->companyId;

        if (! empty($payload['category_id']) && ! model(CategoryModel::class)->where('company_id', $companyId)->find((int) $payload['category_id'])) {
            return 'category_id does not exist';
        }

        if (! empty($payload['unit_id']) && ! model(UnitModel::class)->find((int) $payload['unit_id'])) {
            return 'unit_id does not exist';
        }

        if (! empty($payload['tax_rate_id']) && ! model(TaxRateModel::class)->where('company_id', $companyId)->find((int) $payload['tax_rate_id'])) {
            return 'tax_rate_id does not exist';
        }

        return null;
    }

    public function create()
    {
        if ($error = $this->foreignKeyError($this->payload())) {
            return $this->apiFail($error, 422);
        }

        return parent::create();
    }

    public function update($id = null)
    {
        if ($error = $this->foreignKeyError($this->payload())) {
            return $this->apiFail($error, 422);
        }

        return parent::update($id);
    }

    /**
     * POST /api/v1/products/bulk  body: { products: [{ sku, name, ... }, ...] }
     * Best-effort, not all-or-nothing: each row is validated and inserted
     * independently, so one bad row (a typo'd unit_id, a duplicate SKU)
     * doesn't discard 200 good ones — exactly the failure mode a
     * spreadsheet-style bulk add or a CSV import needs, since the caller
     * (Bulk Add grid / Import Products screen) re-shows only the failed
     * rows for the user to fix and resubmit.
     */
    public function bulkCreate()
    {
        $payload = $this->request->getJSON(true) ?? [];
        $rows = $payload['products'] ?? null;

        if (! is_array($rows) || $rows === []) {
            return $this->apiFail('products must be a non-empty array', 422);
        }

        if (count($rows) > 500) {
            return $this->apiFail('Cannot import more than 500 products at once', 422);
        }

        $companyId = Services::authContext()->companyId;
        $results = [];
        $created = 0;

        foreach (array_values($rows) as $i => $row) {
            if (! is_array($row)) {
                $results[] = ['index' => $i, 'success' => false, 'error' => 'Row must be an object'];
                continue;
            }

            if ($error = $this->foreignKeyError($row)) {
                $results[] = ['index' => $i, 'success' => false, 'error' => $error];
                continue;
            }

            $data = [
                'company_id' => $companyId,
                'sku' => $row['sku'] ?? null,
                'barcode' => $row['barcode'] ?? null,
                'name' => $row['name'] ?? null,
                'description' => $row['description'] ?? null,
                'category_id' => $row['category_id'] ?? null,
                'unit_id' => $row['unit_id'] ?? null,
                'tax_rate_id' => $row['tax_rate_id'] ?? null,
                'minimum_stock' => $row['minimum_stock'] ?? '0',
                'is_active' => $row['is_active'] ?? 1,
                'track_inventory' => $row['track_inventory'] ?? 1,
            ];

            try {
                // Fresh model instance per row — reusing $this->model would
                // carry the previous row's validation errors into the next
                // row's result whenever that earlier row had failed.
                $rowModel = model(ProductModel::class);
                $id = $rowModel->insert($data, true);

                if ($id === false) {
                    $results[] = ['index' => $i, 'success' => false, 'error' => implode(' ', $rowModel->errors())];
                    continue;
                }

                $newRow = $rowModel->find($id);
                Services::auditLogger()->log('create', 'Product', $id, $newRow->name ?? $newRow->sku, (array) $newRow);
                $results[] = ['index' => $i, 'success' => true, 'data' => $newRow];
                $created++;
            } catch (DatabaseException $e) {
                // MySQL (production) phrases this "Duplicate entry '...' for
                // key ..."; SQLite (the automated test suite's driver) says
                // "UNIQUE constraint failed: products.company_id, products.
                // barcode" instead — matching only the MySQL wording left
                // this branch unreachable under SQLite, turning one bad row
                // into a 500 for the whole batch instead of a per-row fail.
                $isDuplicate = str_contains($e->getMessage(), 'Duplicate entry')
                    || str_contains($e->getMessage(), 'UNIQUE constraint failed');
                if (! $isDuplicate) {
                    throw $e;
                }
                $field = str_contains($e->getMessage(), 'barcode') ? 'barcode' : 'SKU';
                $results[] = ['index' => $i, 'success' => false, 'error' => "That $field is already in use."];
            }
        }

        return $this->ok([
            'results' => $results,
            'created' => $created,
            'failed' => count($rows) - $created,
        ]);
    }

    /**
     * GET /api/v1/products/{id}/prices
     * One row per store in the caller's company, whether or not that
     * store has actually priced this product yet (cost_price/selling_price
     * come back null when it hasn't).
     */
    public function prices($id = null)
    {
        if ($this->applyScope()->find($id) === null) {
            return $this->notFound();
        }

        $auth = Services::authContext();
        $stores = model(StoreModel::class)->where('company_id', $auth->companyId)->orderBy('name', 'ASC')->findAll();
        $priced = model(StoreProductPriceModel::class)->where('product_id', $id)->findAll();
        $byStore = [];
        foreach ($priced as $row) {
            $byStore[(int) $row->store_id] = $row;
        }

        $rows = array_map(static function ($store) use ($byStore) {
            $row = $byStore[(int) $store->id] ?? null;

            return (object) [
                'store_id' => (int) $store->id,
                'store_name' => $store->name,
                'cost_price' => $row->cost_price ?? null,
                'selling_price' => $row->selling_price ?? null,
            ];
        }, $stores);

        return $this->ok($rows);
    }

    /**
     * PUT /api/v1/products/{id}/prices  body: { prices: [{ store_id, cost_price, selling_price }, ...] }
     * Upserts one row per store in the payload — a store not included is
     * left untouched (this isn't a full replace of every store's price).
     */
    public function updatePrices($id = null)
    {
        $product = $this->applyScope()->find($id);
        if ($product === null) {
            return $this->notFound();
        }

        $payload = $this->request->getJSON(true) ?? [];
        $entries = $payload['prices'] ?? null;
        if (! is_array($entries) || $entries === []) {
            return $this->apiFail('prices must be a non-empty array', 422);
        }

        $auth = Services::authContext();
        $companyStoreIds = model(StoreModel::class)->where('company_id', $auth->companyId)->findColumn('id') ?: [];
        $companyStoreIds = array_map('intval', $companyStoreIds);

        foreach ($entries as $i => $entry) {
            $rules = [
                'store_id' => ['label' => 'Store', 'rules' => 'required|is_natural_no_zero'],
                'cost_price' => ['label' => 'Cost price', 'rules' => 'required|decimal|greater_than_equal_to[0]'],
                'selling_price' => ['label' => 'Selling price', 'rules' => 'required|decimal|greater_than_equal_to[0]'],
            ];
            if (! $this->validateData(is_array($entry) ? $entry : [], $rules)) {
                return $this->validationFail(["prices.$i" => $this->validator->getErrors()]);
            }
            if (! in_array((int) $entry['store_id'], $companyStoreIds, true)) {
                return $this->apiFail("Unknown store_id at prices.$i", 422);
            }
        }

        $model = model(StoreProductPriceModel::class);
        foreach ($entries as $entry) {
            $model->upsertPrice((int) $id, (int) $entry['store_id'], (float) $entry['cost_price'], (float) $entry['selling_price']);
        }

        Services::auditLogger()->log('update', 'Product Price', (int) $id, $product->name, [
            'prices' => ['old' => null, 'new' => $entries],
        ]);

        return $this->prices($id);
    }

    /**
     * PUT /api/v1/products/prices/bulk
     * body: { store_ids: [...], prices: [{ product_id | sku, cost_price, selling_price }, ...] }
     * The bulk counterpart to updatePrices() — that one updates ONE product
     * across many stores, this updates MANY products against one or more
     * stores at once (store_ids has one entry for a single store, or every
     * company store's id to reprice everywhere in one go).
     * Each row identifies its product by EITHER product_id (the manual
     * pricing grid, which already has it from the loaded list) OR sku (a
     * CSV price import, which only ever has the SKU column a spreadsheet
     * export would have — resolved here in one query rather than making
     * the caller look product ids up first).
     * Best-effort like bulkCreate(): each PRODUCT row succeeds or fails on
     * its own — store_ids itself is trusted (it's the caller's own store
     * list, never user-typed), so an invalid entry in it fails the whole
     * request up front rather than partially applying.
     */
    public function bulkUpdatePrices()
    {
        $payload = $this->request->getJSON(true) ?? [];
        $storeIds = $payload['store_ids'] ?? null;
        $entries = $payload['prices'] ?? null;

        if (! is_array($storeIds) || $storeIds === []) {
            return $this->apiFail('store_ids must be a non-empty array', 422);
        }
        if (! is_array($entries) || $entries === []) {
            return $this->apiFail('prices must be a non-empty array', 422);
        }
        if (count($entries) > 500) {
            return $this->apiFail('Cannot update more than 500 prices at once', 422);
        }

        $auth = Services::authContext();
        $companyStoreIds = model(StoreModel::class)->where('company_id', $auth->companyId)->findColumn('id') ?: [];
        $companyStoreIds = array_flip(array_map('intval', $companyStoreIds));
        $storeIds = array_map('intval', $storeIds);
        foreach ($storeIds as $storeId) {
            if (! isset($companyStoreIds[$storeId])) {
                return $this->apiFail('Unknown store_id', 422);
            }
        }

        $productModel = model(ProductModel::class);
        $companyProductIds = $productModel->where('company_id', $auth->companyId)->findColumn('id') ?: [];
        $companyProductIds = array_flip(array_map('intval', $companyProductIds));

        // One lookup query for every SKU referenced anywhere in the
        // payload, rather than a query per row — a CSV import can easily
        // carry hundreds of rows.
        $skus = [];
        foreach ($entries as $entry) {
            if (is_array($entry) && ! empty($entry['sku'])) {
                $skus[] = trim((string) $entry['sku']);
            }
        }
        $skuToProductId = [];
        if ($skus !== []) {
            foreach ($productModel->where('company_id', $auth->companyId)->whereIn('sku', array_unique($skus))->findAll() as $product) {
                $skuToProductId[$product->sku] = (int) $product->id;
            }
        }

        $model = model(StoreProductPriceModel::class);
        $results = [];
        $updated = 0;

        foreach (array_values($entries) as $i => $entry) {
            if (! is_array($entry)) {
                $results[] = ['index' => $i, 'success' => false, 'error' => 'Row must be an object'];
                continue;
            }

            $rules = [
                'product_id' => ['label' => 'Product', 'rules' => 'permit_empty|is_natural_no_zero'],
                'sku' => ['label' => 'SKU', 'rules' => 'permit_empty|max_length[60]'],
                'cost_price' => ['label' => 'Cost price', 'rules' => 'required|decimal|greater_than_equal_to[0]'],
                'selling_price' => ['label' => 'Selling price', 'rules' => 'required|decimal|greater_than_equal_to[0]'],
            ];
            if (! $this->validateData($entry, $rules)) {
                $results[] = ['index' => $i, 'success' => false, 'error' => implode(' ', array_map(static fn ($e) => (string) $e, $this->validator->getErrors()))];
                continue;
            }

            if (! empty($entry['product_id'])) {
                $productId = (int) $entry['product_id'];
                if (! isset($companyProductIds[$productId])) {
                    $results[] = ['index' => $i, 'success' => false, 'error' => 'Unknown product_id'];
                    continue;
                }
            } elseif (! empty($entry['sku'])) {
                $sku = trim((string) $entry['sku']);
                if (! isset($skuToProductId[$sku])) {
                    $results[] = ['index' => $i, 'success' => false, 'error' => "Unknown SKU: {$sku}"];
                    continue;
                }
                $productId = $skuToProductId[$sku];
            } else {
                $results[] = ['index' => $i, 'success' => false, 'error' => 'product_id or sku is required'];
                continue;
            }

            foreach ($storeIds as $storeId) {
                $model->upsertPrice($productId, $storeId, (float) $entry['cost_price'], (float) $entry['selling_price']);
            }

            Services::auditLogger()->log('update', 'Product Price', $productId, $entry['sku'] ?? null, [
                'store_ids' => ['old' => null, 'new' => $storeIds],
                'cost_price' => ['old' => null, 'new' => $entry['cost_price']],
                'selling_price' => ['old' => null, 'new' => $entry['selling_price']],
            ]);

            $results[] = ['index' => $i, 'success' => true];
            $updated++;
        }

        return $this->ok([
            'results' => $results,
            'updated' => $updated,
            'failed' => count($entries) - $updated,
        ]);
    }

    /**
     * POST /api/v1/products/{id}/image  multipart field "image"
     * Written straight into public/uploads/products/ (not writable/) so
     * the frontend can show it with a plain <img src> — no Authorization
     * header a browser would attach for the rest of the API. The old file
     * is only deleted once the new one is safely on disk and the row is
     * updated, so a failed upload never leaves the product pointing at a
     * missing file.
     */
    public function uploadImage($id = null)
    {
        $product = $this->applyScope()->find($id);
        if ($product === null) {
            return $this->notFound();
        }

        $file = $this->request->getFile('image');
        if ($file === null || ! $file->isValid()) {
            return $this->apiFail('A valid image file is required', 422);
        }

        // getMimeType() sniffs the actual file content (via fileinfo), unlike
        // getClientMimeType()/getClientExtension() which just echo back
        // whatever the request claimed — trivially spoofable.
        $allowed = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
        $mime = $file->getMimeType();
        if (! isset($allowed[$mime])) {
            return $this->apiFail('Image must be JPEG, PNG, or WEBP', 422);
        }

        if ($file->getSize() > 2 * 1024 * 1024) {
            return $this->apiFail('Image must be 2MB or smaller', 422);
        }

        $dir = FCPATH . 'uploads/products/';
        if (! is_dir($dir)) {
            mkdir($dir, 0755, true);
        }

        $newName = $id . '_' . bin2hex(random_bytes(8)) . '.' . $allowed[$mime];
        $file->move($dir, $newName);
        $relativePath = 'uploads/products/' . $newName;

        $oldPath = $product->image_path;
        $this->model->update($id, ['image_path' => $relativePath]);

        if ($oldPath) {
            $oldFull = FCPATH . $oldPath;
            if (is_file($oldFull)) {
                unlink($oldFull);
            }
        }

        return $this->ok($this->model->find($id), 'Image uploaded');
    }

    /** DELETE /api/v1/products/{id}/image */
    public function deleteImage($id = null)
    {
        $product = $this->applyScope()->find($id);
        if ($product === null) {
            return $this->notFound();
        }

        if ($product->image_path) {
            $full = FCPATH . $product->image_path;
            if (is_file($full)) {
                unlink($full);
            }
            $this->model->update($id, ['image_path' => null]);
        }

        return $this->ok($this->model->find($id), 'Image removed');
    }
}
