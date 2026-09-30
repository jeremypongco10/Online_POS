<?php

namespace App\Controllers\Api\V1;

use App\Controllers\Api\BaseCrudController;
use App\Models\StoreModel;
use App\Models\UserStoreModel;
use Config\Services;

class StoresController extends BaseCrudController
{
    protected string $modelClass = StoreModel::class;
    protected array $allowedFilters = ['company_id', 'is_active'];
    protected array $allowedSorts = ['id', 'name', 'code', 'created_at'];
    protected array $searchableFields = ['name', 'code', 'email'];
    protected string $defaultSort = 'name';

    /**
     * A store-restricted user (one with rows in user_stores) sees only
     * their own assigned stores here, not every store in the company —
     * this table's own primary key IS "the store" being scoped.
     */
    protected ?string $storeColumn = 'id';

    /**
     * POST /api/v1/stores — beyond the generic create, every Super Admin
     * who is currently store-restricted gets the new store added to their
     * own Store Access automatically (see
     * UserStoreModel::grantToRestrictedUsersWithRole() for why only
     * already-restricted ones are touched), and an "opening float
     * required unless manual" check applies here too (see this class's
     * own validateOpeningFloat() — every register in the store uses this
     * setting unconditionally, see AddOpeningFloatToStores).
     */
    public function create()
    {
        $payload = $this->payload();
        if (($error = $this->validateOpeningFloat(
            $payload['opening_float_mode'] ?? StoreModel::OPENING_FLOAT_MANUAL,
            $payload['default_opening_float'] ?? null
        )) !== null) {
            return $error;
        }

        $response = parent::create();
        $body = json_decode($response->getBody(), true);

        if (($body['success'] ?? false) && isset($body['data']['id'])) {
            // Best-effort: the store itself was already created successfully
            // by this point, so a bug in this auxiliary step must never turn
            // an otherwise-successful response into an error the caller
            // would wrongly retry against.
            try {
                model(UserStoreModel::class)->grantToRestrictedUsersWithRole(
                    (int) $body['data']['id'],
                    Services::authContext()->companyId,
                    'Super Admin'
                );
            } catch (\Throwable $e) {
                log_message('error', 'Failed to auto-grant new store to restricted Super Admins: {msg}', ['msg' => $e->getMessage()]);
            }
        }

        return $response;
    }

    public function update($id = null)
    {
        $row = $this->applyScope()->find($id);
        if ($row === null) {
            return $this->notFound();
        }

        $payload = $this->payload();

        // The effective value after this update, not just what's in the
        // request body — a PUT that only touches, say, is_active
        // shouldn't fail validation against a store's own already-saved
        // opening float configuration just because this request never
        // mentions it.
        $mode = array_key_exists('opening_float_mode', $payload) ? $payload['opening_float_mode'] : $row->opening_float_mode;
        $float = array_key_exists('default_opening_float', $payload) ? $payload['default_opening_float'] : $row->default_opening_float;

        if (($error = $this->validateOpeningFloat($mode, $float)) !== null) {
            return $error;
        }

        return parent::update($id);
    }

    /**
     * "Required only when the mode actually needs it" — the one rule a
     * single-column validation rule on `default_opening_float` can't
     * express, so it lives here instead. A store set to 'fixed' or
     * 'fixed_confirm' with no configured float would leave every one of
     * its registers with nothing for CashSessionsController::open() to
     * apply, so that combination is rejected before it can ever be saved.
     */
    private function validateOpeningFloat(string $mode, $float)
    {
        if ($mode === StoreModel::OPENING_FLOAT_MANUAL) {
            return null;
        }

        if ($float === null || $float === '' || (float) $float <= 0) {
            return $this->apiFail('An opening float greater than zero is required when the opening float mode is not manual.', 422);
        }

        return null;
    }

    /** GET /api/v1/stores/{id}/users — users with access to this store. */
    public function users($id = null)
    {
        if (! $this->applyScope()->find($id)) {
            return $this->notFound();
        }

        return $this->ok(model(UserStoreModel::class)->usersForStore((int) $id));
    }

    /**
     * GET /api/v1/stores/{id}/baggers
     * What the POS shows when picking a bagger for a sale: active
     * employees with the Bagger role, assigned to this specific store.
     */
    public function baggers($id = null)
    {
        if (! $this->applyScope()->find($id)) {
            return $this->notFound();
        }

        return $this->ok(model(UserStoreModel::class)->activeBaggersForStore((int) $id));
    }
}
