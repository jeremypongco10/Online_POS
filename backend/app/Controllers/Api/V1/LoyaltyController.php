<?php

namespace App\Controllers\Api\V1;

use App\Controllers\Api\BaseCrudController;
use App\Models\CustomerModel;
use App\Models\LoyaltyCardModel;
use CodeIgniter\Model;
use Config\Services;

class LoyaltyController extends BaseCrudController
{
    protected string $modelClass = LoyaltyCardModel::class;
    protected array $allowedFilters = ['customer_id', 'status'];
    protected array $allowedSorts = ['id', 'card_number', 'points', 'balance', 'created_at'];
    protected array $searchableFields = ['card_number'];
    protected string $defaultSort = 'id';

    /** loyalty_cards has no company_id column of its own — scope indirectly through its customer. */
    protected function applyScope(): Model
    {
        $customerIds = model(CustomerModel::class)
            ->where('company_id', Services::authContext()->companyId)
            ->findColumn('id') ?: [];

        return $this->model->whereIn('customer_id', $customerIds ?: [0]);
    }

    public function create()
    {
        $payload = $this->payload();
        $payload['issued_at'] ??= date('Y-m-d H:i:s');
        $payload['status'] ??= LoyaltyCardModel::STATUS_INACTIVE;

        $customer = ! empty($payload['customer_id']) ? model(CustomerModel::class)->find((int) $payload['customer_id']) : null;
        if (! $customer || (int) $customer->company_id !== Services::authContext()->companyId) {
            return $this->apiFail('customer_id must belong to your own company', 422);
        }

        $id = $this->model->insert($payload, true);

        if ($id === false) {
            return $this->validationFail($this->model->errors());
        }

        return $this->created($this->model->find($id));
    }

    /**
     * POS loyalty flow, step 1-4 for the MVP:
     * Scan Loyalty Card -> Validate Card -> Find Customer -> Attach Customer.
     *
     * GET /api/v1/loyalty/scan?card_number=XXXX
     * Returns the card + its customer if the card is usable, so the POS
     * can attach customer_id to the in-progress sale. No points/discount
     * engine yet — MVP just records the customer/card association (see
     * LoyaltyCardModel points/balance, reserved for that later step).
     */
    public function scan()
    {
        $cardNumber = trim((string) $this->request->getGet('card_number'));

        if ($cardNumber === '') {
            return $this->apiFail('card_number is required', 422);
        }

        $card = $this->model->findByCardNumber($cardNumber);

        if (! $card) {
            return $this->apiFail('Card not recognized', 404);
        }

        if (! $this->model->isUsable($card)) {
            $reason = match ($card->status) {
                LoyaltyCardModel::STATUS_BLOCKED => 'This card has been blocked',
                LoyaltyCardModel::STATUS_LOST => 'This card was reported lost',
                LoyaltyCardModel::STATUS_INACTIVE => 'This card has not been activated',
                default => 'This card has expired',
            };

            return $this->apiFail($reason, 422, ['status' => $card->status]);
        }

        $customer = model(CustomerModel::class)->find($card->customer_id);

        if (! $customer || (int) $customer->company_id !== Services::authContext()->companyId) {
            return $this->apiFail('Card not recognized', 404);
        }
        if (! (bool) $customer->is_active) {
            return $this->apiFail('This card\'s customer account is not active', 422);
        }

        return $this->ok([
            'card' => $card,
            'customer' => $customer,
        ], 'Card validated');
    }

    /** POST /api/v1/loyalty/{id}/activate — sets status=active and stamps activated_at once. */
    public function activate($id = null)
    {
        $card = $this->applyScope()->find($id);

        if (! $card) {
            return $this->notFound();
        }

        $this->model->update($id, [
            'status' => LoyaltyCardModel::STATUS_ACTIVE,
            'activated_at' => $card->activated_at ?? date('Y-m-d H:i:s'),
        ]);

        return $this->ok($this->model->find($id), 'Card activated');
    }

    /** POST /api/v1/loyalty/{id}/deactivate */
    public function deactivate($id = null)
    {
        return $this->setStatus($id, LoyaltyCardModel::STATUS_INACTIVE, 'Card deactivated');
    }

    /** POST /api/v1/loyalty/{id}/block */
    public function block($id = null)
    {
        return $this->setStatus($id, LoyaltyCardModel::STATUS_BLOCKED, 'Card blocked');
    }

    /** POST /api/v1/loyalty/{id}/report-lost */
    public function reportLost($id = null)
    {
        return $this->setStatus($id, LoyaltyCardModel::STATUS_LOST, 'Card reported lost');
    }

    private function setStatus($id, string $status, string $message)
    {
        if (! $this->applyScope()->find($id)) {
            return $this->notFound();
        }

        $this->model->update($id, ['status' => $status]);

        return $this->ok($this->model->find($id), $message);
    }

    /** POST /api/v1/loyalty/{id}/adjust  body: { points_delta?, balance_delta?, notes? } */
    public function adjust($id = null)
    {
        $card = $this->applyScope()->find($id);

        if (! $card) {
            return $this->notFound();
        }

        $payload = $this->request->getJSON(true) ?? [];

        $rules = [
            'points_delta' => 'permit_empty|integer',
            'balance_delta' => 'permit_empty|decimal',
        ];

        if (! $this->validateData($payload, $rules)) {
            return $this->validationFail($this->validator->getErrors());
        }

        $pointsDelta = (int) ($payload['points_delta'] ?? 0);
        $balanceDelta = (float) ($payload['balance_delta'] ?? 0);

        $this->model->update($id, [
            'points' => (int) $card->points + $pointsDelta,
            'balance' => (float) $card->balance + $balanceDelta,
        ]);

        return $this->ok($this->model->find($id), 'Loyalty card updated');
    }
}
