<?php

namespace App\Controllers\Api\V1;

use App\Controllers\Api\BaseCrudController;
use App\Models\CashMovementModel;
use App\Models\CashSessionModel;
use App\Models\PaymentModel;
use App\Models\RegisterModel;
use CodeIgniter\Model;
use Config\Services;

/**
 * Phase 17 flow: Open Register -> Opening Cash -> Sales -> Cash
 * movements -> Close Register -> Expected Cash -> Actual Cash ->
 * Difference.
 *
 * Expected Cash = opening_balance + cash-tendered sales + cash-ins -
 * cash-outs. Only the CASH portion of a sale's payments counts — a
 * sale split between cash and GCash only puts the cash amount in the
 * physical drawer.
 */
class CashSessionsController extends BaseCrudController
{
    protected string $modelClass = CashSessionModel::class;
    protected array $allowedFilters = ['register_id', 'user_id', 'status'];
    protected array $allowedSorts = ['id', 'opened_at', 'closed_at', 'created_at'];
    protected array $searchableFields = [];
    protected string $defaultSort = '-opened_at';

    /** cash_sessions has no company_id column of its own — scope indirectly through the register's store. */
    protected function applyScope(): Model
    {
        return $this->model->whereIn('register_id', $this->allowedRegisterIds() ?: [0]);
    }

    /** Register IDs belonging to the caller's own (and, if store-restricted, assigned) stores. */
    private function allowedRegisterIds(): array
    {
        $auth = Services::authContext();
        $storeIds = model(\App\Models\StoreModel::class)->where('company_id', $auth->companyId)->findColumn('id') ?: [];

        if ($auth->allowedStoreIds !== null) {
            $storeIds = array_values(array_intersect($storeIds, $auth->allowedStoreIds));
        }

        return array_map('intval', model(RegisterModel::class)->whereIn('store_id', $storeIds ?: [0])->findColumn('id') ?: []);
    }

    /** POST /api/v1/cash-sessions/open  body: { register_id, opening_balance } */
    public function open()
    {
        $payload = $this->request->getJSON(true) ?? [];

        $rules = [
            'register_id' => ['label' => 'POS Terminal', 'rules' => 'required|is_natural_no_zero'],
            'opening_balance' => ['label' => 'Opening balance', 'rules' => 'required|decimal'],
        ];

        if (! $this->validateData($payload, $rules)) {
            return $this->validationFail($this->validator->getErrors());
        }

        if (! in_array((int) $payload['register_id'], $this->allowedRegisterIds(), true)) {
            return $this->apiFail('You do not have access to this POS terminal', 403);
        }

        $alreadyOpen = $this->model
            ->where('register_id', $payload['register_id'])
            ->where('status', 'open')
            ->first();

        if ($alreadyOpen) {
            return $this->apiFail('This POS terminal already has an open cash session', 422);
        }

        $id = $this->model->insert([
            'register_id' => $payload['register_id'],
            'user_id' => Services::authContext()->userId,
            'opened_at' => date('Y-m-d H:i:s'),
            'opening_balance' => $payload['opening_balance'],
            'status' => 'open',
        ], true);

        return $this->created($this->model->find($id));
    }

    /** GET /api/v1/cash-sessions/{id}/movements */
    public function movements($id = null)
    {
        if (! $this->applyScope()->find($id)) {
            return $this->notFound();
        }

        return $this->ok(model(CashMovementModel::class)->where('cash_session_id', $id)->orderBy('id', 'DESC')->findAll());
    }

    /**
     * POST /api/v1/cash-sessions/{id}/movements
     * body: { type: cash_in|cash_out, amount, reason? }
     * Paid-in/paid-out against an open drawer — a petty cash withdrawal,
     * a change fund top-up, etc. Only allowed while the session is open.
     */
    public function addMovement($id = null)
    {
        $session = $this->applyScope()->find($id);

        if (! $session) {
            return $this->notFound();
        }

        if ($session->status !== 'open') {
            return $this->apiFail('Cannot record a cash movement on a closed session', 422);
        }

        $payload = $this->request->getJSON(true) ?? [];
        $movementModel = model(CashMovementModel::class);

        $movementId = $movementModel->insert([
            'cash_session_id' => (int) $id,
            'type' => $payload['type'] ?? null,
            'amount' => $payload['amount'] ?? null,
            'reason' => $payload['reason'] ?? null,
            'user_id' => Services::authContext()->userId,
        ], true);

        if ($movementId === false) {
            return $this->validationFail($movementModel->errors());
        }

        return $this->created($movementModel->find($movementId));
    }

    /**
     * GET /api/v1/cash-sessions/{id}/summary
     * A live preview of the close-out math — lets the POS show Expected
     * Cash to the cashier before they count the drawer and submit
     * Actual Cash, without actually closing the session.
     */
    public function summary($id = null)
    {
        $session = $this->applyScope()->find($id);

        if (! $session) {
            return $this->notFound();
        }

        return $this->ok($this->buildSummary($session));
    }

    /** POST /api/v1/cash-sessions/{id}/close  body: { closing_balance, notes? } */
    public function close($id = null)
    {
        $session = $this->applyScope()->find($id);

        if (! $session) {
            return $this->notFound();
        }

        if ($session->status === 'closed') {
            return $this->apiFail('Cash session is already closed', 422);
        }

        $payload = $this->request->getJSON(true) ?? [];

        if (! $this->validateData($payload, ['closing_balance' => ['label' => 'Closing balance', 'rules' => 'required|decimal']])) {
            return $this->validationFail($this->validator->getErrors());
        }

        $summary = $this->buildSummary($session);
        $expected = $summary['expected_balance'];
        $actual = (float) $payload['closing_balance'];

        $this->model->update($id, [
            'closed_at' => date('Y-m-d H:i:s'),
            'closing_balance' => $actual,
            'expected_balance' => $expected,
            'difference' => round($actual - $expected, 2),
            'status' => 'closed',
            'notes' => $payload['notes'] ?? $session->notes,
        ]);

        return $this->ok($this->model->find($id), 'Cash session closed');
    }

    /**
     * @return array{opening_balance: float, cash_sales_total: float,
     *   cash_in_total: float, cash_out_total: float, expected_balance: float}
     */
    private function buildSummary(object $session): array
    {
        $opening = (float) $session->opening_balance;
        $cashSales = $this->cashSalesTotal((int) $session->id);
        $movementModel = model(CashMovementModel::class);
        $cashIn = $movementModel->where('cash_session_id', $session->id)->where('type', CashMovementModel::TYPE_CASH_IN)->selectSum('amount')->first()->amount ?? 0;
        $cashOut = $movementModel->where('cash_session_id', $session->id)->where('type', CashMovementModel::TYPE_CASH_OUT)->selectSum('amount')->first()->amount ?? 0;

        $expected = $opening + $cashSales + (float) $cashIn - (float) $cashOut;

        return [
            'opening_balance' => round($opening, 2),
            'cash_sales_total' => round($cashSales, 2),
            'cash_in_total' => round((float) $cashIn, 2),
            'cash_out_total' => round((float) $cashOut, 2),
            'expected_balance' => round($expected, 2),
        ];
    }

    /** Sum of only the CASH portion of payments on completed sales tied to this session. */
    private function cashSalesTotal(int $cashSessionId): float
    {
        $result = model(PaymentModel::class)->builder()
            ->selectSum('payments.amount')
            ->join('sales', 'sales.id = payments.sale_id')
            ->where('sales.cash_session_id', $cashSessionId)
            ->where('sales.status', 'completed')
            ->where('payments.method', PaymentModel::METHOD_CASH)
            ->get()->getRow();

        return (float) ($result->amount ?? 0);
    }
}
