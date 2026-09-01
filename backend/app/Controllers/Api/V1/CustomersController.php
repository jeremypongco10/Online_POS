<?php

namespace App\Controllers\Api\V1;

use App\Controllers\Api\BaseCrudController;
use App\Models\CustomerModel;
use App\Models\LoyaltyCardModel;
use App\Models\LoyaltyPointTransactionModel;
use App\Models\UserModel;
use Config\Services;

class CustomersController extends BaseCrudController
{
    protected string $modelClass = CustomerModel::class;
    // customer_code carries a unique index (per company), so an exact-match filter on it — used by the
    // POS Customer dialog's quick-attach-by-number flow — can never return more than one row.
    protected array $allowedFilters = ['company_id', 'is_active', 'customer_code'];
    protected array $allowedSorts = ['id', 'name', 'customer_code', 'created_at'];
    protected array $searchableFields = ['name', 'customer_code', 'email', 'mobile'];
    protected string $defaultSort = 'name';

    /**
     * Every new customer gets a loyalty card issued immediately (0
     * points) so the Points column never sits in a "no card yet" state —
     * best-effort, same reasoning as StoresController::create()'s
     * auto-grant: the customer itself is already created successfully by
     * this point, so a bug here must never turn that into an error.
     */
    public function create()
    {
        $response = parent::create();
        $body = json_decode($response->getBody(), true);

        if (($body['success'] ?? false) && isset($body['data']['id'])) {
            try {
                model(LoyaltyCardModel::class)->firstOrCreateForCustomer((int) $body['data']['id']);
            } catch (\Throwable $e) {
                log_message('error', 'Failed to auto-issue loyalty card for new customer: {msg}', ['msg' => $e->getMessage()]);
            }
        }

        return $response;
    }

    public function index()
    {
        $response = parent::index();
        $body = json_decode($response->getBody(), true);

        if (($body['success'] ?? false) && is_array($body['data'] ?? null)) {
            $body['data'] = $this->attachPoints($body['data']);
            return $this->response->setJSON($body);
        }

        return $response;
    }

    public function show($id = null)
    {
        $response = parent::show($id);
        $body = json_decode($response->getBody(), true);

        if (($body['success'] ?? false) && isset($body['data'])) {
            [$decorated] = $this->attachPoints([$body['data']]);
            $body['data'] = $decorated;
            return $this->response->setJSON($body);
        }

        return $response;
    }

    /**
     * POST /api/v1/customers/{id}/points  body: { points_delta, note? }
     * Adjusts the customer's loyalty points directly from the Customers
     * page, issuing them a loyalty card on the fly if they don't already
     * have one — see LoyaltyCardModel::firstOrCreateForCustomer(). The
     * adjustment is appended to loyalty_point_transactions rather than
     * mutating a stored counter, so it immediately becomes a row the
     * points-history endpoint below returns.
     */
    public function points($id = null)
    {
        $customer = $this->applyScope()->find($id);

        if (! $customer) {
            return $this->notFound();
        }

        $payload = $this->request->getJSON(true) ?? [];

        if (! $this->validateData($payload, [
            'points_delta' => ['label' => 'Points', 'rules' => 'required|integer'],
            'note' => ['label' => 'Note', 'rules' => 'permit_empty|max_length[255]'],
        ])) {
            return $this->validationFail($this->validator->getErrors());
        }

        $card = model(LoyaltyCardModel::class)->firstOrCreateForCustomer((int) $id);

        model(LoyaltyPointTransactionModel::class)->record(
            (int) $id,
            (int) $card->id,
            (int) $payload['points_delta'],
            $payload['note'] ?? null,
            Services::authContext()->userId
        );

        Services::auditLogger()->log('points-adjust', 'Customer', (int) $id, $customer->name, [
            'points_delta' => ['old' => null, 'new' => (int) $payload['points_delta']],
            'note' => ['old' => null, 'new' => $payload['note'] ?? null],
        ]);

        [$decorated] = $this->attachPoints([(array) $customer]);

        return $this->ok($decorated, 'Points updated');
    }

    /**
     * GET /api/v1/customers/{id}/points-history — every ledger entry for
     * this customer, newest first, with the adjusting admin's name
     * attached so the table doesn't need a second round trip.
     */
    public function pointsHistory($id = null)
    {
        if (! $this->applyScope()->find($id)) {
            return $this->notFound();
        }

        $entries = model(LoyaltyPointTransactionModel::class)->historyForCustomer((int) $id);

        $userIds = array_values(array_unique(array_filter(array_map(static fn ($e) => $e->created_by, $entries))));
        $namesById = $userIds === [] ? [] : model(UserModel::class)->whereIn('id', $userIds)->findAll();
        $namesById = array_column($namesById, 'name', 'id');

        $decorated = array_map(static function ($entry) use ($namesById) {
            $entry->created_by_name = $namesById[$entry->created_by] ?? null;

            return $entry;
        }, $entries);

        return $this->ok($decorated);
    }

    /**
     * Attaches `points`/`loyalty_card_id`/`card_number` to each customer
     * row — points is the computed sum of that customer's ledger entries,
     * never a stored counter — if the caller can see loyalty data at all
     * (a role with customers.view but not loyalty.view, none exist today,
     * but the check costs nothing).
     */
    private function attachPoints(array $customers): array
    {
        if (! in_array('loyalty.view', Services::authContext()->permissions, true)) {
            return $customers;
        }

        $ids = array_map(static fn ($c) => (int) $c['id'], $customers);
        $cards = model(LoyaltyCardModel::class)->forCustomerIds($ids);
        $balances = model(LoyaltyPointTransactionModel::class)->balancesForCustomerIds($ids);

        foreach ($customers as &$customer) {
            $customerId = (int) $customer['id'];
            $card = $cards[$customerId] ?? null;
            $customer['points'] = $card ? ($balances[$customerId] ?? 0) : null;
            $customer['loyalty_card_id'] = $card->id ?? null;
            $customer['card_number'] = $card->card_number ?? null;
        }

        return $customers;
    }
}
