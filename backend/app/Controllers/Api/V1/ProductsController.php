<?php

namespace App\Controllers\Api\V1;

use App\Controllers\Api\BaseCrudController;
use App\Libraries\TaxService;
use App\Models\CategoryModel;
use App\Models\ProductDiscountEligibilityModel;
use App\Models\ProductModel;
use App\Models\StoreModel;
use App\Models\StoreProductFavoriteModel;
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

    /** Max rows an export (`all=1`) may pull in one request. */
    private const CATALOG_EXPORT_LIMIT = 10000;

    /**
     * The branch a catalog view prices and counts against: the requested
     * one if the caller may see it, else their first. Price and stock only
     * exist per branch, so the catalog always shows one branch's figures.
     */
    private function catalogStoreId(): ?int
    {
        $auth = Services::authContext();
        $query = model(StoreModel::class)->where('company_id', $auth->companyId);
        if ($auth->allowedStoreIds !== null) {
            $query->whereIn('id', $auth->allowedStoreIds ?: [0]);
        }
        $allowed = array_map('intval', $query->orderBy('name')->findColumn('id') ?: []);

        $requested = (int) ($this->request->getGet('store_id') ?? 0);
        if ($requested === 0) {
            return $allowed[0] ?? null;
        }

        return in_array($requested, $allowed, true) ? $requested : null;
    }

    private function catalogQuery(int $storeId, string $select)
    {
        return \Config\Database::connect()->table('products p')
            ->select($select, false)
            ->join('categories c', 'c.id = p.category_id', 'left')
            ->join('units un', 'un.id = p.unit_id', 'left')
            ->join('tax_rates tr', 'tr.id = p.tax_rate_id', 'left')
            ->join('store_product_prices spp', "spp.product_id = p.id AND spp.store_id = {$storeId}", 'left')
            ->join('inventory inv', "inv.product_id = p.id AND inv.store_id = {$storeId}", 'left')
            ->where('p.company_id', Services::authContext()->companyId);
    }

    private function applyCatalogFilters($builder): void
    {
        $q = trim((string) $this->request->getGet('q'));
        if ($q !== '') {
            $builder->groupStart()
                ->like('p.name', $q)->orLike('p.sku', $q)->orLike('p.barcode', $q)->orLike('p.description', $q)->orLike('c.name', $q)
                ->groupEnd();
        }

        $category = (string) $this->request->getGet('category_id');
        if ($category === 'none') {
            $builder->where('p.category_id', null);
        } elseif ((int) $category > 0) {
            $builder->where('p.category_id', (int) $category);
        }

        foreach (['is_active', 'track_inventory'] as $flag) {
            $value = $this->request->getGet($flag);
            if ($value === '0' || $value === '1') {
                $builder->where("p.{$flag}", (int) $value);
            }
        }

        switch ((string) $this->request->getGet('issue')) {
            case 'no_price':
                $builder->where('p.is_active', 1)->where('spp.selling_price', null);
                break;
            case 'no_photo':
                $builder->groupStart()->where('p.image_path', null)->orWhere('p.image_path', '')->groupEnd();
                break;
            case 'no_category':
                $builder->where('p.category_id', null);
                break;
            case 'out_of_stock':
                $builder->where('p.is_active', 1)->where('p.track_inventory', 1)->where('COALESCE(inv.quantity, 0) <= 0', null, false);
                break;
        }
    }

    /**
     * GET /api/v1/products/catalog?store_id=&q=&category_id=&is_active=&issue=&sort=
     * The Back Office catalog: every product with its category, unit and
     * tax names, plus its cost, price and stock at one branch. Separate
     * from index() on purpose — the POS reads index(), and this one is
     * free to grow for the admin without risking the till. `all=1` returns
     * every match (for Excel/CSV/PDF export).
     */
    public function catalog()
    {
        $storeId = $this->catalogStoreId();
        if ($storeId === null) {
            return $this->apiFail('Unknown store_id', 422);
        }

        $builder = $this->catalogQuery($storeId, 'p.id, p.sku, p.barcode, p.name, p.description, p.image_path, p.category_id, '
            . 'c.name AS category_name, p.unit_id, un.abbreviation AS unit, p.tax_rate_id, tr.name AS tax_name, tr.rate AS tax_rate, '
            . 'p.minimum_stock, p.is_active, p.track_inventory, p.created_at, p.updated_at, '
            . 'spp.cost_price, spp.selling_price, inv.quantity AS stock_quantity, inv.reorder_level');
        $this->applyCatalogFilters($builder);

        if ($this->request->getGet('all') === '1') {
            [$perPage, $page] = [self::CATALOG_EXPORT_LIMIT, 1];
        } else {
            $perPage = max(1, min((int) ($this->request->getGet('per_page') ?? 15), 100));
            $page = max(1, (int) ($this->request->getGet('page') ?? 1));
        }
        $total = $builder->countAllResults(false);

        $sortParam = (string) $this->request->getGet('sort');
        $direction = str_starts_with($sortParam, '-') ? 'DESC' : 'ASC';
        $sortExpr = match (ltrim($sortParam, '-')) {
            'sku' => 'p.sku',
            'category' => 'c.name',
            'price' => 'spp.selling_price',
            'cost' => 'spp.cost_price',
            'margin' => '(spp.selling_price - spp.cost_price) / NULLIF(spp.selling_price, 0)',
            'stock' => 'COALESCE(inv.quantity, 0)',
            'created_at' => 'p.created_at',
            default => 'p.name',
        };
        $builder->orderBy($sortExpr . ' IS NULL', 'ASC', false)->orderBy($sortExpr, $direction, false)->orderBy('p.name', 'ASC');

        $rows = $builder->get($perPage, ($page - 1) * $perPage)->getResult();

        return $this->ok($rows, '', [
            'page' => $page,
            'per_page' => $perPage,
            'total' => $total,
            'last_page' => (int) ceil($total / $perPage) ?: 1,
            'store_id' => $storeId,
        ]);
    }

    /** GET /api/v1/products/catalog/summary?store_id= — counts behind the catalog's summary cards. */
    public function catalogSummary()
    {
        $storeId = $this->catalogStoreId();
        if ($storeId === null) {
            return $this->apiFail('Unknown store_id', 422);
        }

        $row = $this->catalogQuery($storeId, 'COUNT(*) AS total, '
            . 'COALESCE(SUM(p.is_active = 1), 0) AS active, '
            . 'COALESCE(SUM(p.is_active = 0), 0) AS inactive, '
            . 'COALESCE(SUM(p.is_active = 1 AND spp.selling_price IS NULL), 0) AS no_price, '
            . "COALESCE(SUM(p.image_path IS NULL OR p.image_path = ''), 0) AS no_photo, "
            . 'COALESCE(SUM(p.category_id IS NULL), 0) AS no_category, '
            . 'COALESCE(SUM(p.is_active = 1 AND p.track_inventory = 1 AND COALESCE(inv.quantity, 0) <= 0), 0) AS out_of_stock')
            ->get()->getRow();

        $store = model(StoreModel::class)->find($storeId);
        $company = model(\App\Models\CompanyModel::class)->find(Services::authContext()->companyId);

        return $this->ok([
            'store_id' => $storeId,
            'store_name' => $store->name ?? null,
            'company_name' => $company->trade_name ?? null,
            'total' => (int) $row->total,
            'active' => (int) $row->active,
            'inactive' => (int) $row->inactive,
            'no_price' => (int) $row->no_price,
            'no_photo' => (int) $row->no_photo,
            'no_category' => (int) $row->no_category,
            'out_of_stock' => (int) $row->out_of_stock,
        ]);
    }

    /**
     * A ?store_id= on the list endpoint resolves each product's price
     * (and on-hand stock_quantity) at that store — both left-joined, so
     * an unpriced or never-stocked product still appears, just with a
     * null value — this is what the POS product search relies on.
     * listResource() can't express a join, so this path bypasses it
     * entirely rather than bolting one onto the generic helper.
     *
     * Every other case (no store_id) goes through indexWithCategory()
     * instead of the inherited listResource() path, for the same reason:
     * the admin list shows each product's category by NAME, and a plain
     * `?q=` search has to be able to match that name too, not just the
     * product's own columns — joining categories is the only way to do
     * either. Company scope is re-applied explicitly there rather than
     * through applyScope(), since categories carries its own company_id
     * and is_active columns; an unqualified `where('company_id', …)`
     * against the joined pair would throw "column is ambiguous" the
     * moment both tables are in the query.
     */
    public function index()
    {
        $storeId = $this->request->getGet('store_id');
        if ($storeId !== null && $storeId !== '') {
            return $this->indexWithStorePrice((int) $storeId);
        }

        return $this->indexWithCategory();
    }

    private function indexWithCategory()
    {
        $auth = Services::authContext();

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
            // categories.name last — it's the one field here that isn't a
            // product column, called out by name rather than folded into
            // a loop over $this->searchableFields so that distinction
            // stays visible at the call site.
            $fields = [...array_map(static fn ($f) => "products.$f", $this->searchableFields), 'categories.name'];
            foreach ($fields as $i => $field) {
                $method = $i === 0 ? 'like' : 'orLike';
                $builder->{$method}($field, $search);
            }
            $builder->groupEnd();
        }

        // "category" isn't a real column on products — the list shows the
        // category's NAME, so sorting by it has to order by the joined
        // name instead, or the visible order wouldn't look sorted at all.
        // Every other sort key is an ordinary column on this table.
        $sortParam = (string) $this->request->getGet('sort');
        $sortColumn = ltrim($this->defaultSort, '-');
        $sortDirection = str_starts_with($this->defaultSort, '-') ? 'DESC' : 'ASC';
        if ($sortParam !== '') {
            $direction = str_starts_with($sortParam, '-') ? 'DESC' : 'ASC';
            $column = ltrim($sortParam, '-');
            if ($column === 'category' || in_array($column, $this->allowedSorts, true)) {
                $sortColumn = $column;
                $sortDirection = $direction;
            }
        }

        $perPage = max(1, min((int) ($this->request->getGet('per_page') ?? 15), 100));
        $page = max(1, (int) ($this->request->getGet('page') ?? 1));
        $total = $builder->countAllResults(false);

        if ($sortColumn === 'category') {
            // NULLs (products with no category) sort last either way —
            // otherwise DESC would put them first, ahead of every real one.
            $builder->orderBy('categories.name IS NULL', 'ASC', false)
                ->orderBy('categories.name', $sortDirection)
                ->orderBy('products.name', 'ASC');
        } else {
            $builder->orderBy("products.$sortColumn", $sortDirection);
        }

        $rows = $builder->get($perPage, ($page - 1) * $perPage)->getResult();

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

        // The POS's "Favorites" shortcut: only what this store has starred
        // (see setFavorite()). Inner join, like Top Sellers below, so the
        // search box and category filter still narrow within it.
        if (filter_var($this->request->getGet('favorites'), FILTER_VALIDATE_BOOLEAN)) {
            $builder->join('store_product_favorites fav', "fav.product_id = products.id AND fav.store_id = {$storeId}", 'inner');
        }

        $popular = filter_var($this->request->getGet('popular'), FILTER_VALIDATE_BOOLEAN);
        if ($popular) {
            $this->restrictToTopSellers($builder, $storeId);
        }

        $perPage = max(1, min((int) ($this->request->getGet('per_page') ?? 15), 100));
        $page = max(1, (int) ($this->request->getGet('page') ?? 1));
        $total = $builder->countAllResults(false);
        if ($popular) {
            $builder->orderBy('pop.sales_count', 'DESC');
        }
        $rows = $builder->orderBy('products.name', 'ASC')->get($perPage, ($page - 1) * $perPage)->getResult();

        return $this->ok($rows, '', [
            'page' => $page,
            'per_page' => $perPage,
            'total' => $total,
            'last_page' => (int) ceil($total / $perPage) ?: 1,
        ]);
    }

    /** How many products the POS's "Top Sellers" shortcut shows, and how far back it looks. */
    private const TOP_SELLERS_LIMIT = 40;
    private const TOP_SELLERS_WINDOW_DAYS = 30;

    /**
     * Narrows a store-priced product list to what this store actually sells
     * most, best first — the POS's "Top Sellers" shortcut.
     *
     * Ranked by the number of separate sales that included the product, not
     * by units: a till sells things by the piece and by the kilo, and summing
     * quantity across both would rank 0.25 kg of rice below 3 sweets. "How
     * many customers bought it" has no unit to skew it.
     *
     * Scoped to THIS store (a branch's best sellers are its own), to the
     * last 30 days (so the shortcut follows what's selling now rather than
     * what sold well a year ago), and to completed, non-training sales
     * only — a voided or held sale never happened, and a training sale is
     * excluded from every figure this system reports (see AddBirAccreditationFields).
     *
     * Joined as a derived table with the cut-off applied inside it, so the
     * search box and category filter still narrow within the top sellers
     * rather than the other way round.
     */
    private function restrictToTopSellers($builder, int $storeId): void
    {
        $companyId = Services::authContext()->companyId;
        $since = date('Y-m-d H:i:s', strtotime('-' . self::TOP_SELLERS_WINDOW_DAYS . ' days'));

        $ranked = \Config\Database::connect()->table('sale_items si')
            ->select('si.product_id, COUNT(DISTINCT si.sale_id) AS sales_count', false)
            ->join('sales s', 's.id = si.sale_id')
            ->where('s.company_id', $companyId)
            ->where('s.store_id', $storeId)
            ->where('s.status', 'completed')
            ->where('s.is_training', 0)
            ->where('s.sale_date >=', $since)
            ->groupBy('si.product_id')
            ->orderBy('sales_count', 'DESC')
            // A stable cut at the limit: without a tie-break, two products
            // sold equally often at the boundary could swap in and out
            // between refreshes.
            ->orderBy('si.product_id', 'ASC')
            ->limit(self::TOP_SELLERS_LIMIT)
            ->getCompiledSelect();

        $builder->select('pop.sales_count')->join("({$ranked}) pop", 'pop.product_id = products.id', 'inner', false);
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
     *
     * `is_favorite` rides along so the dialog that edits these rows can show
     * each store's star without a second request — it's a separate fact from
     * the price (see setFavorite()), just per-store like it.
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
        $favoriteStoreIds = model(StoreProductFavoriteModel::class)->storeIdsFor((int) $id);

        $rows = array_map(static function ($store) use ($byStore, $favoriteStoreIds) {
            $row = $byStore[(int) $store->id] ?? null;

            return (object) [
                'store_id' => (int) $store->id,
                'store_name' => $store->name,
                'cost_price' => $row->cost_price ?? null,
                'selling_price' => $row->selling_price ?? null,
                'is_favorite' => in_array((int) $store->id, $favoriteStoreIds, true),
            ];
        }, $stores);

        return $this->ok($rows);
    }

    /**
     * PUT /api/v1/products/{id}/favorite  body: { store_id, is_favorite }
     *
     * Stars or un-stars a product for ONE store — the shared list behind the
     * POS's Favorites pill. Applied immediately per tap, unlike the price
     * fields beside it (which wait for Save): a star has no half-typed state
     * to commit.
     *
     * Company stores only, and for a user pinned to particular stores only
     * those — a manager of one branch shouldn't be reshuffling another's
     * front-of-shelf picks. Idempotent (see StoreProductFavoriteModel).
     */
    public function setFavorite($id = null)
    {
        $product = $this->applyScope()->find($id);
        if ($product === null) {
            return $this->notFound();
        }

        $payload = $this->request->getJSON(true) ?? [];
        if (! $this->validateData($payload, [
            'store_id' => ['label' => 'Store', 'rules' => 'required|is_natural_no_zero'],
            // 0/1, like every other flag in this API. Not `false`: CI4's
            // `required` reads a JSON false as an empty string and rejects it.
            'is_favorite' => ['label' => 'Favorite', 'rules' => 'required|in_list[0,1]'],
        ])) {
            return $this->validationFail($this->validator->getErrors());
        }

        $auth = Services::authContext();
        $storeId = (int) $payload['store_id'];
        if (! model(StoreModel::class)->where('company_id', $auth->companyId)->find($storeId)) {
            return $this->apiFail('Unknown store_id', 422);
        }
        if ($auth->allowedStoreIds !== null && ! in_array($storeId, array_map('intval', $auth->allowedStoreIds), true)) {
            return $this->forbidden("You aren't assigned to that store.");
        }

        $favorite = filter_var($payload['is_favorite'], FILTER_VALIDATE_BOOLEAN);
        model(StoreProductFavoriteModel::class)->setFavorite($storeId, (int) $id, $favorite);

        Services::auditLogger()->log('update', 'Product Favorite', (int) $id, $product->name, [
            'store_id' => ['old' => null, 'new' => $storeId],
            'is_favorite' => ['old' => ! $favorite, 'new' => $favorite],
        ]);

        return $this->ok(['store_id' => $storeId, 'is_favorite' => $favorite], $favorite ? 'Added to favorites' : 'Removed from favorites');
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

    /**
     * GET /api/v1/products/{id}/discount-eligibility
     *
     * Fully resolved eligibility for every discount type on ONE product
     * — product override, then its category's, then NOT eligible by
     * default (see TaxService::isProductEligibleForDiscount). This is what the
     * POS's Discount dialog calls before it lets a cashier pick a type
     * for a given cart line, so a type this returns false for should
     * never even be selectable there. Gated on products.view (not
     * products.update) — every POS role that can ring up this product
     * at all needs to know what it can be discounted with.
     */
    public function discountEligibility($id = null)
    {
        $product = $this->applyScope()->find($id);
        if ($product === null) {
            return $this->notFound();
        }

        $taxService = Services::taxService();
        $eligibility = [];
        foreach (TaxService::DISCOUNT_TYPES as $type) {
            $eligibility[$type] = $taxService->isProductEligibleForDiscount($type, $product);
        }

        return $this->ok($eligibility);
    }

    /**
     * GET /api/v1/products/discount-eligibility?product_ids=1,2,3
     *
     * The same resolution as the single-product endpoint above, for a
     * whole basket at once — keyed by product id. This is what the POS
     * calls when the cashier picks ONE discount for the sale: the answer
     * needed is "which of these lines qualify", and asking that one
     * product at a time would be a request per line, on the counter,
     * with the customer waiting.
     *
     * Ids the caller can't see (another company's, or simply absent)
     * are omitted from the response rather than reported — the POS
     * treats a missing entry as not eligible, same as any other
     * unconfigured product, and checkout re-checks every line
     * server-side regardless (SalesController::resolveLineDiscount), so
     * a gap here can never incorrectly grant a discount either way.
     */
    public function bulkDiscountEligibility()
    {
        $requested = (string) ($this->request->getGet('product_ids') ?? '');
        $ids = array_values(array_unique(array_filter(array_map('intval', explode(',', $requested)))));

        if ($ids === []) {
            return $this->ok([]);
        }

        // Capped for the same reason the cart itself is finite: this is a
        // basket, not a catalog export.
        $products = $this->applyScope()->whereIn('id', array_slice($ids, 0, 200))->findAll();

        $taxService = Services::taxService();
        $byProduct = [];
        foreach ($products as $product) {
            $eligibility = [];
            foreach (TaxService::DISCOUNT_TYPES as $type) {
                $eligibility[$type] = $taxService->isProductEligibleForDiscount($type, $product);
            }
            $byProduct[(string) $product->id] = $eligibility;
        }

        return $this->ok($byProduct);
    }

    /**
     * PUT /api/v1/products/{id}/discount-eligibility
     * body: { rules: { [discount_type]: boolean, ... } }
     *
     * Sets this ONE product's overrides — the most specific rule
     * TaxService::isProductEligibleForDiscount() checks, ahead of its
     * category's. Intentionally sparse: a requested value that already
     * matches what the category layer alone would resolve to DELETES
     * that type's row instead of storing a redundant one, so this
     * table only ever holds real exceptions — most often "turn this on
     * for this one product" now that the category (and the ultimate
     * fallback) both default to not eligible, but still "turn this off
     * for this one product" whenever the category itself was turned
     * on. A type simply absent from `rules` is left as-is, so a
     * partial update (e.g. one row from the product edit form) never
     * clobbers a rule set some other way.
     */
    public function updateDiscountEligibility($id = null)
    {
        $product = $this->applyScope()->find($id);
        if ($product === null) {
            return $this->notFound();
        }

        $payload = $this->request->getJSON(true) ?? [];
        $rules = $payload['rules'] ?? null;
        if (! is_array($rules)) {
            return $this->apiFail('rules must be an object of discount_type => boolean', 422);
        }

        $taxService = Services::taxService();
        $model = model(ProductDiscountEligibilityModel::class);

        foreach ($rules as $type => $eligible) {
            // Object keys from getJSON() are always strings, but
            // isKnownDiscountType() also accepts null (see its own
            // docblock) — cast explicitly so a bogus key can't slip
            // through as "no restriction" instead of failing loudly.
            if (! is_string($type) || ! $taxService->isKnownDiscountType($type)) {
                return $this->apiFail("Unknown discount_type: {$type}", 422);
            }

            $existing = $model->where('product_id', $id)->where('discount_type', $type)->first();

            // A product row can be safely deleted (falling back to the
            // category/default resolution) ONLY when that fallback would
            // itself resolve to the same value being requested — e.g.
            // setting "eligible: true" when the category has restricted
            // this type is a real override and needs its own row, or the
            // override vanishes the moment the row does. See
            // TaxService::isCategoryEligibleForDiscount's docblock.
            $categoryDefault = $taxService->isCategoryEligibleForDiscount($type, $product->category_id ?? null);

            if ((bool) $eligible === $categoryDefault) {
                if ($existing !== null) {
                    $model->delete($existing->id);
                }
                continue;
            }

            if ($existing !== null) {
                $model->update($existing->id, ['eligible' => $eligible ? 1 : 0]);
            } else {
                $model->insert(['product_id' => $id, 'discount_type' => $type, 'eligible' => $eligible ? 1 : 0]);
            }
        }

        $eligibility = [];
        foreach (TaxService::DISCOUNT_TYPES as $type) {
            $eligibility[$type] = $taxService->isProductEligibleForDiscount($type, $product);
        }

        return $this->ok($eligibility, 'Discount eligibility updated');
    }
}
