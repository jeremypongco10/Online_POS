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

        if (($error = $this->validateOpeningFloat(
            $payload['opening_float_mode'] ?? RegisterModel::OPENING_FLOAT_MANUAL,
            $payload['default_opening_float'] ?? null
        )) !== null) {
            return $error;
        }

        return parent::create();
    }

    public function update($id = null)
    {
        $row = $this->applyScope()->find($id);
        if ($row === null) {
            return $this->notFound();
        }

        $payload = $this->payload();

        // The effective value after this update, not just what's in the
        // request body — a PUT here can (and often does, e.g. the
        // Active/Inactive toggle) touch only one field, and a row's
        // existing opening-float configuration shouldn't fail validation
        // against itself just because this particular request never
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
     * express (see RegisterModel's own note), so it lives here instead.
     * A register set to 'fixed' or 'fixed_confirm' with no configured
     * float would have nothing for CashSessionsController::open() to
     * apply, so that combination is rejected before it can ever be saved.
     */
    private function validateOpeningFloat(string $mode, $float)
    {
        if ($mode === RegisterModel::OPENING_FLOAT_MANUAL) {
            return null;
        }

        if ($float === null || $float === '' || (float) $float <= 0) {
            return $this->apiFail('An opening float greater than zero is required when the opening float mode is not manual.', 422);
        }

        return null;
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
