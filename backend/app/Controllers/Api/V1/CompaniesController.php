<?php

namespace App\Controllers\Api\V1;

use App\Controllers\Api\BaseCrudController;
use App\Models\CompanyModel;
use CodeIgniter\Model;
use Config\Services;

class CompaniesController extends BaseCrudController
{
    protected string $modelClass = CompanyModel::class;
    protected array $allowedFilters = ['is_active', 'is_vat_registered'];
    protected array $allowedSorts = ['id', 'trade_name', 'created_at'];
    protected array $searchableFields = ['trade_name', 'legal_name', 'tax_id', 'email'];
    protected string $defaultSort = 'trade_name';

    /**
     * A company IS the tenant boundary, so "own company" is the whole
     * scope — every caller can only ever see/edit their own row here,
     * never another company's, regardless of the id in the URL.
     */
    protected function applyScope(): Model
    {
        return $this->model->where('id', Services::authContext()->companyId);
    }
}
