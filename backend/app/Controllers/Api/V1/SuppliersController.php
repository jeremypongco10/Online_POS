<?php

namespace App\Controllers\Api\V1;

use App\Controllers\Api\BaseCrudController;
use App\Models\CompanyModel;
use App\Models\SupplierModel;
use CodeIgniter\Database\BaseBuilder;
use Config\Database;
use Config\Services;

class SuppliersController extends BaseCrudController
{
    protected string $modelClass = SupplierModel::class;
    protected array $allowedFilters = ['company_id', 'is_active'];
    protected array $allowedSorts = ['id', 'name', 'created_at'];
    protected array $searchableFields = ['name', 'contact_name', 'email', 'phone'];
    protected string $defaultSort = 'name';

    /** Most rows one export or printout fetches (?all=1). */
    private const EXPORT_LIMIT = 10000;

    /** "Recent" / "dormant": ordered from within, or not within, this many days. */
    private const RECENT_DAYS = 90;

    /**
     * DELETE /api/v1/suppliers/{id} — only a supplier nothing was ever
     * ordered from. purchase_orders.supplier_id cascades on delete, so
     * deleting one with orders would silently erase that purchasing history
     * (received POs included); such a supplier is deactivated instead.
     */
    public function delete($id = null)
    {
        $supplier = $this->applyScope()->find($id);
        if ($supplier === null) {
            return $this->notFound();
        }

        $orders = Database::connect()->table('purchase_orders')->where('supplier_id', (int) $id)->countAllResults();
        if ($orders > 0) {
            return $this->apiFail(
                "{$supplier->name} has {$orders} purchase order" . ($orders === 1 ? '' : 's') . ' on record, so it can\'t be deleted. Deactivate it instead to stop ordering from them.',
                422
            );
        }

        return parent::delete($id);
    }

    /**
     * GET /api/v1/suppliers/directory — the Back Office supplier list, each
     * row with its ordering history: orders placed, open orders and their
     * value, what's been received, and the last order date. Counts only the
     * branches the caller can see.
     *
     * Filters: q (name, contact, phone, email, TIN), is_active,
     * segment = open | recent | dormant | never. Sort: name (default),
     * orders, received, open_value, last_order, created_at. ?all=1 for exports.
     */
    public function directory()
    {
        $builder = $this->directoryQuery()
            ->select('sp.id, sp.name, sp.contact_name, sp.email, sp.phone, sp.address, sp.tax_id, sp.is_active, sp.created_at, '
                . 'COALESCE(po.orders, 0) AS orders, COALESCE(po.open_orders, 0) AS open_orders, COALESCE(po.open_value, 0) AS open_value, '
                . 'COALESCE(po.received_total, 0) AS received_total, po.last_order', false);

        if ($this->request->getGet('all') === '1') {
            [$perPage, $page] = [self::EXPORT_LIMIT, 1];
        } else {
            $perPage = max(1, min((int) ($this->request->getGet('per_page') ?? 15), 100));
            $page = max(1, (int) ($this->request->getGet('page') ?? 1));
        }
        $total = $builder->countAllResults(false);

        $sortParam = (string) $this->request->getGet('sort');
        $direction = str_starts_with($sortParam, '-') ? 'DESC' : 'ASC';
        $column = match (ltrim($sortParam, '-')) {
            'orders' => 'orders',
            'received' => 'received_total',
            'open_value' => 'open_value',
            'last_order' => 'po.last_order',
            'created_at' => 'sp.created_at',
            default => 'sp.name',
        };
        $rows = $builder->orderBy($column, $direction)->orderBy('sp.id', 'ASC')->get($perPage, ($page - 1) * $perPage)->getResult();

        return $this->ok($rows, '', [
            'page' => $page,
            'per_page' => $perPage,
            'total' => $total,
            'last_page' => (int) ceil($total / $perPage) ?: 1,
        ]);
    }

    /** GET /api/v1/suppliers/directory/summary — the cards above the list (search applied, segment and status not). */
    public function directorySummary()
    {
        $db = Database::connect();
        $recentSince = date('Y-m-d', strtotime('-' . self::RECENT_DAYS . ' days'));

        $row = $this->directoryQuery(false)
            ->select('COUNT(*) AS total, '
                . 'COALESCE(SUM(CASE WHEN sp.is_active = 1 THEN 1 ELSE 0 END), 0) AS active, '
                . 'COALESCE(SUM(CASE WHEN sp.is_active = 1 THEN 0 ELSE 1 END), 0) AS inactive, '
                . 'COALESCE(SUM(CASE WHEN po.open_orders > 0 THEN 1 ELSE 0 END), 0) AS with_open, '
                . 'COALESCE(SUM(po.open_orders), 0) AS open_orders, '
                . 'COALESCE(SUM(po.open_value), 0) AS open_value, '
                . 'COALESCE(SUM(CASE WHEN po.last_order >= ' . $db->escape($recentSince) . ' THEN 1 ELSE 0 END), 0) AS recent, '
                . 'COALESCE(SUM(CASE WHEN po.last_order < ' . $db->escape($recentSince) . ' THEN 1 ELSE 0 END), 0) AS dormant, '
                . 'COALESCE(SUM(CASE WHEN po.orders IS NULL THEN 1 ELSE 0 END), 0) AS never, '
                . 'COALESCE(SUM(po.received_total), 0) AS received_total', false)
            ->get()->getRow();

        // Received this month, across all suppliers in view.
        $monthBuilder = $db->table('purchase_orders p')
            ->select('COALESCE(SUM(p.total), 0) AS v', false)
            ->where('p.company_id', Services::authContext()->companyId)
            ->where('p.status', 'received')
            ->where('p.received_date >=', date('Y-m-01'));
        $this->scopeOrders($monthBuilder, 'p');
        $month = $monthBuilder->get()->getRow();

        $company = model(CompanyModel::class)->find(Services::authContext()->companyId);

        return $this->ok([
            'total' => (int) $row->total,
            'active' => (int) $row->active,
            'inactive' => (int) $row->inactive,
            'with_open' => (int) $row->with_open,
            'open_orders' => (int) $row->open_orders,
            'open_value' => (string) $row->open_value,
            'recent' => (int) $row->recent,
            'dormant' => (int) $row->dormant,
            'never' => (int) $row->never,
            'recent_days' => self::RECENT_DAYS,
            'received_total' => (string) $row->received_total,
            'received_this_month' => (string) $month->v,
            'company_name' => $company->trade_name ?? null,
        ]);
    }

    /** GET /api/v1/suppliers/{id}/orders — their latest purchase orders, newest first (needs purchases.view to see any). */
    public function orders($id = null)
    {
        if (! $this->applyScope()->find($id)) {
            return $this->notFound();
        }
        if (! Services::authContext()->hasPermission('purchases.view')) {
            return $this->ok([]);
        }

        $builder = Database::connect()->table('purchase_orders p')
            ->select('p.id, p.po_number, p.status, p.order_date, p.expected_date, p.received_date, p.total, s.name AS store_name')
            ->join('stores s', 's.id = p.store_id', 'left')
            ->where('p.company_id', Services::authContext()->companyId)
            ->where('p.supplier_id', (int) $id);
        $this->scopeOrders($builder, 'p');

        return $this->ok($builder->orderBy('p.order_date', 'DESC')->orderBy('p.id', 'DESC')->limit(10)->get()->getResult());
    }

    /** Store-restricted callers only count orders for their own branches. */
    private function scopeOrders(BaseBuilder $builder, string $alias): void
    {
        $allowed = Services::authContext()->allowedStoreIds;
        if ($allowed !== null) {
            $builder->whereIn("{$alias}.store_id", $allowed ?: [0]);
        }
    }

    /**
     * suppliers with their purchase-order stats joined on, scoped to the
     * caller's company, with the request's filters. $withSegment false
     * leaves the status and segment filters off, for the summary cards.
     */
    private function directoryQuery(bool $withSegment = true): BaseBuilder
    {
        $db = Database::connect();
        $auth = Services::authContext();
        $companyId = (int) $auth->companyId;
        $get = fn (string $key) => trim((string) ($this->request->getGet($key) ?? ''));

        $storeScope = $auth->allowedStoreIds !== null
            ? ' AND store_id IN (' . implode(',', array_map('intval', $auth->allowedStoreIds ?: [0])) . ')'
            : '';
        // Open = drafted or approved, not yet received or cancelled.
        $stats = '(SELECT supplier_id, COUNT(*) AS orders, '
            . "SUM(CASE WHEN status IN ('draft', 'approved') THEN 1 ELSE 0 END) AS open_orders, "
            . "SUM(CASE WHEN status IN ('draft', 'approved') THEN total ELSE 0 END) AS open_value, "
            . "SUM(CASE WHEN status = 'received' THEN total ELSE 0 END) AS received_total, "
            . 'MAX(order_date) AS last_order '
            . "FROM purchase_orders WHERE company_id = {$companyId}{$storeScope} GROUP BY supplier_id) po";

        $builder = $db->table('suppliers sp')
            ->join($stats, 'po.supplier_id = sp.id', 'left', false)
            ->where('sp.company_id', $companyId);

        if ($get('q') !== '') {
            $builder->groupStart()
                ->like('sp.name', $get('q'))
                ->orLike('sp.contact_name', $get('q'))
                ->orLike('sp.phone', $get('q'))
                ->orLike('sp.email', $get('q'))
                ->orLike('sp.tax_id', $get('q'))
                ->groupEnd();
        }

        if ($withSegment) {
            if ($get('is_active') === '1' || $get('is_active') === '0') {
                $builder->where('sp.is_active', (int) $get('is_active'));
            }
            $recentSince = date('Y-m-d', strtotime('-' . self::RECENT_DAYS . ' days'));
            match ($get('segment')) {
                'open' => $builder->where('po.open_orders >', 0),
                'recent' => $builder->where('po.last_order >=', $recentSince),
                'dormant' => $builder->where('po.last_order <', $recentSince),
                'never' => $builder->where('po.orders IS NULL', null, false),
                default => $builder,
            };
        }

        return $builder;
    }
}
