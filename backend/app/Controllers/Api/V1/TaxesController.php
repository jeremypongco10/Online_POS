<?php

namespace App\Controllers\Api\V1;

use App\Controllers\Api\BaseCrudController;
use App\Models\TaxRateModel;

/**
 * /api/v1/taxes — the centralized, per-company tax rate configuration.
 * All tax math elsewhere in the app must read `rate` from here rather
 * than hard-coding a percentage.
 */
class TaxesController extends BaseCrudController
{
    protected string $modelClass = TaxRateModel::class;
    protected array $allowedFilters = ['company_id', 'is_active', 'is_default'];
    protected array $allowedSorts = ['id', 'name', 'rate', 'created_at'];
    protected array $searchableFields = ['name'];
    protected string $defaultSort = 'name';
}
