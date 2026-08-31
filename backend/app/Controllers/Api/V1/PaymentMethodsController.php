<?php

namespace App\Controllers\Api\V1;

use App\Controllers\Api\BaseCrudController;
use App\Models\PaymentMethodModel;
use Config\Services;

/**
 * /api/v1/payment-methods — the per-company list PaymentPanel.tsx (POS
 * checkout) and the Payment Methods settings tab both read from. `code`
 * (not the row id) is what SalesController actually validates and stores
 * on payments.method — kept as a plain string, not a foreign key, so
 * renaming or removing a method here can never cascade into historical
 * payment rows. It's derived here from `name` rather than ever accepted
 * from the client (see uniqueCode()), and never changes after creation.
 */
class PaymentMethodsController extends BaseCrudController
{
    protected string $modelClass = PaymentMethodModel::class;
    protected array $allowedFilters = ['is_active'];
    protected array $allowedSorts = ['id', 'name', 'created_at'];
    protected array $searchableFields = ['name'];
    protected string $defaultSort = 'name';

    /**
     * CashSessionsController's drawer reconciliation sums
     * payments.amount WHERE method = 'cash' to compute expected cash at
     * close-out — deactivating or deleting this specific code wouldn't
     * corrupt any data, but it would silently zero out that math for
     * every store in the company, the kind of failure nobody notices
     * until end-of-day. Blocked here rather than left to a support ticket.
     */
    private const PROTECTED_CODE = 'cash';

    public function create()
    {
        $payload = $this->payload();
        $name = trim((string) ($payload['name'] ?? ''));

        if ($name === '') {
            return $this->validationFail(['name' => 'The Name field is required.']);
        }

        $payload['code'] = $this->uniqueCode(Services::authContext()->companyId, $name);
        $this->request->setBody(json_encode($payload));

        return parent::create();
    }

    public function update($id = null)
    {
        $row = $this->applyScope()->find($id);
        if ($row === null) {
            return $this->notFound();
        }

        $payload = $this->payload();
        // A client-supplied code is silently ignored rather than
        // rejected — it's an internal identifier the UI never shows as
        // an editable field, so there's nothing legitimate for a real
        // client to be sending here.
        unset($payload['code']);

        if ($row->code === self::PROTECTED_CODE && array_key_exists('is_active', $payload) && (int) $payload['is_active'] === 0) {
            return $this->apiFail("Cash can't be deactivated — cash-drawer reconciliation depends on it.", 422);
        }

        $this->request->setBody(json_encode($payload));

        return parent::update($id);
    }

    public function delete($id = null)
    {
        $row = $this->applyScope()->find($id);
        if ($row === null) {
            return $this->notFound();
        }

        if ($row->code === self::PROTECTED_CODE) {
            return $this->apiFail("Cash can't be deleted — cash-drawer reconciliation depends on it.", 422);
        }

        return parent::delete($id);
    }

    /** `name` -> a column-safe slug, deduped against this company's existing codes (WIDGET, widget -> widget, then widget_2, ...). */
    private function uniqueCode(int $companyId, string $name): string
    {
        $base = strtolower(trim((string) preg_replace('/[^a-zA-Z0-9]+/', '_', $name), '_'));
        if ($base === '') {
            $base = 'method';
        }

        $model = model(PaymentMethodModel::class);
        $code = $base;
        $suffix = 2;
        while ($model->where('company_id', $companyId)->where('code', $code)->first() !== null) {
            $code = $base . '_' . $suffix;
            $suffix++;
        }

        return $code;
    }
}
