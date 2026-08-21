<?php

namespace App\Controllers\Api\V1;

use App\Controllers\BaseApiController;
use App\Models\InventoryModel;
use App\Models\InventoryTransactionModel;
use App\Models\SaleItemModel;
use App\Models\SaleModel;
use App\Models\StoreModel;
use CodeIgniter\Database\BaseBuilder;
use Config\Database;
use Config\Services;

/**
 * Read-only aggregate/reporting endpoints. Nothing here mutates data.
 *
 * Common query params across the sales reports: store_id, from, to
 * (both dates apply to sale_date and are inclusive). All sales reports
 * only ever count status='completed' sales — voided/held sales are
 * excluded everywhere. Every report is additionally always scoped to
 * the caller's own company, and to their own assigned stores if they
 * are store-restricted — a client-supplied store_id can narrow within
 * that scope but can never widen past it.
 */
class ReportsController extends BaseApiController
{
    /**
     * The store IDs this report may draw from: an explicit ?store_id=
     * narrows to just that store (if the caller can access it — an
     * inaccessible store_id resolves to no results, never someone
     * else's data); otherwise it's every store the caller can access.
     */
    private function scopedStoreIds(): array
    {
        $auth = Services::authContext();
        $companyStoreIds = model(StoreModel::class)->where('company_id', $auth->companyId)->findColumn('id') ?: [];

        if ($auth->allowedStoreIds !== null) {
            $companyStoreIds = array_values(array_intersect($companyStoreIds, $auth->allowedStoreIds));
        }

        $requested = $this->request->getGet('store_id');
        if ($requested !== null && $requested !== '') {
            return in_array((int) $requested, $companyStoreIds, true) ? [(int) $requested] : [];
        }

        return $companyStoreIds;
    }

    /** Applies company/store/from/to onto a builder already joined/aliased to `sales`, plus status='completed'. */
    private function applyCompletedSalesFilters(BaseBuilder $builder, string $salesAlias = 'sales'): BaseBuilder
    {
        $request = $this->request;
        $builder->where("{$salesAlias}.status", 'completed')
            ->where("{$salesAlias}.company_id", Services::authContext()->companyId)
            ->whereIn("{$salesAlias}.store_id", $this->scopedStoreIds() ?: [0]);

        if ($from = $request->getGet('from')) {
            $builder->where("{$salesAlias}.sale_date >=", $from);
        }
        if ($to = $request->getGet('to')) {
            $builder->where("{$salesAlias}.sale_date <=", $to);
        }

        return $builder;
    }

    private const SALE_AGGREGATES = 'COUNT(*) AS sale_count, COALESCE(SUM(subtotal),0) AS subtotal, '
        . 'COALESCE(SUM(discount_total),0) AS discount_total, COALESCE(SUM(tax_total),0) AS tax_total, '
        . 'COALESCE(SUM(total),0) AS total';

    /**
     * GET /api/v1/reports/dashboard?store_id=&company_id=&date=
     *
     * Phase 21: one round trip for the whole dashboard — Today's Sales,
     * Today's Transactions, Average Transaction, Top Products, Low
     * Stock, Payment Breakdown, Sales by Store. `date` defaults to
     * today but can be overridden to view a past day's dashboard.
     * `store_id` omitted = "All Stores"; Sales by Store always breaks
     * out every store regardless, so switching the selector to one
     * store doesn't hide the comparison.
     */
    public function dashboard()
    {
        $request = $this->request;
        $companyId = Services::authContext()->companyId;
        $storeIds = $this->scopedStoreIds() ?: [0];
        $date = $request->getGet('date') ?: date('Y-m-d');
        $rangeStart = "{$date} 00:00:00";
        $rangeEnd = "{$date} 23:59:59";

        $salesBuilder = model(SaleModel::class)->builder();
        $salesBuilder->where('status', 'completed')
            ->where('sale_date >=', $rangeStart)
            ->where('sale_date <=', $rangeEnd)
            ->where('company_id', $companyId)
            ->whereIn('store_id', $storeIds);
        $summary = $salesBuilder->select('COUNT(*) AS transaction_count, COALESCE(SUM(total),0) AS total_sales')
            ->get()->getFirstRow();

        $transactionCount = (int) $summary->transaction_count;
        $totalSales = (float) $summary->total_sales;
        $averageTransaction = $transactionCount > 0 ? round($totalSales / $transactionCount, 2) : 0.0;

        $topProductsBuilder = model(SaleItemModel::class)->builder();
        $topProductsBuilder->select(
            'sale_items.product_id, p.name AS product_name, '
            . 'SUM(sale_items.quantity) AS total_quantity, SUM(sale_items.line_total) AS total_revenue'
        )
            ->join('sales', 'sales.id = sale_items.sale_id')
            ->join('products p', 'p.id = sale_items.product_id', 'left')
            ->where('sales.status', 'completed')
            ->where('sales.sale_date >=', $rangeStart)
            ->where('sales.sale_date <=', $rangeEnd)
            ->where('sales.company_id', $companyId)
            ->whereIn('sales.store_id', $storeIds);
        $topProducts = $topProductsBuilder->groupBy('sale_items.product_id, p.name')
            ->orderBy('total_quantity', 'DESC')
            ->limit(5)
            ->get()->getResult();

        $lowStockBuilder = model(InventoryModel::class)->builder();
        $lowStockBuilder->select('inventory.id, inventory.product_id, inventory.store_id, inventory.quantity, inventory.reorder_level, p.name AS product_name, p.sku')
            ->join('products p', 'p.id = inventory.product_id')
            ->where('inventory.quantity <=', 'inventory.reorder_level', false)
            ->whereIn('inventory.store_id', $storeIds)
            ->orderBy('inventory.quantity', 'ASC')
            // The dashboard is a quick snapshot tile, not a full report —
            // capped so a catalog with many understocked items can't
            // return an unbounded list here (see reports/low-stock for
            // the paginated, full version).
            ->limit(20);
        $lowStock = $lowStockBuilder->get()->getResult();

        $paymentBuilder = Database::connect()->table('payments p')
            ->select('p.method, COUNT(*) AS payment_count, COALESCE(SUM(p.amount), 0) AS total_amount')
            ->join('sales', 'sales.id = p.sale_id')
            ->where('sales.status', 'completed')
            ->where('sales.sale_date >=', $rangeStart)
            ->where('sales.sale_date <=', $rangeEnd)
            ->where('sales.company_id', $companyId)
            ->whereIn('sales.store_id', $storeIds);
        $paymentBreakdown = $paymentBuilder->groupBy('p.method')
            ->orderBy('total_amount', 'DESC')
            ->get()->getResult();

        $storeBuilder = model(SaleModel::class)->builder();
        $storeBuilder->select(
            'sales.store_id, s.name AS store_name, COUNT(*) AS transaction_count, COALESCE(SUM(sales.total),0) AS total_sales'
        )
            ->join('stores s', 's.id = sales.store_id', 'left')
            ->where('sales.status', 'completed')
            ->where('sales.sale_date >=', $rangeStart)
            ->where('sales.sale_date <=', $rangeEnd)
            ->where('sales.company_id', $companyId)
            ->whereIn('sales.store_id', $storeIds);
        $salesByStore = $storeBuilder->groupBy('sales.store_id, s.name')
            ->orderBy('total_sales', 'DESC')
            ->get()->getResult();

        return $this->ok([
            'date' => $date,
            'today_sales' => round($totalSales, 2),
            'today_transactions' => $transactionCount,
            'average_transaction' => $averageTransaction,
            'top_products' => $topProducts,
            'low_stock' => $lowStock,
            'payment_breakdown' => $paymentBreakdown,
            'sales_by_store' => $salesByStore,
        ]);
    }

    /** GET /api/v1/reports/sales-summary?store_id=&from=&to= */
    public function salesSummary()
    {
        $builder = $this->applyCompletedSalesFilters(model(SaleModel::class)->builder());

        return $this->ok($builder->select(self::SALE_AGGREGATES)->get()->getFirstRow());
    }

    /** GET /api/v1/reports/daily-sales?store_id=&from=&to= */
    public function dailySales()
    {
        $builder = $this->applyCompletedSalesFilters(model(SaleModel::class)->builder());
        $rows = $builder->select('DATE(sale_date) AS date, ' . self::SALE_AGGREGATES)
            ->groupBy('DATE(sale_date)')
            ->orderBy('date', 'DESC')
            ->get()->getResult();

        return $this->ok($rows);
    }

    /** GET /api/v1/reports/monthly-sales?store_id=&from=&to= */
    public function monthlySales()
    {
        $builder = $this->applyCompletedSalesFilters(model(SaleModel::class)->builder());
        $rows = $builder->select("DATE_FORMAT(sale_date, '%Y-%m') AS month, " . self::SALE_AGGREGATES)
            ->groupBy("DATE_FORMAT(sale_date, '%Y-%m')")
            ->orderBy('month', 'DESC')
            ->get()->getResult();

        return $this->ok($rows);
    }

    /**
     * GET /api/v1/reports/store-sales?from=&to=  (no store_id — this report compares stores)
     *
     * Grouped by store_id with the store's CURRENT name live-joined —
     * not the sales.store_name snapshot (Phase 18), which exists to
     * keep a *receipt* frozen and would otherwise fragment one store's
     * totals across multiple rows if it was ever renamed, or leave rows
     * unlabeled for sales predating the snapshot columns.
     */
    public function storeSales()
    {
        $builder = model(SaleModel::class)->builder();
        $builder->select('sales.store_id, s.name AS store_name, ' . self::SALE_AGGREGATES)
            ->join('stores s', 's.id = sales.store_id', 'left')
            ->where('sales.status', 'completed')
            ->where('sales.company_id', Services::authContext()->companyId)
            ->whereIn('sales.store_id', $this->scopedStoreIds() ?: [0]);
        if ($from = $this->request->getGet('from')) {
            $builder->where('sales.sale_date >=', $from);
        }
        if ($to = $this->request->getGet('to')) {
            $builder->where('sales.sale_date <=', $to);
        }

        $rows = $builder->groupBy('sales.store_id, s.name')
            ->orderBy('total', 'DESC')
            ->get()->getResult();

        return $this->ok($rows);
    }

    /**
     * GET /api/v1/reports/cashier-sales?store_id=&from=&to=
     * Grouped by user_id with the CURRENT user name live-joined — see
     * storeSales() for why this doesn't group by the cashier_name
     * snapshot.
     */
    public function cashierSales()
    {
        $builder = model(SaleModel::class)->builder();
        $builder->select('sales.user_id, u.name AS cashier_name, ' . self::SALE_AGGREGATES)
            ->join('users u', 'u.id = sales.user_id', 'left');
        $this->applyCompletedSalesFilters($builder);

        $rows = $builder->groupBy('sales.user_id, u.name')
            ->orderBy('total', 'DESC')
            ->get()->getResult();

        return $this->ok($rows);
    }

    /**
     * GET /api/v1/reports/bagger-performance?store_id=&from=&to=
     * Sales assisted per bagger, grouped by bagger_id with the CURRENT
     * name live-joined (see storeSales()). Sales with no bagger
     * attached are excluded.
     */
    public function baggerPerformance()
    {
        $builder = model(SaleModel::class)->builder();
        $builder->select('sales.bagger_id, u.name AS bagger_name, ' . self::SALE_AGGREGATES)
            ->join('users u', 'u.id = sales.bagger_id', 'left')
            ->where('sales.bagger_id IS NOT NULL', null, false);
        $this->applyCompletedSalesFilters($builder);

        $rows = $builder->groupBy('sales.bagger_id, u.name')
            ->orderBy('sale_count', 'DESC')
            ->get()->getResult();

        return $this->ok($rows);
    }

    /** GET /api/v1/reports/product-sales?store_id=&from=&to=&limit= (limit omitted or unbounded caps at 500 — see productSalesRows()) */
    public function productSales()
    {
        $limitParam = $this->request->getGet('limit');

        return $this->ok($this->productSalesRows($limitParam !== null ? (int) $limitParam : 500));
    }

    /** GET /api/v1/reports/top-products?store_id=&from=&to=&limit=10 — same query as product-sales, capped by default. */
    public function topProducts()
    {
        $limitParam = $this->request->getGet('limit');

        return $this->ok($this->productSalesRows((int) ($limitParam ?? 10)));
    }

    /**
     * Grouped by product_id with the product's CURRENT name/SKU
     * live-joined — see storeSales() for why this doesn't group by the
     * sale_items.product_name/product_sku snapshot.
     */
    private function productSalesRows(?int $limit): array
    {
        $builder = model(SaleItemModel::class)->builder();
        $builder->select(
            'sale_items.product_id, p.name AS product_name, p.sku AS product_sku, '
            . 'SUM(sale_items.quantity) AS total_quantity, SUM(sale_items.line_total) AS total_revenue, '
            . 'COUNT(DISTINCT sale_items.sale_id) AS order_count'
        )
            ->join('sales', 'sales.id = sale_items.sale_id')
            ->join('products p', 'p.id = sale_items.product_id', 'left');
        $this->applyCompletedSalesFilters($builder);

        $builder->groupBy('sale_items.product_id, p.name, p.sku')
            ->orderBy('total_quantity', 'DESC');

        if ($limit !== null) {
            $builder->limit(max(1, min($limit, 500)));
        }

        return $builder->get()->getResult();
    }

    /**
     * GET /api/v1/reports/category-sales?store_id=&from=&to=
     * Grouped by the product's CURRENT category — unlike the receipt
     * snapshot (Phase 18), a reporting rollup is expected to reflect
     * today's taxonomy if a product was recategorized since the sale.
     */
    public function categorySales()
    {
        $builder = model(SaleItemModel::class)->builder();
        $builder->select(
            'c.id AS category_id, COALESCE(c.name, \'Uncategorized\') AS category_name, '
            . 'SUM(sale_items.quantity) AS total_quantity, SUM(sale_items.line_total) AS total_revenue'
        )
            ->join('sales', 'sales.id = sale_items.sale_id')
            ->join('products p', 'p.id = sale_items.product_id')
            ->join('categories c', 'c.id = p.category_id', 'left');
        $this->applyCompletedSalesFilters($builder);

        $rows = $builder->groupBy('c.id, c.name')
            ->orderBy('total_revenue', 'DESC')
            ->get()->getResult();

        return $this->ok($rows);
    }

    /** GET /api/v1/reports/payment-methods?store_id=&from=&to= */
    public function paymentMethodSales()
    {
        $builder = Database::connect()->table('payments p')
            ->select('p.method, COUNT(*) AS payment_count, COALESCE(SUM(p.amount), 0) AS total_amount')
            ->join('sales', 'sales.id = p.sale_id');
        $this->applyCompletedSalesFilters($builder);

        $rows = $builder->groupBy('p.method')
            ->orderBy('total_amount', 'DESC')
            ->get()->getResult();

        return $this->ok($rows);
    }

    /** GET /api/v1/reports/inventory-valuation?store_id= */
    public function inventoryValuation()
    {
        $db = Database::connect();

        $builder = $db->table('inventory i')
            ->select('i.store_id, COUNT(DISTINCT i.product_id) AS product_count, COALESCE(SUM(i.quantity * spp.cost_price), 0) AS total_cost_value')
            ->join('store_product_prices spp', 'spp.product_id = i.product_id AND spp.store_id = i.store_id', 'left')
            ->whereIn('i.store_id', $this->scopedStoreIds() ?: [0]);

        $rows = $builder->groupBy('i.store_id')->get()->getResult();

        return $this->ok($rows);
    }

    /**
     * GET /api/v1/reports/current-stock?store_id=&category_id=
     * Per (product, store) row with names and cost valuation — the
     * detailed counterpart to inventory-valuation's per-store totals.
     */
    public function currentStock()
    {
        $request = $this->request;
        $builder = model(InventoryModel::class)->builder();
        $builder->select(
            'inventory.id, inventory.product_id, inventory.store_id, inventory.quantity, inventory.reorder_level, inventory.updated_at, '
            . 'p.name AS product_name, p.sku, p.category_id, '
            . 'u.abbreviation AS unit, (inventory.quantity * COALESCE(spp.cost_price, 0)) AS cost_value'
        )
            ->join('products p', 'p.id = inventory.product_id')
            ->join('units u', 'u.id = p.unit_id', 'left')
            ->join('store_product_prices spp', 'spp.product_id = inventory.product_id AND spp.store_id = inventory.store_id', 'left')
            ->whereIn('inventory.store_id', $this->scopedStoreIds() ?: [0]);

        if ($categoryId = $request->getGet('category_id')) {
            $builder->where('p.category_id', $categoryId);
        }

        return $this->ok($this->paginateBuilder($builder->orderBy('p.name', 'ASC')));
    }

    /** GET /api/v1/reports/low-stock?store_id=&page=&per_page= */
    public function lowStock()
    {
        $builder = model(InventoryModel::class)->builder();
        $builder->select('inventory.id, inventory.product_id, inventory.store_id, inventory.quantity, inventory.reorder_level, p.name AS product_name, p.sku')
            ->join('products p', 'p.id = inventory.product_id')
            ->where('inventory.quantity <=', 'inventory.reorder_level', false)
            ->whereIn('inventory.store_id', $this->scopedStoreIds() ?: [0])
            ->orderBy('inventory.quantity', 'ASC');

        return $this->ok($this->paginateBuilder($builder));
    }

    /**
     * Applies bounded page/per_page pagination to a builder that's too
     * join-heavy to route through listResource() (which takes a bare
     * Model, not an arbitrary joined query). Same per_page bounds
     * (1-100) as listResource() so these detail-list reports can't
     * return an unbounded result set at scale — a real risk once
     * inventory/inventory_transactions hold hundreds of thousands of rows.
     */
    private function paginateBuilder(BaseBuilder $builder): array
    {
        $request = $this->request;
        $perPage = max(1, min((int) ($request->getGet('per_page') ?? 50), 100));
        $page = max(1, (int) ($request->getGet('page') ?? 1));

        return $builder->get($perPage, ($page - 1) * $perPage)->getResult();
    }

    /** Applies company/store/from/to (against created_at) plus an optional type filter to an inventory_transactions builder. */
    private function applyMovementFilters(BaseBuilder $builder, ?array $types = null): BaseBuilder
    {
        $request = $this->request;

        $builder->whereIn('store_id', $this->scopedStoreIds() ?: [0]);
        if ($from = $request->getGet('from')) {
            $builder->where('created_at >=', $from);
        }
        if ($to = $request->getGet('to')) {
            $builder->where('created_at <=', $to);
        }
        if ($types !== null) {
            $builder->whereIn('type', $types);
        }

        return $builder;
    }

    /**
     * GET /api/v1/reports/stock-movement?store_id=&from=&to=
     * Summary counterpart to the raw audit trail at
     * GET /inventory/movements (Phase 9) — totals by movement type.
     */
    public function stockMovement()
    {
        $builder = $this->applyMovementFilters(model(InventoryTransactionModel::class)->builder());
        $rows = $builder->select('type, COUNT(*) AS movement_count, COALESCE(SUM(quantity), 0) AS net_quantity')
            ->groupBy('type')
            ->get()->getResult();

        return $this->ok($rows);
    }

    /** GET /api/v1/reports/stock-adjustments?store_id=&from=&to=&page=&per_page= — the detailed list, adjustment type only. */
    public function stockAdjustments()
    {
        $builder = model(InventoryTransactionModel::class)->builder();
        $builder->select('inventory_transactions.id, inventory_transactions.product_id, inventory_transactions.store_id, inventory_transactions.quantity, inventory_transactions.balance_after, inventory_transactions.notes, inventory_transactions.created_at, p.name AS product_name, p.sku')
            ->join('products p', 'p.id = inventory_transactions.product_id');
        $this->applyMovementFilters($builder, [InventoryTransactionModel::TYPE_ADJUSTMENT]);

        return $this->ok($this->paginateBuilder($builder->orderBy('inventory_transactions.created_at', 'DESC')));
    }

    /** GET /api/v1/reports/stock-transfers?store_id=&from=&to=&page=&per_page= — the detailed list, transfer_in/out only. */
    public function stockTransfers()
    {
        $builder = model(InventoryTransactionModel::class)->builder();
        $builder->select('inventory_transactions.id, inventory_transactions.product_id, inventory_transactions.store_id, inventory_transactions.type, inventory_transactions.quantity, inventory_transactions.balance_after, inventory_transactions.created_at, p.name AS product_name, p.sku, s.name AS store_name')
            ->join('products p', 'p.id = inventory_transactions.product_id')
            ->join('stores s', 's.id = inventory_transactions.store_id');
        $this->applyMovementFilters($builder, [
            InventoryTransactionModel::TYPE_TRANSFER_IN,
            InventoryTransactionModel::TYPE_TRANSFER_OUT,
        ]);

        return $this->ok($this->paginateBuilder($builder->orderBy('inventory_transactions.created_at', 'DESC')));
    }

    /**
     * GET /api/v1/reports/vat-summary?store_id=&from=&to=
     * BIR-style breakdown for completed sales: Vatable Sales, VAT Amount,
     * VAT-Exempt Sales, Zero-Rated Sales, Total Sales. Classification
     * comes from TaxService::classify() against each line's tax_rates
     * row (via sale_items.tax_rate_id) — nothing here recomputes tax.
     */
    public function vatSummary()
    {
        $taxService = Services::taxService();

        $builder = model(SaleItemModel::class)->builder();
        $builder->select('sale_items.tax_rate_id, sale_items.tax_amount, sale_items.line_total, sale_items.tax_rate, tr.name AS tax_rate_name')
            ->join('sales', 'sales.id = sale_items.sale_id')
            ->join('tax_rates tr', 'tr.id = sale_items.tax_rate_id', 'left');
        $this->applyCompletedSalesFilters($builder);

        $rows = $builder->get()->getResult();

        $totals = [
            'vatable_sales' => 0.0,
            'vat_amount' => 0.0,
            'vat_exempt_sales' => 0.0,
            'zero_rated_sales' => 0.0,
            'non_vat_sales' => 0.0,
            'total_sales' => 0.0,
        ];

        foreach ($rows as $row) {
            $gross = (float) $row->line_total;
            $tax = (float) $row->tax_amount;
            $net = $gross - $tax;
            $totals['total_sales'] += $gross;

            $type = $row->tax_rate_name !== null
                ? $taxService->classify((object) ['name' => $row->tax_rate_name, 'rate' => $row->tax_rate])
                : 'non_vat';

            if ($type === 'vat') {
                $totals['vatable_sales'] += $net;
                $totals['vat_amount'] += $tax;
            } elseif ($type === 'vat_exempt') {
                $totals['vat_exempt_sales'] += $net;
            } elseif ($type === 'zero_rated') {
                $totals['zero_rated_sales'] += $net;
            } else {
                $totals['non_vat_sales'] += $net;
            }
        }

        foreach ($totals as $key => $value) {
            $totals[$key] = round($value, 2);
        }

        return $this->ok($totals);
    }
}
