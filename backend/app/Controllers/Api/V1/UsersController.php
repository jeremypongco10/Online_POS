<?php

namespace App\Controllers\Api\V1;

use App\Controllers\Api\BaseCrudController;
use App\Models\RoleModel;
use App\Models\StoreModel;
use App\Models\UserModel;
use App\Models\UserStoreModel;
use CodeIgniter\Model;
use Config\Services;

class UsersController extends BaseCrudController
{
    protected string $modelClass = UserModel::class;
    protected array $allowedFilters = ['company_id', 'role_id', 'is_active'];
    protected array $allowedSorts = ['id', 'name', 'email', 'created_at'];
    protected array $searchableFields = ['name', 'email', 'username'];
    protected string $defaultSort = 'name';

    /**
     * Users Maintenance (and every other user-scoped action here — role
     * assignment, activate/deactivate, password reset, etc.) is narrowed
     * to teammates the caller shares a store with, once the caller
     * themselves is store-restricted. An unrestricted caller (Company
     * Admin, or a Store Admin with no Store Access rows) still sees
     * everyone, exactly as before — this only kicks in once the caller
     * has explicit store rows of their own.
     *
     * Separately, anyone who isn't a Super Admin themselves never sees
     * Super Admin accounts here at all — a Store Admin/Manager shouldn't
     * be able to view, deactivate, or reset the password of the company's
     * top-level admins just because users.update happens to be on their
     * role.
     */
    protected function applyScope(): Model
    {
        $auth = Services::authContext();
        $query = $this->model->where('company_id', $auth->companyId);

        if ($auth->allowedStoreIds !== null) {
            $companyUserIds = model(UserModel::class)->where('company_id', $auth->companyId)->findColumn('id') ?: [];
            $visibleIds = model(UserStoreModel::class)->idsVisibleTo($companyUserIds, $auth->allowedStoreIds);
            $query->whereIn('id', $visibleIds ?: [0]);
        }

        if ($this->callerRoleName() !== 'Super Admin') {
            $superAdminRoleId = model(RoleModel::class)
                ->where('company_id', $auth->companyId)
                ->where('name', 'Super Admin')
                ->first();

            if ($superAdminRoleId !== null) {
                $query->groupStart()
                    ->where('role_id !=', $superAdminRoleId->id)
                    ->orWhere('role_id', null)
                    ->groupEnd();
            }
        }

        return $query;
    }

    private function callerRoleName(): ?string
    {
        $roleId = Services::authContext()->roleId;

        if ($roleId === null) {
            return null;
        }

        $role = model(RoleModel::class)->find($roleId);

        return $role !== null ? $role->name : null;
    }

    /**
     * Only a Super Admin may hand out the Super Admin role — otherwise a
     * Store Admin/Manager holding users.update could silently promote
     * someone past what the Users Maintenance UI even shows them exists
     * (it already hides both the users and the role option for anyone
     * who isn't a Super Admin themselves; this is the server-side half
     * of that, so it can't be bypassed with a crafted request).
     */
    private function roleAssignmentAllowed(?int $roleId): bool
    {
        if ($roleId === null) {
            return true;
        }

        $role = model(RoleModel::class)->find($roleId);

        return $role === null || $role->name !== 'Super Admin' || $this->callerRoleName() === 'Super Admin';
    }

    /**
     * These role names all mean "assigned to work at one specific store"
     * — a Store Admin, Cashier, or Cashier Supervisor left unassigned
     * (unrestricted, i.e. every store) or assigned to several contradicts
     * what the role is for, so every path that sets a user's role or
     * store access enforces exactly one store whenever this is true for
     * the role in question.
     */
    private const SINGLE_STORE_ROLES = ['Store Admin', 'Cashier', 'Cashier Supervisor'];

    private function roleRequiresExactlyOneStore(?int $roleId): bool
    {
        if ($roleId === null) {
            return false;
        }

        $role = model(RoleModel::class)->find($roleId);

        return $role !== null && in_array($role->name, self::SINGLE_STORE_ROLES, true);
    }

    /** POST /api/v1/users — a password is mandatory when creating an account (optional on update). */
    public function create()
    {
        $payload = $this->request->getJSON(true) ?? [];

        if (empty($payload['password'])) {
            return $this->validationFail(['password' => 'The password field is required.']);
        }
        if (strlen((string) $payload['password']) < 8) {
            return $this->validationFail(['password' => 'Password must be at least 8 characters.']);
        }

        if (! $this->roleIdIsOwnCompany($payload['role_id'] ?? null)) {
            return $this->apiFail('role_id must belong to your own company', 422);
        }

        $roleId = isset($payload['role_id']) ? (int) $payload['role_id'] : null;

        if (! $this->roleAssignmentAllowed($roleId)) {
            return $this->apiFail('Only a Super Admin can assign the Super Admin role', 403);
        }

        // A single-store role's one store is required up front rather than
        // left to a follow-up Store Access edit — the account would
        // otherwise sit unrestricted (i.e. every store) between creation
        // and that second step, which is exactly the state these roles
        // must never be in.
        $singleStoreId = null;
        if ($this->roleRequiresExactlyOneStore($roleId)) {
            $singleStoreId = ! empty($payload['store_id']) ? (int) $payload['store_id'] : null;
            if ($singleStoreId === null) {
                return $this->validationFail(['store_id' => 'This role must be assigned to exactly one store.']);
            }

            $auth = Services::authContext();
            $store = model(StoreModel::class)->where('company_id', $auth->companyId)->find($singleStoreId);
            if ($store === null) {
                return $this->apiFail('store_id does not exist', 422);
            }
            if (! $auth->canAccessStore($singleStoreId)) {
                return $this->apiFail('You do not have access to this store', 403);
            }
        }

        $response = parent::create();
        $this->stripPasswordHash($response);

        $body = json_decode($response->getBody(), true);
        if (($body['success'] ?? false) && isset($body['data']['id'])) {
            $newUserId = (int) $body['data']['id'];

            if ($singleStoreId !== null) {
                try {
                    model(UserStoreModel::class)->syncForUser($newUserId, [$singleStoreId], $singleStoreId);
                } catch (\Throwable $e) {
                    log_message('error', 'Failed to assign new user\'s single store: {msg}', ['msg' => $e->getMessage()]);
                }
            } else {
                $this->defaultNewUserToCallersOnlyStore($newUserId);
            }
        }

        return $response;
    }

    /**
     * If the caller themselves is restricted to exactly one store, a
     * brand-new user they create almost certainly belongs there too —
     * defaulting it saves the extra Manage > Store Access step for the
     * common single-store-admin case. Left alone when the caller is
     * unrestricted or has several stores, since there's no one obvious
     * default to pick. Best-effort: the user itself is already created
     * by this point, so a failure here must never turn that into an
     * error response.
     */
    private function defaultNewUserToCallersOnlyStore(int $newUserId): void
    {
        $allowedStoreIds = Services::authContext()->allowedStoreIds;

        if ($allowedStoreIds === null || count($allowedStoreIds) !== 1) {
            return;
        }

        try {
            model(UserStoreModel::class)->syncForUser($newUserId, $allowedStoreIds, $allowedStoreIds[0]);
        } catch (\Throwable $e) {
            log_message('error', 'Failed to default new user to creator\'s only store: {msg}', ['msg' => $e->getMessage()]);
        }
    }

    private function roleIdIsOwnCompany($roleId): bool
    {
        if ($roleId === null) {
            return true;
        }

        $role = model(RoleModel::class)->find((int) $roleId);

        return $role !== null && (int) $role->company_id === Services::authContext()->companyId;
    }

    /**
     * PUT /api/v1/users/{id}/role  body: { "role_id": 3 }
     * A thin, auditable wrapper around the generic update() for the one
     * field that determines a user's permissions.
     */
    public function assignRole($id = null)
    {
        $user = $this->applyScope()->find($id);

        if (! $user) {
            return $this->notFound();
        }

        $payload = $this->request->getJSON(true) ?? [];
        $roleId = $payload['role_id'] ?? null;

        if ($roleId !== null) {
            $role = model(RoleModel::class)->find((int) $roleId);
            if (! $role || (int) $role->company_id !== (int) $user->company_id) {
                return $this->apiFail('role_id must belong to the user\'s company', 422);
            }
        }

        if (! $this->roleAssignmentAllowed($roleId !== null ? (int) $roleId : null)) {
            return $this->apiFail('Only a Super Admin can assign the Super Admin role', 403);
        }

        if ($this->roleRequiresExactlyOneStore($roleId !== null ? (int) $roleId : null) && ! $this->userHasExactlyOneStore((int) $id)) {
            return $this->apiFail(
                'This user must be assigned to exactly one store before they can be given this role — set that under Store Access first.',
                422
            );
        }

        $this->model->update($id, ['role_id' => $roleId]);

        $response = $this->ok($this->model->find($id), 'Role updated');
        $this->stripPasswordHash($response);

        return $response;
    }

    /** Whether a user (already saved, not a pending create) currently has access to exactly one store. */
    private function userHasExactlyOneStore(int $userId): bool
    {
        return model(UserStoreModel::class)->where('user_id', $userId)->countAllResults() === 1;
    }

    /**
     * POST /api/v1/users/{id}/reset-password
     * body: { "new_password"?: string }
     * Admin-initiated reset. If new_password is omitted, a random
     * temporary password is generated and returned once in the response
     * (share it out of band) — it cannot be retrieved again afterwards.
     * Invalidates every session the user currently holds (see
     * password_changed_at handling in UserModel/JwtAuthFilter).
     */
    public function resetPassword($id = null)
    {
        if (! $this->applyScope()->find($id)) {
            return $this->notFound();
        }

        $payload = $this->request->getJSON(true) ?? [];
        $newPassword = $payload['new_password'] ?? null;
        $generated = false;

        if ($newPassword === null) {
            $newPassword = $this->generateTempPassword();
            $generated = true;
        } elseif (strlen((string) $newPassword) < 8) {
            return $this->validationFail(['new_password' => 'Must be at least 8 characters.']);
        }

        $this->model->update($id, ['password' => $newPassword]);

        $data = ['user' => $this->model->find($id)];
        if ($generated) {
            $data['temporary_password'] = $newPassword;
        }

        $response = $this->ok($data, 'Password reset. All existing sessions for this user have been invalidated.');
        $body = json_decode($response->getBody(), true);
        unset($body['data']['user']['password_hash']);
        $response->setJSON($body);

        return $response;
    }

    private function generateTempPassword(): string
    {
        return substr(str_shuffle('abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789!@#$%'), 0, 12);
    }

    /**
     * GET /api/v1/users/stores/assignable
     * The stores the caller can hand out via Store Access: their own
     * allowed stores if they're store-restricted, or every company store
     * if they're unrestricted. Deliberately scoped to the caller's own
     * reach rather than reusing StoresController::index (which requires
     * stores.view, a permission this screen has no other reason to
     * need) — and a store-restricted admin shouldn't be able to grant
     * someone else access to a store the admin can't operate in
     * themselves.
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

    /** GET /api/v1/users/{id}/stores — the stores this user has access to. */
    public function stores($id = null)
    {
        if (! $this->applyScope()->find($id)) {
            return $this->notFound();
        }

        return $this->ok(model(UserStoreModel::class)->storesForUser((int) $id));
    }

    /**
     * PUT /api/v1/users/{id}/stores
     * body: { "store_ids": [1,2,3], "default_store_id"?: 1 }
     * Replaces the user's store access wholesale — e.g. a user who
     * belongs to Store A, B and C, or a cashier scoped to Store A only.
     */
    public function syncStores($id = null)
    {
        $user = $this->applyScope()->find($id);

        if (! $user) {
            return $this->notFound();
        }

        $payload = $this->request->getJSON(true) ?? [];
        $storeIds = $payload['store_ids'] ?? null;

        if (! is_array($storeIds)) {
            return $this->apiFail('store_ids must be an array', 422);
        }

        $storeIds = array_values(array_unique(array_map('intval', $storeIds)));
        $defaultStoreId = isset($payload['default_store_id']) ? (int) $payload['default_store_id'] : null;

        if ($defaultStoreId !== null && ! in_array($defaultStoreId, $storeIds, true)) {
            return $this->apiFail('default_store_id must be one of store_ids', 422);
        }

        if ($storeIds !== []) {
            $storeModel = model(StoreModel::class);
            $found = $storeModel->whereIn('id', $storeIds)->where('company_id', $user->company_id)->findAll();
            if (count($found) !== count($storeIds)) {
                return $this->apiFail('One or more store_ids are invalid for this user\'s company', 422);
            }
        }

        if ($this->roleRequiresExactlyOneStore($user->role_id !== null ? (int) $user->role_id : null) && count($storeIds) !== 1) {
            return $this->apiFail('This role must be assigned to exactly one store.', 422);
        }

        model(UserStoreModel::class)->syncForUser((int) $id, $storeIds, $defaultStoreId);

        return $this->ok(model(UserStoreModel::class)->storesForUser((int) $id), 'Store access updated');
    }

    /**
     * POST /api/v1/users/{id}/deactivate
     *
     * JwtAuthFilter re-checks is_active from the DB on every authenticated
     * request, so flipping this flag alone immediately blocks the user —
     * even mid-lifetime on an otherwise still-valid, unexpired access token.
     */
    public function deactivate($id = null)
    {
        if (! $this->applyScope()->find($id)) {
            return $this->notFound();
        }

        $this->model->update($id, ['is_active' => 0]);

        $response = $this->ok($this->model->find($id), 'Account deactivated');
        $this->stripPasswordHash($response);

        return $response;
    }

    /** POST /api/v1/users/{id}/activate */
    public function activate($id = null)
    {
        $user = $this->applyScope()->find($id);

        if (! $user) {
            return $this->notFound();
        }

        $this->model->update($id, ['is_active' => 1]);
        $this->model->clearLoginLock((int) $id);

        $response = $this->ok($this->model->find($id), 'Account activated');
        $this->stripPasswordHash($response);

        return $response;
    }

    public function index()
    {
        $response = parent::index();
        $this->stripPasswordHash($response);

        return $response;
    }

    public function show($id = null)
    {
        $response = parent::show($id);
        $this->stripPasswordHash($response);

        return $response;
    }

    /**
     * PUT /api/v1/users/{id} carries role_id in $allowedFields (needed
     * so PUT /users/{id}/role above can reuse the same write path), but
     * the generic update() has no field-specific checks — without this,
     * anyone holding users.update could set an arbitrary role_id and
     * bypass assignRole()'s same-company check entirely.
     */
    public function update($id = null)
    {
        $payload = $this->payload();

        if (array_key_exists('role_id', $payload) && ! $this->roleIdIsOwnCompany($payload['role_id'])) {
            return $this->apiFail('role_id must belong to your own company', 422);
        }

        if (array_key_exists('role_id', $payload) && ! $this->roleAssignmentAllowed($payload['role_id'] !== null ? (int) $payload['role_id'] : null)) {
            return $this->apiFail('Only a Super Admin can assign the Super Admin role', 403);
        }

        if (
            array_key_exists('role_id', $payload)
            && $this->roleRequiresExactlyOneStore($payload['role_id'] !== null ? (int) $payload['role_id'] : null)
            && ! $this->userHasExactlyOneStore((int) $id)
        ) {
            return $this->apiFail(
                'This user must be assigned to exactly one store before they can be given this role — set that under Store Access first.',
                422
            );
        }

        $response = parent::update($id);
        $this->stripPasswordHash($response);

        return $response;
    }

    private function stripPasswordHash($response): void
    {
        $body = json_decode($response->getBody(), true);

        if (! isset($body['data'])) {
            return;
        }

        if (is_array($body['data']) && array_is_list($body['data'])) {
            foreach ($body['data'] as &$row) {
                unset($row['password_hash']);
            }
        } else {
            unset($body['data']['password_hash']);
        }

        $response->setJSON($body);
    }
}
