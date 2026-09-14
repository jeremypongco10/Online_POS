<?php

namespace App\Controllers\Api\V1;

use App\Controllers\Api\BaseCrudController;
use App\Models\InvoiceSeriesModel;
use Config\Services;

/**
 * /api/v1/invoice-series — the Sales Invoice Configuration module's own
 * CRUD, plus the two lifecycle actions (activate/deactivate) a plain
 * update() can't safely express because they carry the "no overlapping
 * active series" rule (spec §13) and their own named audit actions
 * (spec §11: "Series activated"/"Series deactivated", not a generic
 * "update").
 *
 * Actual number generation (nextNumber()) lives on InvoiceSeriesModel
 * and is called from SalesController::create() directly — this
 * controller is configuration only, exactly as spec §10 requires
 * ("changing an invoice series must be an administrative action").
 */
class InvoiceSeriesController extends BaseCrudController
{
    protected string $modelClass = InvoiceSeriesModel::class;
    protected array $allowedFilters = ['store_id', 'invoice_type', 'status'];
    protected array $allowedSorts = ['id', 'series_code', 'effective_from', 'current_number', 'created_at'];
    protected array $searchableFields = ['series_code', 'invoice_type', 'prefix'];
    protected string $defaultSort = '-created_at';
    // A store-restricted user only sees their own branches' series — same
    // mechanism PurchasesController/SalesController already use for the
    // same reason.
    protected ?string $storeColumn = 'store_id';

    /**
     * created_by/updated_by are never trusted from the request body —
     * same reasoning BaseCrudController already applies to company_id.
     * Both get stamped on every write so an edit always shows who most
     * recently touched a series, on top of the full field-level diff the
     * audit log already carries.
     */
    protected function payload(): array
    {
        $payload = parent::payload();
        $userId = Services::authContext()->userId;

        $payload['created_by'] ??= $userId;
        $payload['updated_by'] = $userId;

        return $payload;
    }

    public function create()
    {
        $payload = $this->payload();
        $payload['company_id'] = Services::authContext()->companyId;

        $errors = $this->businessRuleErrors($payload);
        if ($errors !== []) {
            return $this->validationFail($errors);
        }

        return parent::create();
    }

    public function update($id = null)
    {
        $before = $this->applyScope()->find($id);
        if ($before === null) {
            return $this->notFound();
        }

        // Merged with the existing row so a partial edit (e.g. just
        // flipping `status`) is validated against its real resulting
        // state, not just whichever fields happened to be submitted.
        $merged = array_merge((array) $before, $this->payload());
        $merged['company_id'] = Services::authContext()->companyId;

        $errors = $this->businessRuleErrors($merged, (int) $id);
        if ($errors !== []) {
            return $this->validationFail($errors);
        }

        return parent::update($id);
    }

    /**
     * Series are never deleted — spec §6/§10: "keep the old series for
     * historical reporting and audit purposes." A retired series is
     * deactivated, not removed.
     */
    public function delete($id = null)
    {
        return $this->apiFail('Invoice series cannot be deleted. Deactivate it instead.', 405);
    }

    /**
     * POST /invoice-series/{id}/activate
     * Refuses when another series already holds `status = 'active'` for
     * the same (store, invoice_type) — spec §13's overlap rule, checked
     * here too since a cashier-adjacent admin activating an old series
     * back on top of a currently-active one is exactly the mistake this
     * rule exists to catch.
     */
    public function activate($id = null)
    {
        $row = $this->applyScope()->find($id);
        if ($row === null) {
            return $this->notFound();
        }

        if ($row->status === 'exhausted') {
            return $this->apiFail('An exhausted series cannot be reactivated. Configure a new series instead.', 422);
        }

        $model = model(InvoiceSeriesModel::class);
        if ($model->hasOverlappingActive((int) $row->company_id, (int) $row->store_id, $row->invoice_type, (int) $id)) {
            return $this->apiFail(
                "Another series is already active for this branch and invoice type ({$row->invoice_type}). Deactivate it first.",
                422
            );
        }

        $model->update($id, ['status' => 'active', 'updated_by' => Services::authContext()->userId]);
        $after = $model->find($id);
        Services::auditLogger()->log('activate', 'Invoice Series', (int) $id, $this->auditLabel($after), ['status' => ['old' => $row->status, 'new' => 'active']]);

        return $this->ok($after, 'Series activated');
    }

    /** POST /invoice-series/{id}/deactivate — no overlap check needed; turning a series off can never conflict with anything. */
    public function deactivate($id = null)
    {
        $row = $this->applyScope()->find($id);
        if ($row === null) {
            return $this->notFound();
        }

        if ($row->status === 'exhausted') {
            return $this->apiFail('An exhausted series is already retired.', 422);
        }

        $model = model(InvoiceSeriesModel::class);
        $model->update($id, ['status' => 'inactive', 'updated_by' => Services::authContext()->userId]);
        $after = $model->find($id);
        Services::auditLogger()->log('deactivate', 'Invoice Series', (int) $id, $this->auditLabel($after), ['status' => ['old' => $row->status, 'new' => 'inactive']]);

        return $this->ok($after, 'Series deactivated');
    }

    /**
     * Combines the model's own cross-field checks (validateBusinessRules
     * — starting/current/maximum ordering, number_length, date range)
     * with the overlap rule, which needs a DB lookup the model method
     * itself deliberately doesn't do (so it stays a pure function callers
     * can test without a live "other rows" fixture). Returns a field =>
     * message map in the same shape validationFail() already expects.
     */
    private function businessRuleErrors(array $merged, ?int $excludeId = null): array
    {
        $model = model(InvoiceSeriesModel::class);
        $errors = $model->validateBusinessRules($merged);

        $status = $merged['status'] ?? 'inactive';
        if ($status === 'active'
            && isset($merged['company_id'], $merged['store_id'], $merged['invoice_type'])
            && $model->hasOverlappingActive((int) $merged['company_id'], (int) $merged['store_id'], (string) $merged['invoice_type'], $excludeId)
        ) {
            $errors['status'] = "Another series is already active for this branch and invoice type ({$merged['invoice_type']}). Deactivate it first.";
        }

        return $errors;
    }
}
