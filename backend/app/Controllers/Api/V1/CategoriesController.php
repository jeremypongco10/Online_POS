<?php

namespace App\Controllers\Api\V1;

use App\Controllers\Api\BaseCrudController;
use App\Models\CategoryModel;
use App\Models\RoleModel;
use Config\Services;

class CategoriesController extends BaseCrudController
{
    protected string $modelClass = CategoryModel::class;
    protected array $allowedFilters = ['company_id', 'parent_id', 'is_active'];
    protected array $allowedSorts = ['id', 'name', 'created_at'];
    protected array $searchableFields = ['name', 'description'];
    protected string $defaultSort = 'name';

    /** GET /api/v1/categories/tree — full parent/child hierarchy for the caller's own company. */
    public function tree()
    {
        return $this->ok($this->model->treeForCompany(Services::authContext()->companyId));
    }

    public function create()
    {
        $payload = $this->payload();

        if (! empty($payload['parent_id'])) {
            $parent = $this->applyScope()->find((int) $payload['parent_id']);
            if (! $parent) {
                return $this->apiFail('parent_id does not exist', 422);
            }
        }

        return parent::create();
    }

    public function update($id = null)
    {
        $payload = $this->payload();

        if (! empty($payload['parent_id'])) {
            $parentId = (int) $payload['parent_id'];

            if (! $this->applyScope()->find($parentId)) {
                return $this->apiFail('parent_id does not exist', 422);
            }

            if ($this->model->wouldCreateCycle((int) $id, $parentId)) {
                return $this->apiFail('parent_id would create a circular category reference', 422);
            }
        }

        return parent::update($id);
    }

    /**
     * Deleting a category is permanent and can orphan any products still
     * assigned to it, so — unlike a plain deactivate — it's restricted to
     * Super Admins even though everyone with categories.manage can create,
     * edit, and deactivate one. Same reasoning/pattern as
     * UsersController::roleAssignmentAllowed().
     */
    public function delete($id = null)
    {
        if ($this->callerRoleName() !== 'Super Admin') {
            return $this->apiFail('Only a Super Admin can delete a category', 403);
        }

        return parent::delete($id);
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
}
