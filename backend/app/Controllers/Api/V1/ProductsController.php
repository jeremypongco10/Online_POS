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
    protected array $allowedSorts = ['id', 'name', 'sku', 'minimum_stock', 'created_at'];
    protected array $searchableFields = ['name', 'sku', 'barcode', 'description'];
    protected string $defaultSort = 'name';

    /**
     * A ?store_id= on the list endpoint resolves each product's price at
     * that store (left-joined, so an unpriced product still appears but
     * with null cost_price/selling_price) — this is what the POS product
     * search relies on. listResource() can't express a join, so this path
     * bypasses it entirely rather than bolting a join onto the generic
     * helper.
     */
    public function index()
    {
        $storeId = $this->request->getGet('store_id');
        if ($storeId === null || $storeId === '') {
            return parent::index();
        }

        return $this->indexWithStorePrice((int) $storeId);
    }

    private function indexWithStorePrice(int $storeId)
    {
        $auth = Services::authContext();
        $store = model(StoreModel::class)->where('company_id', $auth->companyId)->find($storeId);
        if (! $store) {
            return $this->apiFail('Unknown store_id', 422);
        }

        $builder = model(ProductModel::class)->builder();
        $builder->select('products.*, spp.cost_price, spp.selling_price')
            ->where('products.company_id', $auth->companyId)
            ->join('store_product_prices spp', "spp.product_id = products.id AND spp.store_id = {$storeId}", 'left');

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

                $results[] = ['index' => $i, 'success' => true, 'data' => $rowModel->find($id)];
                $created++;
            } catch (DatabaseException $e) {
                if (! str_contains($e->getMessage(), 'Duplicate entry')) {
                    throw $e;
                }
                $results[] = ['index' => $i, 'success' => false, 'error' => 'That SKU is already in use.'];
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
        if ($this->applyScope()->find($id) === null) {
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
                'store_id' => 'required|is_natural_no_zero',
                'cost_price' => 'required|decimal|greater_than_equal_to[0]',
                'selling_price' => 'required|decimal|greater_than_equal_to[0]',
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

        return $this->prices($id);
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
