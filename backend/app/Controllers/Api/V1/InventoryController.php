<?php

namespace App\Controllers\Api\V1;

use App\Controllers\BaseApiController;
use App\Models\CompanyModel;
use App\Models\InventoryModel;
use App\Models\InventoryTransactionModel;
use App\Models\ProductModel;
use App\Models\StoreModel;
use App\Models\UnitModel;
use Config\Database;
use Config\Services;

class InventoryController extends BaseApiController
{
    /**
     * Store IDs belonging to the caller's own company, narrowed further
     * to their assigned stores if they're store-restricted. Inventory
     * has no company_id column of its own, so every method here scopes
     * through store_id instead.
     */
    private function allowedStoreIds(): array
    {
        $auth = Services::authContext();
        // findColumn() returns the raw driver values (strings, for MySQLi)
        // — cast to int so the in_array(..., true) strict checks below
        // actually match against the (int) payload store IDs.
        $storeIds = array_map('intval', model(StoreModel::class)->where('company_id', $auth->companyId)->findColumn('id') ?: []);

        if ($auth->allowedStoreIds !== null) {
            $storeIds = array_values(array_intersect($storeIds, $auth->allowedStoreIds));
        }

        return $storeIds;
    }

    /** GET /api/v1/inventory */
    public function index()
    {
        $result = $this->listResource(
            model(InventoryModel::class)->whereIn('store_id', $this->allowedStoreIds() ?: [0]),
            ['product_id', 'store_id'],
            ['id', 'quantity', 'reorder_level', 'updated_at'],
            [],
            'id'
        );

        return $this->ok($result['data'], '', $result['meta']);
    }

    /** GET /api/v1/inventory/{id} */
    public function show($id = null)
    {
        $row = model(InventoryModel::class)->whereIn('store_id', $this->allowedStoreIds() ?: [0])->find($id);

        if (! $row) {
            return $this->notFound();
        }

        return $this->ok($row);
    }

    /**
     * GET /api/v1/inventory/by-product/{productId}
     * Stock for one product across every store — the store-specific
     * view: Coke: Angeles -> 100, Manila -> 50, Tarlac -> 80.
     */
    public function byProduct($productId = null)
    {
        $auth = Services::authContext();
        if (! model(ProductModel::class)->where('company_id', $auth->companyId)->find($productId)) {
            return $this->notFound('Unknown product');
        }

        $allowed = $this->allowedStoreIds();
        $rows = array_values(array_filter(
            model(InventoryModel::class)->forProductAcrossStores((int) $productId),
            static fn ($row) => in_array((int) $row->store_id, $allowed, true)
        ));

        return $this->ok($rows);
    }

    /** Max rows a print/export request (`all=1`) may pull in one go. */
    private const EXPORT_LIMIT = 5000;

    private const QTY = 'COALESCE(i.quantity, 0)';
    private const REORDER = 'COALESCE(i.reorder_level, p.minimum_stock, 0)';

    /**
     * The branch a stock view is for: the requested one if the caller may
     * see it, else their first branch. Stock is always per branch — "how
     * many do we have" only means something for a specific shelf.
     */
    private function resolveStoreId(): ?int
    {
        $allowed = $this->allowedStoreIds();
        $requested = (int) ($this->request->getGet('store_id') ?? 0);
        if ($requested === 0) {
            return $allowed[0] ?? null;
        }

        return in_array($requested, $allowed, true) ? $requested : null;
    }

    /**
     * Every active, stock-tracked product, with its stock at one branch.
     * Built from products rather than the inventory table so a product
     * that has never had stock at this branch still shows, at zero —
     * otherwise "what are we out of?" silently leaves those out.
     */
    private function stockQuery(int $storeId, string $select)
    {
        return Database::connect()->table('products p')
            ->select($select, false)
            ->join('inventory i', "i.product_id = p.id AND i.store_id = {$storeId}", 'left')
            ->join('categories c', 'c.id = p.category_id', 'left')
            ->join('units un', 'un.id = p.unit_id', 'left')
            ->join('store_product_prices spp', "spp.product_id = p.id AND spp.store_id = {$storeId}", 'left')
            ->where('p.company_id', Services::authContext()->companyId)
            ->where('p.is_active', 1)
            ->where('p.track_inventory', 1);
    }

    private function applyStockFilters($builder): void
    {
        $q = trim((string) $this->request->getGet('q'));
        if ($q !== '') {
            $builder->groupStart()->like('p.name', $q)->orLike('p.sku', $q)->orLike('p.barcode', $q)->groupEnd();
        }

        $categoryId = (int) ($this->request->getGet('category_id') ?? 0);
        if ($categoryId > 0) {
            $builder->where('p.category_id', $categoryId);
        }

        switch ((string) $this->request->getGet('status')) {
            case 'out':
                $builder->where(self::QTY . ' <= 0', null, false);
                break;
            case 'low':
                $builder->where(self::QTY . ' > 0 AND ' . self::QTY . ' <= ' . self::REORDER, null, false);
                break;
            case 'in_stock':
                $builder->where(self::QTY . ' > ' . self::REORDER, null, false);
                break;
        }
    }

    /** [$perPage, $page] — `all=1` lifts the page cap for print/export. */
    private function paging(): array
    {
        if ($this->request->getGet('all') === '1') {
            return [self::EXPORT_LIMIT, 1];
        }

        return [
            max(1, min((int) ($this->request->getGet('per_page') ?? 15), 100)),
            max(1, (int) ($this->request->getGet('page') ?? 1)),
        ];
    }

    /**
     * GET /api/v1/inventory/stock?store_id=&q=&category_id=&status=in_stock|low|out&sort=
     * One row per tracked product at the branch: on hand, reorder level,
     * cost and selling price there, and the category/unit to label it.
     */
    public function stock()
    {
        $storeId = $this->resolveStoreId();
        if ($storeId === null) {
            return $this->apiFail('Unknown store_id', 422);
        }

        $builder = $this->stockQuery($storeId, 'p.id AS product_id, p.name, p.sku, p.barcode, p.category_id, c.name AS category_name, '
            . 'un.abbreviation AS unit, un.decimal_places, i.id AS inventory_id, ' . self::QTY . ' AS quantity, '
            . self::REORDER . ' AS reorder_level, i.updated_at AS stock_updated_at, spp.cost_price, spp.selling_price');
        $this->applyStockFilters($builder);

        [$perPage, $page] = $this->paging();
        $total = $builder->countAllResults(false);

        $sortParam = (string) $this->request->getGet('sort');
        $direction = str_starts_with($sortParam, '-') ? 'DESC' : 'ASC';
        $sortExpr = match (ltrim($sortParam, '-')) {
            'sku' => 'p.sku',
            'quantity' => self::QTY,
            'value' => self::QTY . ' * COALESCE(spp.cost_price, 0)',
            'category' => 'c.name',
            default => 'p.name',
        };
        $builder->orderBy($sortExpr, $direction, false)->orderBy('p.name', 'ASC');

        $rows = $builder->get($perPage, ($page - 1) * $perPage)->getResult();

        return $this->ok($rows, '', [
            'page' => $page,
            'per_page' => $perPage,
            'total' => $total,
            'last_page' => (int) ceil($total / $perPage) ?: 1,
            'store_id' => $storeId,
        ]);
    }

    /** GET /api/v1/inventory/summary?store_id= — totals for the cards above the stock list. */
    public function summary()
    {
        $storeId = $this->resolveStoreId();
        if ($storeId === null) {
            return $this->apiFail('Unknown store_id', 422);
        }
        $store = model(StoreModel::class)->find($storeId);

        $row = $this->stockQuery($storeId, 'COUNT(*) AS products, '
            . 'COALESCE(SUM(' . self::QTY . '), 0) AS units, '
            . 'COALESCE(SUM(GREATEST(' . self::QTY . ', 0) * COALESCE(spp.cost_price, 0)), 0) AS cost_value, '
            . 'COALESCE(SUM(GREATEST(' . self::QTY . ', 0) * COALESCE(spp.selling_price, 0)), 0) AS retail_value, '
            . 'COALESCE(SUM(CASE WHEN ' . self::QTY . ' <= 0 THEN 1 ELSE 0 END), 0) AS out_count, '
            . 'COALESCE(SUM(CASE WHEN ' . self::QTY . ' > 0 AND ' . self::QTY . ' <= ' . self::REORDER . ' THEN 1 ELSE 0 END), 0) AS low_count, '
            . 'COALESCE(SUM(CASE WHEN ' . self::QTY . ' > ' . self::REORDER . ' THEN 1 ELSE 0 END), 0) AS in_stock_count')
            ->get()->getRow();

        return $this->ok([
            'store_id' => $storeId,
            'products' => (int) $row->products,
            'units' => (string) $row->units,
            'cost_value' => number_format((float) $row->cost_value, 2, '.', ''),
            'retail_value' => number_format((float) $row->retail_value, 2, '.', ''),
            'in_stock_count' => (int) $row->in_stock_count,
            'low_count' => (int) $row->low_count,
            'out_count' => (int) $row->out_count,
            // For the header of a printed stock report or count sheet.
            'company_name' => $this->companyName(),
            'store_name' => $store->name ?? null,
            'store_code' => $store->code ?? null,
            'store_address' => $store->address ?? null,
        ]);
    }

    private function companyName(): ?string
    {
        $company = model(CompanyModel::class)->find(Services::authContext()->companyId);

        return $company->trade_name ?? null;
    }

    /**
     * PUT /api/v1/inventory/reorder-level  body: { product_id, store_id, reorder_level }
     * The "running low" line for one product at one branch. Creates the
     * branch's stock row at zero if it doesn't exist yet.
     */
    public function setReorderLevel()
    {
        $payload = $this->request->getJSON(true) ?? [];
        $rules = [
            'product_id' => ['label' => 'Product', 'rules' => 'required|is_natural_no_zero'],
            'store_id' => ['label' => 'Store', 'rules' => 'required|is_natural_no_zero'],
            'reorder_level' => ['label' => 'Reorder level', 'rules' => 'required|decimal|greater_than_equal_to[0]'],
        ];
        if (! $this->validateData($payload, $rules)) {
            return $this->validationFail($this->validator->getErrors());
        }

        $product = model(ProductModel::class)->where('company_id', Services::authContext()->companyId)->find($payload['product_id']);
        if (! $product) {
            return $this->apiFail('Unknown product_id', 422);
        }
        if (! in_array((int) $payload['store_id'], $this->allowedStoreIds(), true)) {
            return $this->apiFail('Unknown store_id', 422);
        }

        $inventoryModel = model(InventoryModel::class);
        $inventory = $inventoryModel->forProductAtStore((int) $payload['product_id'], (int) $payload['store_id']);
        $level = (float) $payload['reorder_level'];

        if ($inventory) {
            $inventoryModel->update($inventory->id, ['reorder_level' => $level]);
            $id = $inventory->id;
            $old = (float) $inventory->reorder_level;
        } else {
            $id = $inventoryModel->insert([
                'product_id' => $payload['product_id'],
                'store_id' => $payload['store_id'],
                'quantity' => 0,
                'reorder_level' => $level,
            ], true);
            $old = null;
        }

        Services::auditLogger()->log('update', 'Inventory', (int) $id, $product->name, [
            'reorder_level' => ['old' => $old, 'new' => $level],
            'store_id' => ['old' => null, 'new' => (int) $payload['store_id']],
        ]);

        return $this->ok($inventoryModel->find($id), 'Reorder level updated');
    }

    /** Applies the movement-list filters shared by the rows query and its in/out totals. */
    private function applyMovementFilters($builder, array $allowedStores): void
    {
        $builder->whereIn('t.store_id', $allowedStores ?: [0]);

        foreach (['store_id', 'product_id', 'type', 'reference_type', 'reference_id', 'user_id'] as $field) {
            $value = $this->request->getGet($field);
            if ($value !== null && $value !== '') {
                $builder->where("t.{$field}", $value);
            }
        }

        $q = trim((string) $this->request->getGet('q'));
        if ($q !== '') {
            $builder->groupStart()->like('p.name', $q)->orLike('p.sku', $q)->orLike('p.barcode', $q)->orLike('t.notes', $q)->groupEnd();
        }

        foreach (['date_from' => ['>=', ' 00:00:00'], 'date_to' => ['<=', ' 23:59:59']] as $param => [$op, $time]) {
            $date = (string) $this->request->getGet($param);
            if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
                $builder->where("t.created_at {$op}", $date . $time);
            }
        }
    }

    /**
     * GET /api/v1/inventory/movements
     * The append-only audit trail: every PURCHASE/SALE/RETURN/ADJUSTMENT/
     * TRANSFER_IN/TRANSFER_OUT that ever touched stock, filterable and
     * paginated. Read-only — rows are never edited or deleted. Each row
     * carries the product, branch and user names plus a readable label
     * for what caused it (a PO number, an invoice, the other branch), and
     * meta carries the units in/out across every row matching the filters.
     */
    public function movements()
    {
        $db = Database::connect();
        $allowed = $this->allowedStoreIds();

        $builder = $db->table('inventory_transactions t')
            ->select('t.*, p.name AS product_name, p.sku AS product_sku, un.abbreviation AS unit, s.name AS store_name, u.name AS user_name')
            ->join('products p', 'p.id = t.product_id', 'left')
            ->join('units un', 'un.id = p.unit_id', 'left')
            ->join('stores s', 's.id = t.store_id', 'left')
            ->join('users u', 'u.id = t.user_id', 'left');
        $this->applyMovementFilters($builder, $allowed);

        [$perPage, $page] = $this->paging();
        $total = $builder->countAllResults(false);

        $sortParam = (string) $this->request->getGet('sort');
        $direction = $sortParam === '' || str_starts_with($sortParam, '-') ? 'DESC' : 'ASC';
        $column = ltrim($sortParam, '-') === 'quantity' ? 't.quantity' : 't.created_at';
        $rows = $builder->orderBy($column, $direction)->orderBy('t.id', 'DESC')->get($perPage, ($page - 1) * $perPage)->getResult();

        $totals = $db->table('inventory_transactions t')
            ->select('COALESCE(SUM(CASE WHEN t.quantity > 0 THEN t.quantity ELSE 0 END), 0) AS units_in, '
                . 'COALESCE(SUM(CASE WHEN t.quantity < 0 THEN -t.quantity ELSE 0 END), 0) AS units_out', false)
            ->join('products p', 'p.id = t.product_id', 'left');
        $this->applyMovementFilters($totals, $allowed);
        $sums = $totals->get()->getRow();

        return $this->ok($this->withReferenceLabels($rows), '', [
            'page' => $page,
            'per_page' => $perPage,
            'total' => $total,
            'last_page' => (int) ceil($total / $perPage) ?: 1,
            'units_in' => (string) $sums->units_in,
            'units_out' => (string) $sums->units_out,
            'company_name' => $this->companyName(),
        ]);
    }

    /** Adds reference_label: the PO number, sale invoice, return number or other branch behind each movement. */
    private function withReferenceLabels(array $rows): array
    {
        $idsByType = [];
        foreach ($rows as $row) {
            if ($row->reference_type && $row->reference_id) {
                $idsByType[$row->reference_type][] = (int) $row->reference_id;
            }
        }

        $db = Database::connect();
        $lookups = [
            'purchase_order' => ['purchase_orders', 'po_number'],
            'sale' => ['sales', 'invoice_number'],
            'sale_void' => ['sales', 'invoice_number'],
            'return' => ['returns', 'return_number'],
            'transfer' => ['stores', 'name'],
        ];
        $labels = [];
        foreach ($idsByType as $type => $ids) {
            if (! isset($lookups[$type])) {
                continue;
            }
            [$table, $column] = $lookups[$type];
            foreach ($db->table($table)->select("id, {$column} AS label")->whereIn('id', array_values(array_unique($ids)))->get()->getResult() as $ref) {
                $labels[$type][(int) $ref->id] = $ref->label;
            }
        }

        foreach ($rows as $row) {
            $row->reference_label = $row->reference_type && $row->reference_id
                ? ($labels[$row->reference_type][(int) $row->reference_id] ?? null)
                : null;
        }

        return $rows;
    }

    /**
     * POST /api/v1/inventory/adjust
     * body: { product_id, store_id, quantity_delta | counted_quantity, notes? }
     * `counted_quantity` is a physical count: the server works out the
     * difference from what's on record, inside the same transaction, so a
     * sale landing mid-count can't make the correction wrong. Neither form
     * may take stock below zero — the register can't sell what isn't
     * there, so stock on record shouldn't claim otherwise either.
     */
    public function adjust()
    {
        $payload = $this->request->getJSON(true) ?? [];
        $isCount = isset($payload['counted_quantity']) && $payload['counted_quantity'] !== '';

        $rules = [
            'product_id' => ['label' => 'Product', 'rules' => 'required|is_natural_no_zero'],
            'store_id' => ['label' => 'Store', 'rules' => 'required|is_natural_no_zero'],
        ];
        if ($isCount) {
            $rules['counted_quantity'] = ['label' => 'Counted quantity', 'rules' => 'required|decimal|greater_than_equal_to[0]'];
        } else {
            $rules['quantity_delta'] = ['label' => 'Quantity adjustment', 'rules' => 'required|decimal'];
        }

        if (! $this->validateData($payload, $rules)) {
            return $this->validationFail($this->validator->getErrors());
        }

        $product = model(ProductModel::class)->where('company_id', Services::authContext()->companyId)->find($payload['product_id']);
        if (! $product) {
            return $this->apiFail('Unknown product_id', 422);
        }
        if (! in_array((int) $payload['store_id'], $this->allowedStoreIds(), true)) {
            return $this->apiFail('Unknown store_id', 422);
        }

        $inventoryModel = model(InventoryModel::class);
        $db = \Config\Database::connect();
        $db->transStart();

        $inventory = $inventoryModel->forProductAtStore((int) $payload['product_id'], (int) $payload['store_id']);
        $current = (float) ($inventory->quantity ?? 0);
        $delta = $isCount ? (float) $payload['counted_quantity'] - $current : (float) $payload['quantity_delta'];
        if ($product->unit_id !== null) {
            $delta = model(UnitModel::class)->roundToPrecision((int) $product->unit_id, $delta);
        }

        if ($delta == 0.0) {
            $db->transComplete();

            return $this->ok($inventory, $isCount ? 'Count matches the system — nothing to change' : 'No change');
        }
        if (round($current + $delta, 4) < 0) {
            $db->transComplete();
            $available = rtrim(rtrim(number_format($current, 4, '.', ''), '0'), '.');

            return $this->apiFail("Can't remove more than is on hand ({$available}).", 422);
        }

        if (! $inventory) {
            $inventoryId = $inventoryModel->insert([
                'product_id' => $payload['product_id'],
                'store_id' => $payload['store_id'],
                'quantity' => $delta,
                'reorder_level' => $product->minimum_stock ?? 0,
            ], true);
            $newQuantity = $delta;
        } else {
            $inventoryId = $inventory->id;
            $newQuantity = Services::inventoryCalculator()->applyDelta((float) $inventory->quantity, $delta);
            $inventoryModel->update($inventoryId, ['quantity' => $newQuantity]);
        }

        model(InventoryTransactionModel::class)->insert([
            'inventory_id' => $inventoryId,
            'product_id' => $payload['product_id'],
            'store_id' => $payload['store_id'],
            'type' => InventoryTransactionModel::TYPE_ADJUSTMENT,
            'quantity' => $delta,
            'balance_after' => $newQuantity,
            'user_id' => Services::authContext()->userId,
            'notes' => $payload['notes'] ?? null,
        ]);

        $db->transComplete();

        Services::auditLogger()->log('adjust', 'Inventory', $inventoryId, $product->name, [
            'quantity_delta' => ['old' => null, 'new' => $delta],
            'balance_after' => ['old' => null, 'new' => $newQuantity],
            'store_id' => ['old' => null, 'new' => (int) $payload['store_id']],
        ]);

        return $this->ok(model(InventoryModel::class)->find($inventoryId), 'Inventory adjusted');
    }

    /** POST /api/v1/inventory/transfer  body: { product_id, from_store_id, to_store_id, quantity, notes? } */
    public function transfer()
    {
        $payload = $this->request->getJSON(true) ?? [];

        $rules = [
            'product_id' => ['label' => 'Product', 'rules' => 'required|is_natural_no_zero'],
            'from_store_id' => ['label' => 'Source store', 'rules' => 'required|is_natural_no_zero'],
            'to_store_id' => ['label' => 'Destination store', 'rules' => 'required|is_natural_no_zero|differs[from_store_id]'],
            'quantity' => ['label' => 'Quantity', 'rules' => 'required|decimal|greater_than[0]'],
        ];

        if (! $this->validateData($payload, $rules)) {
            return $this->validationFail($this->validator->getErrors());
        }

        $product = model(ProductModel::class)->where('company_id', Services::authContext()->companyId)->find($payload['product_id']);
        if (! $product) {
            return $this->apiFail('Unknown product_id', 422);
        }

        $allowedStores = $this->allowedStoreIds();
        if (! in_array((int) $payload['from_store_id'], $allowedStores, true)) {
            return $this->apiFail('Unknown from_store_id', 422);
        }
        if (! in_array((int) $payload['to_store_id'], $allowedStores, true)) {
            return $this->apiFail('Unknown to_store_id', 422);
        }

        $inventoryModel = model(InventoryModel::class);
        $qty = (float) $payload['quantity'];
        if ($product->unit_id !== null) {
            $qty = model(UnitModel::class)->roundToPrecision((int) $product->unit_id, $qty);
        }

        $source = $inventoryModel->forProductAtStore((int) $payload['product_id'], (int) $payload['from_store_id']);
        $inventoryCalc = Services::inventoryCalculator();

        if (! $source || ! $inventoryCalc->hasSufficientStock((float) $source->quantity, $qty)) {
            $available = $source->quantity ?? 0;
            return $this->apiFail("Insufficient stock at source store: available {$available}, requested {$qty}", 422);
        }

        $db = \Config\Database::connect();
        $db->transStart();

        $sourceBalance = $inventoryCalc->applyDelta((float) $source->quantity, -$qty);
        $inventoryModel->update($source->id, ['quantity' => $sourceBalance]);

        model(InventoryTransactionModel::class)->insert([
            'inventory_id' => $source->id,
            'product_id' => $payload['product_id'],
            'store_id' => $payload['from_store_id'],
            'type' => InventoryTransactionModel::TYPE_TRANSFER_OUT,
            'quantity' => -$qty,
            'balance_after' => $sourceBalance,
            'reference_type' => 'transfer',
            'reference_id' => (int) $payload['to_store_id'],
            'user_id' => Services::authContext()->userId,
            'notes' => $payload['notes'] ?? 'Transfer out',
        ]);

        $destination = $inventoryModel->forProductAtStore((int) $payload['product_id'], (int) $payload['to_store_id']);

        if (! $destination) {
            $destinationId = $inventoryModel->insert([
                'product_id' => $payload['product_id'],
                'store_id' => $payload['to_store_id'],
                'quantity' => $qty,
                'reorder_level' => $product->minimum_stock ?? 0,
            ], true);
            $destinationBalance = $qty;
        } else {
            $destinationId = $destination->id;
            $destinationBalance = $inventoryCalc->applyDelta((float) $destination->quantity, $qty);
            $inventoryModel->update($destinationId, ['quantity' => $destinationBalance]);
        }

        model(InventoryTransactionModel::class)->insert([
            'inventory_id' => $destinationId,
            'product_id' => $payload['product_id'],
            'store_id' => $payload['to_store_id'],
            'type' => InventoryTransactionModel::TYPE_TRANSFER_IN,
            'quantity' => $qty,
            'balance_after' => $destinationBalance,
            'reference_type' => 'transfer',
            'reference_id' => (int) $payload['from_store_id'],
            'user_id' => Services::authContext()->userId,
            'notes' => $payload['notes'] ?? 'Transfer in',
        ]);

        $db->transComplete();

        Services::auditLogger()->log('transfer', 'Inventory', $source->id, $product->name, [
            'quantity' => ['old' => null, 'new' => $qty],
            'from_store_id' => ['old' => null, 'new' => (int) $payload['from_store_id']],
            'to_store_id' => ['old' => null, 'new' => (int) $payload['to_store_id']],
        ]);

        return $this->ok([
            'source' => $inventoryModel->find($source->id),
            'destination' => $inventoryModel->find($destinationId),
        ], 'Stock transferred');
    }
}
