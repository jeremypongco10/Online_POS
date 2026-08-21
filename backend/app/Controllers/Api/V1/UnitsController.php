<?php

namespace App\Controllers\Api\V1;

use App\Controllers\Api\BaseCrudController;
use App\Models\UnitModel;

class UnitsController extends BaseCrudController
{
    protected string $modelClass = UnitModel::class;
    // Units of measure are a global reference table, not tenant-scoped.
    protected ?string $companyColumn = null;
    protected array $allowedSorts = ['id', 'name', 'abbreviation'];
    protected array $searchableFields = ['name', 'abbreviation'];
    protected string $defaultSort = 'name';
}
