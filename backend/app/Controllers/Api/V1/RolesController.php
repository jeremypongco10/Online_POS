<?php

namespace App\Controllers\Api\V1;

use App\Controllers\Api\BaseCrudController;
use App\Models\PermissionModel;
use App\Models\RoleModel;
use App\Models\RolePermissionModel;

class RolesController extends BaseCrudController
{
    protected string $modelClass = RoleModel::class;
    protected array $allowedFilters = ['company_id', 'is_system'];
    protected array $allowedSorts = ['id', 'name', 'created_at'];
    protected array $searchableFields = ['name', 'description'];
    protected string $defaultSort = 'name';

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
