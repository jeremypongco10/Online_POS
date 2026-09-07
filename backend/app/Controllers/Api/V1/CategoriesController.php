<?php

namespace App\Controllers\Api\V1;

use App\Controllers\Api\BaseCrudController;
use App\Models\CategoryDiscountEligibilityModel;
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

    /**
     * GET /api/v1/categories/{id}/discount-eligibility
     *
     * This category's own overrides only — every type not present here
     * is eligible by default (see TaxService::isProductEligibleForDiscount).
     * A product's OWN override, if it has one, still wins over whatever
     * this returns; this endpoint has no way to know that, since it's
     * scoped to one category, not one product — see ProductsController::
     * discountEligibility for the fully resolved view a single product
     * actually gets at checkout.
     */
    public function discountEligibility($id = null)
    {
        $category = $this->applyScope()->find($id);
        if ($category === null) {
            return $this->notFound();
        }

        $rows = model(CategoryDiscountEligibilityModel::class)->where('category_id', $id)->findAll();

        $overrides = [];
        foreach ($rows as $row) {
            $overrides[$row->discount_type] = (bool) $row->eligible;
        }

        return $this->ok($overrides);
    }

    /**
     * PUT /api/v1/categories/{id}/discount-eligibility
     * body: { rules: { [discount_type]: boolean, ... } }
     *
     * Sets this category's overrides — the primary, maintainable lever
     * for discount eligibility (a per-product override exists too, see
     * ProductsController::updateDiscountEligibility, but configuring
     * every product in a catalog individually isn't the intended
     * workflow). Same sparse-table semantics as the product version:
     * `eligible: true` deletes the row (true is already the default
     * with none), and a type absent from `rules` is left untouched.
     */
    public function updateDiscountEligibility($id = null)
    {
        $category = $this->applyScope()->find($id);
        if ($category === null) {
            return $this->notFound();
        }

        $payload = $this->request->getJSON(true) ?? [];
        $rules = $payload['rules'] ?? null;
        if (! is_array($rules)) {
            return $this->apiFail('rules must be an object of discount_type => boolean', 422);
        }

        $taxService = Services::taxService();
        $model = model(CategoryDiscountEligibilityModel::class);

        foreach ($rules as $type => $eligible) {
            if (! is_string($type) || ! $taxService->isKnownDiscountType($type)) {
                return $this->apiFail("Unknown discount_type: {$type}", 422);
            }

            $existing = $model->where('category_id', $id)->where('discount_type', $type)->first();

            if ($eligible) {
                if ($existing !== null) {
                    $model->delete($existing->id);
                }
                continue;
            }

            if ($existing !== null) {
                $model->update($existing->id, ['eligible' => 0]);
            } else {
                $model->insert(['category_id' => $id, 'discount_type' => $type, 'eligible' => 0]);
            }
        }

        $rows = $model->where('category_id', $id)->findAll();
        $overrides = [];
        foreach ($rows as $row) {
            $overrides[$row->discount_type] = (bool) $row->eligible;
        }

        return $this->ok($overrides, 'Discount eligibility updated');
    }
}
