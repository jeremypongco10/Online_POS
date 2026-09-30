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

    public function index()
    {
        $result = $this->listResource($this->applyScope(), $this->allowedFilters, $this->allowedSorts, $this->searchableFields, $this->defaultSort);

        return $this->ok($this->withEffectiveOpeningFloat($result['data']), '', $result['meta']);
    }

    public function show($id = null)
    {
        $row = $this->applyScope()->find($id);
        if ($row === null) {
            return $this->notFound();
        }

        $this->withEffectiveOpeningFloat([$row]);

        return $this->ok($row);
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
     * Adds effective_opening_float_mode/effective_opening_float to every
     * row — a register carries no opening-float configuration of its own
     * (see DropOpeningFloatFromRegisters); these are always its own
     * store's settings (RegisterModel::resolveOpeningFloat()), added here
     * purely so the POS's own register picker (see PosScreen/
     * OpenRegisterScreen) doesn't have to make a second request just to
     * find out how a register it's about to open actually starts.
     */
    private function withEffectiveOpeningFloat(array $rows): array
    {
        $model = model(RegisterModel::class);
        foreach ($rows as $row) {
            [$mode, $float] = $model->resolveOpeningFloat($row);
            $row->effective_opening_float_mode = $mode;
            $row->effective_opening_float = $float;
        }

        return $rows;
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
