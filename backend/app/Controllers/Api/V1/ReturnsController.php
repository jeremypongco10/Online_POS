<?php

namespace App\Controllers\Api\V1;

use App\Controllers\Api\BaseCrudController;
use App\Controllers\Api\ResolvesSupervisorApprover;
use App\Models\CashSessionModel;
use App\Models\InventoryModel;
use App\Models\InventoryTransactionModel;
use App\Models\PaymentModel;
use App\Models\ProductModel;
use App\Models\RegisterModel;
use App\Models\ReturnItemModel;
use App\Models\SaleItemModel;
use App\Models\SaleModel;
use App\Models\SalesReturnModel;
use CodeIgniter\HTTP\ResponseInterface;
use CodeIgniter\Model;
use Config\Database;
use Config\Services;

/**
 * Returns happen at the POS only: Search Invoice -> Select Product ->
 * Select Quantity -> Reason -> Supervisor approves -> Refund -> Return
 * inventory, all in posReturn(). The cashier requests it (returns.create)
 * and a supervisor signs off with their own credentials (returns.approve),
 * so the person asking for a refund is never the one authorizing it.
 *
 * approve()/reject() remain only for returns left pending by the older
 * Back Office request flow.
 */
class ReturnsController extends BaseCrudController
{
    use ResolvesSupervisorApprover;

    protected string $modelClass = SalesReturnModel::class;
    protected array $allowedFilters = ['sale_id', 'store_id', 'customer_id', 'status'];
    protected array $allowedSorts = ['id', 'return_number', 'return_date', 'total_refund', 'created_at'];
    protected array $searchableFields = ['return_number', 'reason'];
    protected string $defaultSort = '-return_date';

    /** returns has no company_id column of its own — scope indirectly through store_id. */
    protected function applyScope(): Model
    {
        return $this->scopeByStoreIds('store_id');
    }

    /** Most rows one export or printout fetches (?all=1). */
    private const EXPORT_LIMIT = 5000;

    /**
     * GET /api/v1/returns — the Back Office history, named and filterable.
     * Filters: q (return #, invoice #, reason), store_id, status,
     * refund_method, reason, date_from, date_to (return date). Sort:
     * return_date (default, newest first), total_refund, return_number.
     * ?all=1 returns everything matching, for exports and printouts.
     */
    public function index()
    {
        $builder = $this->historyQuery()
            ->select('r.*, sa.invoice_number, s.name AS store_name, s.code AS store_code, rg.name AS register_name, '
                . 'u.name AS cashier_name, ap.name AS approved_by_name, '
                . '(SELECT COALESCE(SUM(ri.quantity), 0) FROM return_items ri WHERE ri.return_id = r.id) AS units', false)
            ->join('registers rg', 'rg.id = r.register_id', 'left')
            ->join('users u', 'u.id = r.user_id', 'left')
            ->join('users ap', 'ap.id = r.approved_by', 'left');

        if ($this->request->getGet('all') === '1') {
            [$perPage, $page] = [self::EXPORT_LIMIT, 1];
        } else {
            $perPage = max(1, min((int) ($this->request->getGet('per_page') ?? 15), 100));
            $page = max(1, (int) ($this->request->getGet('page') ?? 1));
        }
        $total = $builder->countAllResults(false);

        $sortParam = (string) $this->request->getGet('sort');
        $direction = $sortParam === '' || str_starts_with($sortParam, '-') ? 'DESC' : 'ASC';
        $column = match (ltrim($sortParam, '-')) {
            'total_refund' => 'r.total_refund',
            'return_number' => 'r.return_number',
            default => 'r.return_date',
        };
        $rows = $builder->orderBy($column, $direction)->orderBy('r.id', 'DESC')->get($perPage, ($page - 1) * $perPage)->getResult();

        return $this->ok($rows, '', [
            'page' => $page,
            'per_page' => $perPage,
            'total' => $total,
            'last_page' => (int) ceil($total / $perPage) ?: 1,
        ]);
    }

    /**
     * GET /api/v1/returns/summary — the cards above the history, for the
     * same filters as the list (status excluded, so the cards stay a
     * picture of everything while one status is being looked at).
     */
    public function summary()
    {
        $base = fn () => $this->historyQuery(false);

        // Money only counts refunds that actually happened.
        $totals = $base()
            ->select("COALESCE(SUM(r.total_refund), 0) AS refund_total, "
                . "COALESCE(SUM(CASE WHEN r.refund_method = 'cash' THEN r.total_refund ELSE 0 END), 0) AS cash_total, "
                . "COALESCE(SUM(CASE WHEN r.refund_method IS NOT NULL AND r.refund_method <> 'cash' THEN r.total_refund ELSE 0 END), 0) AS non_cash_total", false)
            ->where('r.status', 'completed')
            ->get()->getRow();

        $statusCounts = $base()
            ->select("r.status, COUNT(*) AS n", false)
            ->groupBy('r.status')
            ->get()->getResult();
        $byStatus = ['completed' => 0, 'pending' => 0, 'cancelled' => 0];
        foreach ($statusCounts as $row) {
            $byStatus[$row->status] = (int) $row->n;
        }

        $units = $base()
            ->select('COALESCE(SUM(ri.quantity), 0) AS units', false)
            ->join('return_items ri', 'ri.return_id = r.id')
            ->where('r.status', 'completed')
            ->get()->getRow();

        $byReason = $base()
            ->select("COALESCE(NULLIF(r.reason, ''), 'No reason') AS reason, COUNT(*) AS count, COALESCE(SUM(r.total_refund), 0) AS total", false)
            ->where('r.status', 'completed')
            ->groupBy('reason')
            ->orderBy('count', 'DESC')
            ->limit(6)
            ->get()->getResult();

        $company = model(\App\Models\CompanyModel::class)->find(Services::authContext()->companyId);

        return $this->ok([
            'return_count' => (int) $byStatus['completed'],
            'refund_total' => (string) $totals->refund_total,
            'cash_total' => (string) $totals->cash_total,
            'non_cash_total' => (string) $totals->non_cash_total,
            'units' => (string) $units->units,
            'completed_count' => $byStatus['completed'],
            'pending_count' => $byStatus['pending'],
            'cancelled_count' => $byStatus['cancelled'],
            'by_reason' => array_map(static fn ($r) => ['reason' => $r->reason, 'count' => (int) $r->count, 'total' => (string) $r->total], $byReason),
            'company_name' => $company->trade_name ?? null,
        ]);
    }

    /**
     * returns joined to its sale and branch, scoped to the caller's company
     * and stores, with the request's filters applied. $withStatus false
     * leaves the status filter off (the summary cards count every status).
     */
    private function historyQuery(bool $withStatus = true): \CodeIgniter\Database\BaseBuilder
    {
        $auth = Services::authContext();
        $get = fn (string $key) => trim((string) ($this->request->getGet($key) ?? ''));

        $builder = Database::connect()->table('returns r')
            ->join('sales sa', 'sa.id = r.sale_id', 'left')
            ->join('stores s', 's.id = r.store_id', 'left')
            ->where('s.company_id', $auth->companyId);

        if ($auth->allowedStoreIds !== null) {
            $builder->whereIn('r.store_id', $auth->allowedStoreIds ?: [0]);
        }
        if ($get('store_id') !== '') {
            $builder->where('r.store_id', (int) $get('store_id'));
        }
        if ($withStatus && in_array($get('status'), ['completed', 'pending', 'cancelled'], true)) {
            $builder->where('r.status', $get('status'));
        }
        if ($get('refund_method') !== '') {
            $builder->where('r.refund_method', strtolower($get('refund_method')));
        }
        if ($get('reason') !== '') {
            $builder->where('r.reason', $get('reason'));
        }
        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $get('date_from'))) {
            $builder->where('r.return_date >=', $get('date_from') . ' 00:00:00');
        }
        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $get('date_to'))) {
            $builder->where('r.return_date <=', $get('date_to') . ' 23:59:59');
        }
        if ($get('q') !== '') {
            $builder->groupStart()
                ->like('r.return_number', $get('q'))
                ->orLike('sa.invoice_number', $get('q'))
                ->orLike('r.reason', $get('q'))
                ->groupEnd();
        }

        return $builder;
    }

    /** GET /api/v1/returns/{id} */
    public function show($id = null)
    {
        $return = $this->applyScope()->find($id);

        if (! $return) {
            return $this->notFound();
        }

        [$return] = $this->withNames([$return]);

        return $this->ok($return);
    }

    private function withNames(array $rows): array
    {
        if ($rows === []) {
            return $rows;
        }

        $ids = static fn (string $field) => array_values(array_unique(array_filter(array_map(static fn ($r) => (int) ($r->{$field} ?? 0), $rows))));
        $nameMap = static function (array $found, string $field = 'name'): array {
            $map = [];
            foreach ($found as $row) {
                $map[(int) $row->id] = $row->{$field};
            }

            return $map;
        };

        $userIds = array_values(array_unique([...$ids('user_id'), ...$ids('approved_by')]));
        $saleIds = $ids('sale_id');
        $storeIds = $ids('store_id');
        $db = Database::connect();

        $users = $userIds === [] ? [] : $nameMap($db->table('users')->select('id, name')->whereIn('id', $userIds)->get()->getResult());
        $invoices = $saleIds === [] ? [] : $nameMap($db->table('sales')->select('id, invoice_number')->whereIn('id', $saleIds)->get()->getResult(), 'invoice_number');
        $stores = $storeIds === [] ? [] : $nameMap($db->table('stores')->select('id, name')->whereIn('id', $storeIds)->get()->getResult());

        foreach ($rows as $row) {
            $row->invoice_number = $invoices[(int) $row->sale_id] ?? null;
            $row->store_name = $stores[(int) $row->store_id] ?? null;
            $row->cashier_name = $users[(int) $row->user_id] ?? null;
            $row->approved_by_name = $row->approved_by ? ($users[(int) $row->approved_by] ?? null) : null;
        }

        return $rows;
    }

    /** GET /api/v1/returns/{id}/items */
    public function items($id = null)
    {
        if (! $this->applyScope()->find($id)) {
            return $this->notFound();
        }

        return $this->ok(model(ReturnItemModel::class)->where('return_id', $id)->findAll());
    }

    /**
     * GET /api/v1/returns/eligible-items?sale_id=X
     * "Select Product" / "Select Quantity": every line on the invoice
     * with however much of it is still returnable (sold minus already
     * completed-returned), so the UI can bound the quantity picker and
     * hide lines that are already fully returned.
     */
    public function eligibleItems()
    {
        $saleId = (int) $this->request->getGet('sale_id');

        if ($saleId === 0) {
            return $this->apiFail('sale_id is required', 422);
        }

        $sale = model(SaleModel::class)->where('company_id', Services::authContext()->companyId)->find($saleId);
        if (! $sale || ! Services::authContext()->canAccessStore((int) $sale->store_id)) {
            return $this->apiFail('Unknown sale_id', 422);
        }

        $returnItemModel = model(ReturnItemModel::class);
        $items = model(SaleItemModel::class)->where('sale_id', $saleId)->findAll();

        $result = array_map(static function ($item) use ($returnItemModel) {
            $returned = $returnItemModel->returnedQuantityForSaleItem((int) $item->id);
            $item->returned_quantity = $returned;
            $item->remaining_quantity = max(0, (float) $item->quantity - $returned);

            return $item;
        }, $items);

        return $this->ok($result);
    }

    /**
     * POST /api/v1/returns/pos
     * body: { sale_id, cash_session_id, refund_method, reason,
     *         items: [{ sale_item_id, quantity }],
     *         supervisor_identifier, supervisor_password }
     *
     * The register's return: requested by the signed-in cashier, approved
     * on the spot by a supervisor typing their own credentials (they need
     * returns.approve, checked by resolveSupervisorApprover exactly like a
     * void), then refunded and restocked in the same transaction — so the
     * customer leaves with their money and there's no pending state for a
     * Back Office to clear later. Returns are made here only; create() is
     * no longer routed.
     *
     * A cash refund is tied to the cashier's own open drawer session, so
     * that drawer's expected cash drops by the refund (see
     * CashSessionsController::buildSummary) and the count at closing still
     * balances. A non-cash refund must use a method the sale was actually
     * paid with.
     */
    public function posReturn()
    {
        $payload = $this->request->getJSON(true) ?? [];
        $auth = Services::authContext();
        $items = $payload['items'] ?? [];

        if (! is_array($items) || $items === []) {
            return $this->apiFail('Pick at least one item to return', 422);
        }
        if (trim((string) ($payload['reason'] ?? '')) === '') {
            return $this->validationFail(['reason' => 'Give a reason for the return.']);
        }
        // Settings → Security decides whether a supervisor must sign off.
        // Fails closed: an unreadable company row means approval is needed.
        $company = model(\App\Models\CompanyModel::class)->find($auth->companyId);
        $approvalRequired = $company === null || (bool) ($company->require_return_approval ?? 1);
        $hasCredentials = ! empty($payload['supervisor_identifier']) && ! empty($payload['supervisor_password']);
        if ($approvalRequired && ! $hasCredentials) {
            return $this->validationFail(['supervisor' => 'A supervisor has to sign in to approve this return.']);
        }

        $session = model(CashSessionModel::class)->find((int) ($payload['cash_session_id'] ?? 0));
        if (! $session || $session->status !== 'open' || (int) $session->user_id !== $auth->userId) {
            return $this->apiFail('Open your POS terminal before doing a return.', 422);
        }
        $register = model(RegisterModel::class)->find((int) $session->register_id);

        $sale = model(SaleModel::class)->where('company_id', $auth->companyId)->find((int) ($payload['sale_id'] ?? 0));
        if (! $sale || ! $auth->canAccessStore((int) $sale->store_id)) {
            return $this->apiFail('Unknown sale', 422);
        }
        if (! $register || (int) $register->store_id !== (int) $sale->store_id) {
            return $this->apiFail('This sale was made at another branch. Return it at that branch.', 422);
        }
        if ($sale->status !== 'completed') {
            return $this->apiFail("Cannot return items from a sale with status: {$sale->status}", 422);
        }

        // "exchange" settles it as a replacement: no money back now, an
        // exchange credit the replacement sale spends (SalesController::create).
        $refundMethod = strtolower(trim((string) ($payload['refund_method'] ?? PaymentModel::METHOD_CASH)));
        if ($refundMethod !== PaymentModel::METHOD_CASH && $refundMethod !== PaymentModel::METHOD_EXCHANGE) {
            $paidWith = model(PaymentModel::class)->where('sale_id', $sale->id)->findColumn('method') ?: [];
            if (! in_array($refundMethod, array_map('strtolower', $paidWith), true)) {
                return $this->validationFail(['refund_method' => 'Refund in cash, or with a method this sale was paid with.']);
            }
        }

        $lineData = $this->buildReturnLines($sale, $items);
        if ($lineData instanceof ResponseInterface) {
            return $lineData;
        }
        $totalRefund = round(array_sum(array_column($lineData, 'refund_amount')), 2);

        // With approval off, credentials are optional — but if a supervisor
        // did sign anyway they are still checked, never trusted blindly.
        $approver = null;
        if ($hasCredentials) {
        $approver = $this->resolveSupervisorApprover(
            [
                'identifier' => $payload['supervisor_identifier'],
                'password' => $payload['supervisor_password'],
                'store_id' => $sale->store_id,
            ],
            'returns.approve',
            'return-denied',
            'Sales Return',
            (string) ($sale->invoice_number ?? "Sale #{$sale->id}")
        );
        if ($approver instanceof ResponseInterface) {
            return $approver;
        }
        }

        $db = Database::connect();
        $db->transStart();

        $now = date('Y-m-d H:i:s');
        $returnId = $this->model->insert([
            'sale_id' => $sale->id,
            'store_id' => $sale->store_id,
            // The terminal handing the refund out, for its X/Z reading.
            'register_id' => (int) $session->register_id,
            'customer_id' => $sale->customer_id ?? null,
            'user_id' => $auth->userId,
            'approved_by' => $approver->id ?? null,
            'approved_at' => $approver ? $now : null,
            'reason' => trim((string) $payload['reason']),
            'status' => SalesReturnModel::STATUS_COMPLETED,
            'total_refund' => $totalRefund,
            'refund_method' => $refundMethod,
            'cash_session_id' => $refundMethod === PaymentModel::METHOD_CASH ? $session->id : null,
            'return_date' => $now,
            'return_number' => 'RET-' . strtoupper(bin2hex(random_bytes(4))),
        ], true);

        if ($returnId === false) {
            $db->transRollback();

            return $this->validationFail($this->model->errors());
        }

        $returnItemModel = model(ReturnItemModel::class);
        foreach ($lineData as $line) {
            if ($returnItemModel->insert(['return_id' => $returnId, ...$line]) === false) {
                $db->transRollback();

                return $this->validationFail($returnItemModel->errors());
            }
        }

        $return = $this->model->find($returnId);
        $this->restock($return, $returnItemModel->where('return_id', $returnId)->findAll());

        $db->transComplete();

        if ($db->transStatus() === false) {
            return $this->apiFail('Failed to record the return', 500);
        }

        Services::auditLogger()->log('create', 'Sales Return', (int) $returnId, $return->return_number, [
            'sale_id' => (int) $sale->id,
            'invoice_number' => $sale->invoice_number ?? null,
            'total_refund' => $totalRefund,
            'refund_method' => $refundMethod,
            'reason' => $return->reason,
            // Null when the company has approval switched off — the return
            // is then on record under the cashier alone, the same way an
            // unapproved void is.
            'approved_by' => $approver->name ?? null,
            'approved_by_id' => $approver ? (int) $approver->id : null,
        ]);

        $return->items = $returnItemModel->where('return_id', $returnId)->findAll();
        $return->approved_by_name = $approver->name ?? null;

        return $this->created(
            $return,
            $refundMethod === PaymentModel::METHOD_EXCHANGE ? 'Exchange credit issued — ring up the replacement items' : 'Return completed and refunded'
        );
    }

    /**
     * GET /api/v1/returns/open-credits?store_id=
     * Exchange credits issued at a branch and not yet spent — the POS lists
     * them so a credit is never lost when its replacement sale didn't go
     * through (cart cancelled, page reloaded).
     */
    public function openCredits()
    {
        $auth = Services::authContext();
        $storeId = (int) ($this->request->getGet('store_id') ?? 0);
        if ($storeId === 0 || ! $auth->canAccessStore($storeId)) {
            return $this->ok([]);
        }

        $rows = Database::connect()->table('returns r')
            ->select('r.id, r.return_number, r.total_refund, r.return_date, r.reason, sa.invoice_number, u.name AS cashier_name')
            ->join('sales sa', 'sa.id = r.sale_id', 'left')
            ->join('users u', 'u.id = r.user_id', 'left')
            ->join('stores s', 's.id = r.store_id')
            ->where('s.company_id', $auth->companyId)
            ->where('r.store_id', $storeId)
            ->where('r.status', SalesReturnModel::STATUS_COMPLETED)
            ->where('r.refund_method', PaymentModel::METHOD_EXCHANGE)
            ->where('r.exchange_sale_id', null)
            ->orderBy('r.return_date', 'DESC')
            ->limit(50)
            ->get()->getResult();

        return $this->ok($rows);
    }

    /**
     * POST /api/v1/returns/{id}/refund-credit  body: { cash_session_id, refund_method }
     * Pays out an unused exchange credit as an ordinary refund instead —
     * the customer changed their mind about a replacement. Already
     * approved when it was issued, so no second sign-off; a cash payout
     * comes out of this cashier's drawer like any cash refund.
     */
    public function refundCredit($id = null)
    {
        $auth = Services::authContext();
        $return = $this->applyScope()->find($id);
        if (! $return) {
            return $this->notFound();
        }
        if ($return->status !== SalesReturnModel::STATUS_COMPLETED || $return->refund_method !== PaymentModel::METHOD_EXCHANGE || $return->exchange_sale_id !== null) {
            return $this->apiFail('This is not an unused exchange credit', 422);
        }

        $payload = $this->request->getJSON(true) ?? [];
        $session = model(CashSessionModel::class)->find((int) ($payload['cash_session_id'] ?? 0));
        if (! $session || $session->status !== 'open' || (int) $session->user_id !== $auth->userId) {
            return $this->apiFail('Open your POS terminal before paying out a refund.', 422);
        }
        $register = model(RegisterModel::class)->find((int) $session->register_id);
        if (! $register || (int) $register->store_id !== (int) $return->store_id) {
            return $this->apiFail('This credit was issued at another branch. Pay it out there.', 422);
        }

        $method = strtolower(trim((string) ($payload['refund_method'] ?? PaymentModel::METHOD_CASH)));
        if ($method !== PaymentModel::METHOD_CASH) {
            $paidWith = model(PaymentModel::class)->where('sale_id', $return->sale_id)->findColumn('method') ?: [];
            if (! in_array($method, array_map('strtolower', $paidWith), true)) {
                return $this->validationFail(['refund_method' => 'Refund in cash, or with a method the original sale was paid with.']);
            }
        }

        // Conditional on still being an unused credit, so a sale spending it
        // at the same moment can't leave it both spent and paid out.
        $db = Database::connect();
        $db->table('returns')
            ->where('id', (int) $id)
            ->where('refund_method', PaymentModel::METHOD_EXCHANGE)
            ->where('exchange_sale_id', null)
            ->update([
                'refund_method' => $method,
                'cash_session_id' => $method === PaymentModel::METHOD_CASH ? $session->id : null,
                'register_id' => (int) $session->register_id,
                'updated_at' => date('Y-m-d H:i:s'),
            ]);
        if ($db->affectedRows() !== 1) {
            return $this->apiFail('That credit was just used on a sale', 409);
        }

        Services::auditLogger()->log('update', 'Sales Return', (int) $id, $return->return_number, [
            'refund_method' => ['old' => PaymentModel::METHOD_EXCHANGE, 'new' => $method],
        ]);

        return $this->ok($this->model->find($id), 'Credit refunded');
    }

    /**
     * Validates requested return lines against the sale and turns them into
     * rows for return_items, or returns the error response to send.
     * product_id and unit_price always come from the sale line, never the
     * client, so a return can't refund another product or another price.
     *
     * @return list<array<string, mixed>>|ResponseInterface
     */
    private function buildReturnLines(object $sale, array $items)
    {
        $saleItemModel = model(SaleItemModel::class);
        $returnItemModel = model(ReturnItemModel::class);
        $lineData = [];

        foreach ($items as $item) {
            $saleItem = $saleItemModel->find((int) ($item['sale_item_id'] ?? 0));

            if (! $saleItem || (int) $saleItem->sale_id !== (int) $sale->id) {
                return $this->apiFail('An item does not belong to this sale', 422);
            }

            $quantity = (float) ($item['quantity'] ?? 0);
            if ($quantity <= 0) {
                return $this->apiFail('Return quantity must be greater than zero', 422);
            }

            $alreadyReturned = $returnItemModel->returnedQuantityForSaleItem((int) $saleItem->id);
            $remaining = (float) $saleItem->quantity - $alreadyReturned;

            if ($quantity > $remaining + 0.0001) {
                return $this->apiFail(
                    "Cannot return {$quantity} of {$saleItem->product_name}: sold {$saleItem->quantity}, already returned {$alreadyReturned}, {$remaining} remaining",
                    422
                );
            }

            $lineData[] = [
                'sale_item_id' => $saleItem->id,
                'product_id' => $saleItem->product_id,
                'quantity' => $quantity,
                'unit_price' => $saleItem->unit_price,
                'refund_amount' => round($quantity * (float) $saleItem->unit_price, 2),
            ];
        }

        return $lineData;
    }

    /** Puts returned quantities of tracked products back on the return's store shelf, with a movement for each. */
    private function restock(object $return, array $lines): void
    {
        $inventoryModel = model(InventoryModel::class);
        $transactionModel = model(InventoryTransactionModel::class);

        foreach ($lines as $line) {
            $product = model(ProductModel::class)->find($line->product_id);
            if (! $product || ! (bool) $product->track_inventory) {
                continue;
            }

            $inventory = $inventoryModel->forProductAtStore((int) $line->product_id, (int) $return->store_id);
            $balance = Services::inventoryCalculator()->applyDelta((float) ($inventory->quantity ?? 0), (float) $line->quantity);
            $inventoryId = $inventory
                ? $inventory->id
                : $inventoryModel->insert([
                    'product_id' => $line->product_id,
                    'store_id' => $return->store_id,
                    'quantity' => 0,
                    'reorder_level' => $product->minimum_stock ?? 0,
                ], true);

            $inventoryModel->update($inventoryId, ['quantity' => $balance]);

            $transactionModel->insert([
                'inventory_id' => $inventoryId,
                'product_id' => $line->product_id,
                'store_id' => $return->store_id,
                'type' => InventoryTransactionModel::TYPE_RETURN,
                'quantity' => $line->quantity,
                'balance_after' => $balance,
                'reference_type' => 'return',
                'reference_id' => $return->id,
                'user_id' => Services::authContext()->userId,
            ]);
        }
    }

    /**
     * POST /api/v1/returns/{id}/approve
     * Pending only. This is the one place a refund is issued and stock
     * comes back — gated on returns.approve, a permission distinct from
     * returns.create, so the requester alone can't authorize their own
     * refund.
     */
    public function approve($id = null)
    {
        $return = $this->applyScope()->find($id);

        if (! $return) {
            return $this->notFound();
        }

        if ($return->status !== SalesReturnModel::STATUS_PENDING) {
            return $this->apiFail("Only a pending return can be approved (current status: {$return->status})", 422);
        }

        $returnItemModel = model(ReturnItemModel::class);
        $lines = $returnItemModel->where('return_id', $id)->findAll();

        // Re-validate against the current state, not the state at request
        // time — another return on the same sale item could have been
        // approved in the meantime.
        $saleItemModel = model(SaleItemModel::class);
        foreach ($lines as $line) {
            $saleItem = $saleItemModel->find($line->sale_item_id);
            $alreadyReturned = $returnItemModel->returnedQuantityForSaleItem((int) $line->sale_item_id, (int) $id);
            $remaining = (float) $saleItem->quantity - $alreadyReturned;

            if ((float) $line->quantity > $remaining + 0.0001) {
                return $this->apiFail(
                    "Cannot approve: requested {$line->quantity} of {$saleItem->product_name} but only {$remaining} is still returnable now",
                    422
                );
            }
        }

        $db = Database::connect();
        $db->transStart();

        $this->restock($return, $lines);

        $this->model->update($id, [
            'status' => SalesReturnModel::STATUS_COMPLETED,
            'approved_by' => Services::authContext()->userId,
            'approved_at' => date('Y-m-d H:i:s'),
        ]);

        $db->transComplete();

        if ($db->transStatus() === false) {
            return $this->apiFail('Failed to approve return', 500);
        }

        Services::auditLogger()->log('approve', 'Sales Return', (int) $id, $return->return_number, [
            'status' => ['old' => $return->status, 'new' => SalesReturnModel::STATUS_COMPLETED],
        ]);

        return $this->ok($this->model->find($id), 'Return approved, refunded, and inventory restocked');
    }

    /** POST /api/v1/returns/{id}/reject — pending only. */
    public function reject($id = null)
    {
        $return = $this->applyScope()->find($id);

        if (! $return) {
            return $this->notFound();
        }

        if ($return->status !== SalesReturnModel::STATUS_PENDING) {
            return $this->apiFail("Only a pending return can be rejected (current status: {$return->status})", 422);
        }

        $payload = $this->request->getJSON(true) ?? [];

        $this->model->update($id, [
            'status' => SalesReturnModel::STATUS_CANCELLED,
            'reason' => trim(($return->reason ?? '') . ' [REJECTED] ' . ($payload['reason'] ?? '')),
        ]);

        Services::auditLogger()->log('reject', 'Sales Return', (int) $id, $return->return_number, [
            'status' => ['old' => $return->status, 'new' => SalesReturnModel::STATUS_CANCELLED],
        ]);

        return $this->ok($this->model->find($id), 'Return rejected');
    }
}
