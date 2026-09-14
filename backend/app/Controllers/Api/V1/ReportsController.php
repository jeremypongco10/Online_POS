<?php

namespace App\Controllers\Api\V1;

use App\Controllers\BaseApiController;
use App\Libraries\TaxService;
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
     * Every discount report below counts sale_items rows with a discount
     * actually applied (`discount > 0`), NOT sales.discount_total —
     * discount_type lives on the line, so the line is the only level at
     * which "how much went out under which type" can be answered. A sale
     * whose lines carry two different types therefore contributes to
     * both, which is correct and is why sale_count is a COUNT(DISTINCT)
     * rather than a row count.
     *
     * Lines predating the discount-type feature (or applied before it
     * shipped) have discount_type NULL and are deliberately included
     * rather than filtered out — money left the till either way, and
     * silently dropping it would make these totals disagree with
     * sales.discount_total for no visible reason. The frontend labels
     * that group explicitly.
     */
    private function discountedLinesBuilder(): BaseBuilder
    {
        $builder = model(SaleItemModel::class)->builder();
        $builder->join('sales', 'sales.id = sale_items.sale_id')
            ->where('sale_items.discount >', 0);

        return $this->applyCompletedSalesFilters($builder);
    }

    /**
     * GET /api/v1/reports/discount-summary?store_id=&from=&to=
     * Total given away per discount type — the "how much, under what"
     * view. net_total is the discounted amount those lines actually rang
     * up at, so discount_total + net_total is what they would have been
     * without the discount.
     */
    public function discountSummary()
    {
        $builder = $this->discountedLinesBuilder();
        $builder->select(
            'sale_items.discount_type, COUNT(*) AS line_count, COUNT(DISTINCT sale_items.sale_id) AS sale_count, '
            . 'COALESCE(SUM(sale_items.discount),0) AS discount_total, '
            . 'COALESCE(SUM(sale_items.line_total),0) AS net_total'
        );

        $rows = $builder->groupBy('sale_items.discount_type')
            ->orderBy('discount_total', 'DESC')
            ->get()->getResult();

        return $this->ok($rows);
    }

    /**
     * GET /api/v1/reports/discounts-by-cashier?store_id=&from=&to=
     * Who is granting discounts, and how much. Grouped by user_id with
     * the CURRENT name live-joined, same as cashierSales() — a renamed
     * cashier stays one row rather than splitting in two.
     */
    public function discountsByCashier()
    {
        $builder = $this->discountedLinesBuilder();
        $builder->select(
            'sales.user_id, u.name AS cashier_name, COUNT(*) AS line_count, '
            . 'COUNT(DISTINCT sale_items.sale_id) AS sale_count, '
            . 'COALESCE(SUM(sale_items.discount),0) AS discount_total'
        )->join('users u', 'u.id = sales.user_id', 'left');

        $rows = $builder->groupBy('sales.user_id, u.name')
            ->orderBy('discount_total', 'DESC')
            ->get()->getResult();

        return $this->ok($rows);
    }

    /**
     * GET /api/v1/reports/discount-details?store_id=&from=&to=&discount_type=a,b
     *
     * One row per discounted line, newest first, carrying the sale's
     * Senior Citizen/PWD holder name and ID number alongside it. With
     * discount_type set to the three government types this IS the
     * SC/PWD register a store has to be able to produce — BIR RR 7-2010
     * requires the purchaser's name and ID number be on record for the
     * discount to be valid, and this is where that record is read back
     * out. With discount_type=manual it's the discretionary-discount
     * review list instead; the approver behind each one is in the Audit
     * Trail (action `item-discount`), which is deliberately not joined
     * here — it's a separate record with its own retention, not a
     * column of this one.
     *
     * Capped at 500 rows like productSales(), so a wide date range
     * degrades to "the most recent 500" rather than to a timeout.
     */
    public function discountDetails()
    {
        $builder = $this->discountedLinesBuilder();
        $builder->select(
            'sale_items.id AS sale_item_id, sales.id AS sale_id, sales.invoice_number, sales.sale_date, '
            . 'sales.discount_holder_name, sales.discount_id_number, u.name AS cashier_name, '
            . 'sale_items.product_name, sale_items.quantity, sale_items.unit_price, '
            . 'sale_items.discount_type, sale_items.discount, sale_items.line_total, sale_items.tax_type'
        )->join('users u', 'u.id = sales.user_id', 'left');

        $requestedTypes = (string) ($this->request->getGet('discount_type') ?? '');
        $types = array_values(array_filter(array_map('trim', explode(',', $requestedTypes))));
        if ($types !== []) {
            $builder->whereIn('sale_items.discount_type', $types);
        }

        $rows = $builder->orderBy('sales.sale_date', 'DESC')
            ->orderBy('sale_items.id', 'DESC')
            ->limit(500)
            ->get()->getResult();

        return $this->ok($rows);
    }

    /**
     * GET /api/v1/reports/vat-summary?store_id=&from=&to=
     * BIR-style breakdown for completed sales: Vatable Sales, VAT Amount,
     * VAT-Exempt Sales, Zero-Rated Sales, Total Sales. Classification
     * comes from TaxService::classify() against each line's tax_rates
     * row (via sale_items.tax_rate_id) — nothing here recomputes tax.
     */
    /**
     * GET /api/v1/reports/sales-book?from=&to=&store_id=
     *
     * The per-invoice sales book BIR asks for during an audit, one row
     * per sale with the VAT classification broken out — the detail
     * behind vatSummary()'s totals, in the shape an examiner reconciles
     * against the receipts and the Z-readings.
     *
     * Returns rows rather than a file: the client renders and downloads
     * it (see ReportsScreen), which keeps this endpoint the same JSON
     * shape as every other report here instead of the one that speaks
     * CSV. Training sales are excluded — they are not sales.
     */
    public function salesBook()
    {
        $taxService = Services::taxService();

        $builder = model(SaleModel::class)->builder();
        $builder->select('sales.id, sales.invoice_number, sales.sale_date, sales.customer_name, sales.customer_tin, sales.customer_address, sales.customer_business_style, sales.discount_total, sales.total')
            ->where('sales.is_training', 0);
        $this->applyCompletedSalesFilters($builder);
        $sales = $builder->orderBy('sales.sale_date', 'ASC')->get()->getResult();

        if ($sales === []) {
            return $this->ok([]);
        }

        $saleIds = array_map(static fn ($s) => (int) $s->id, $sales);
        $lines = model(SaleItemModel::class)->builder()
            ->select('sale_id, tax_type, tax_amount, line_total')
            ->whereIn('sale_id', $saleIds)
            ->get()
            ->getResult();

        $bySale = [];
        foreach ($lines as $line) {
            $id = (int) $line->sale_id;
            $bySale[$id] ??= ['vatable' => 0.0, 'vat' => 0.0, 'exempt' => 0.0, 'zero' => 0.0, 'non_vat' => 0.0];
            $net = (float) $line->line_total - (float) $line->tax_amount;

            match ($line->tax_type) {
                TaxService::TYPE_VAT => [
                    $bySale[$id]['vatable'] += $net,
                    $bySale[$id]['vat'] += (float) $line->tax_amount,
                ],
                TaxService::TYPE_VAT_EXEMPT => $bySale[$id]['exempt'] += $net,
                TaxService::TYPE_ZERO_RATED => $bySale[$id]['zero'] += $net,
                default => $bySale[$id]['non_vat'] += $net,
            };
        }

        $rows = [];
        foreach ($sales as $sale) {
            $split = $bySale[(int) $sale->id] ?? ['vatable' => 0.0, 'vat' => 0.0, 'exempt' => 0.0, 'zero' => 0.0, 'non_vat' => 0.0];

            $rows[] = [
                'sale_date' => $sale->sale_date,
                'invoice_number' => $sale->invoice_number,
                'customer_name' => $sale->customer_name,
                'customer_tin' => $sale->customer_tin,
                'customer_address' => $sale->customer_address,
                'business_style' => $sale->customer_business_style,
                'vatable_sales' => round($split['vatable'], 2),
                'vat_amount' => round($split['vat'], 2),
                'vat_exempt_sales' => round($split['exempt'], 2),
                'zero_rated_sales' => round($split['zero'], 2),
                'non_vat_sales' => round($split['non_vat'], 2),
                'discount_total' => round((float) $sale->discount_total, 2),
                'total' => round((float) $sale->total, 2),
            ];
        }

        return $this->ok($rows);
    }

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
