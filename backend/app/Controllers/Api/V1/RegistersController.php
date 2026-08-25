<?php

namespace App\Controllers\Api\V1;

use App\Controllers\Api\BaseCrudController;
use App\Models\RegisterModel;
use App\Models\StoreModel;
use CodeIgniter\Model;
use Config\Services;

class RegistersController extends BaseCrudController
{
    protected string $modelClass = RegisterModel::class;
    protected array $allowedFilters = ['store_id', 'is_active'];
    protected array $allowedSorts = ['id', 'name', 'code', 'created_at'];
    protected array $searchableFields = ['name', 'code'];
    protected string $defaultSort = 'name';

    /** registers has no company_id column of its own — scope indirectly through store_id. */
    protected function applyScope(): Model
    {
        return $this->scopeByStoreIds('store_id');
    }

    public function create()
    {
        $payload = $this->payload();
        $auth = Services::authContext();
        $store = ! empty($payload['store_id']) ? model(StoreModel::class)->find((int) $payload['store_id']) : null;

        if (! $store || (int) $store->company_id !== $auth->companyId || ! $auth->canAccessStore($store->id)) {
            return $this->apiFail('store_id must be one of your own company\'s stores', 422);
        }

        return parent::create();
    }

    /**
     * GET /api/v1/registers/stores/assignable — the stores this caller can
     * pick from when filtering or creating a register. Gated by
     * registers.view rather than stores.view, since a role can manage
     * registers without being able to browse the Stores list.
     */
    public function assignableStores()
    {
        $auth = Services::authContext();
        $query = model(StoreModel::class)->where('company_id', $auth->companyId);

        if ($auth->allowedStoreIds !== null) {
            $query->whereIn('id', $auth->allowedStoreIds ?: [0]);
        }

        return $this->ok($query->orderBy('name')->findAll());
    }
}
