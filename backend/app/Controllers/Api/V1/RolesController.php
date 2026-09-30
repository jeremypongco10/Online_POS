<?php

namespace App\Controllers\Api\V1;

use App\Controllers\Api\BaseCrudController;
use App\Models\PermissionModel;
use App\Models\RoleModel;
use App\Models\RolePermissionModel;
use CodeIgniter\Model;
use Config\Services;

class RolesController extends BaseCrudController
{
    protected string $modelClass = RoleModel::class;
    protected array $allowedFilters = ['company_id', 'is_system'];
    protected array $allowedSorts = ['id', 'name', 'created_at'];
    protected array $searchableFields = ['name', 'description'];
    protected string $defaultSort = 'name';

    /**
     * Dev Admin (a Custom role built with Super Admin's exact permission
     * set, for dev/test administration — see UsersController::
     * TOP_LEVEL_ROLE_NAMES) is never shown to anyone who isn't themselves
     * logged in as Dev Admin — not in the Roles list, not by id, not in
     * its own permission set. It's meant to be discovered by whoever set
     * it up, not encountered by an ordinary Company/Store Admin browsing
     * Team → Roles.
     */
    protected function applyScope(): Model
    {
        $query = $this->model->where('company_id', Services::authContext()->companyId);

        if ($this->callerRoleName() !== 'Dev Admin') {
            $query->where('name !=', 'Dev Admin');
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
     * DELETE /api/v1/roles/{id}
     *
     * Two things are protected here, neither of which the base delete()
     * knew about: a System role (is_system) was already hidden from the
     * frontend's own Delete button, but nothing stopped a direct API call
     * from removing Super Admin, Cashier, or any other one outright — a
     * real gap, closed here rather than left as a UI-only restriction.
     * Dev Admin is the second case: it's a Custom role by design (so it
     * stays freely editable), but it's this system's one guaranteed
     * dev/test way in, so it's carved out by name the same way its
     * visibility already is (see applyScope() above).
     */
    public function delete($id = null)
    {
        $role = $this->applyScope()->find($id);
        if (! $role) {
            return $this->notFound();
        }

        if ((int) $role->is_system === 1) {
            return $this->apiFail('System roles cannot be deleted.', 422);
        }

        if ($role->name === 'Dev Admin') {
            return $this->apiFail('The Dev Admin role cannot be deleted.', 422);
        }

        return parent::delete($id);
    }

    /** GET /api/v1/roles/{id}/permissions */
    public function permissions($id = null)
    {
        $roleModel = model(RoleModel::class);
        $role = $this->applyScope()->find($id);

        if (! $role) {
            return $this->notFound();
        }

        return $this->ok($roleModel->permissionSlugs((int) $id));
    }

    /** PUT /api/v1/roles/{id}/permissions  body: { "permissions": ["products.view", ...] } */
    public function syncPermissions($id = null)
    {
        $roleModel = model(RoleModel::class);
        $role = $this->applyScope()->find($id);

        if (! $role) {
            return $this->notFound();
        }

        $payload = $this->request->getJSON(true) ?? [];
        $slugs = $payload['permissions'] ?? null;

        if (! is_array($slugs)) {
            return $this->apiFail('permissions must be an array of slugs', 422);
        }

        // whereIn() with an empty array builds `IN ()`, which is invalid
        // SQL — and an empty list is a legitimate request here (stripping
        // every permission from a role), so it has to be short-circuited
        // rather than handed to the query builder.
        $permissionModel = model(PermissionModel::class);
        $permissions = $slugs === [] ? [] : $permissionModel->whereIn('slug', $slugs)->findAll();
        $foundSlugs = array_map(static fn ($p) => $p->slug, $permissions);
        $unknown = array_diff($slugs, $foundSlugs);

        if ($unknown !== []) {
            return $this->apiFail('Unknown permission slug(s): ' . implode(', ', $unknown), 422);
        }

        $pivot = model(RolePermissionModel::class);
        $pivot->where('role_id', $id)->delete();

        foreach ($permissions as $permission) {
            $pivot->insert(['role_id' => $id, 'permission_id' => $permission->id]);
        }

        return $this->ok($roleModel->permissionSlugs((int) $id), 'Permissions updated');
    }
}
