<?php

namespace App\Controllers\Api\V1;

use App\Controllers\Api\BaseCrudController;
use App\Models\CustomerModel;

class CustomersController extends BaseCrudController
{
    protected string $modelClass = CustomerModel::class;
    protected array $allowedFilters = ['company_id', 'is_active'];
    protected array $allowedSorts = ['id', 'name', 'customer_code', 'created_at'];
    protected array $searchableFields = ['name', 'customer_code', 'email', 'mobile'];
    protected string $defaultSort = 'name';
}
