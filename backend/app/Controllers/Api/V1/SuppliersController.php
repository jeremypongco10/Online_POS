<?php

namespace App\Controllers\Api\V1;

use App\Controllers\Api\BaseCrudController;
use App\Models\SupplierModel;

class SuppliersController extends BaseCrudController
{
    protected string $modelClass = SupplierModel::class;
    protected array $allowedFilters = ['company_id', 'is_active'];
    protected array $allowedSorts = ['id', 'name', 'created_at'];
    protected array $searchableFields = ['name', 'contact_name', 'email', 'phone'];
    protected string $defaultSort = 'name';
}
