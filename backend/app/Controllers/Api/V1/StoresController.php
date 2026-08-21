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
     * already-restricted ones are touched).
     */
    public function create()
    {
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
