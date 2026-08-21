<?php

namespace App\Controllers\Api\V1;

use App\Controllers\Api\BaseCrudController;
use App\Models\ProductModel;
use App\Models\StoreModel;
use App\Models\StoreProductPriceModel;
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
            $rules = ['store_id' => 'required|is_natural_no_zero', 'cost_price' => 'required|decimal', 'selling_price' => 'required|decimal'];
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
}
