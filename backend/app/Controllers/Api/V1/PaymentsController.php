<?php

namespace App\Controllers\Api\V1;

use App\Controllers\Api\BaseCrudController;
use App\Models\PaymentModel;
use App\Models\SaleModel;
use CodeIgniter\Model;
use Config\Services;

class PaymentsController extends BaseCrudController
{
    protected string $modelClass = PaymentModel::class;
    protected array $allowedFilters = ['sale_id', 'method'];
    protected array $allowedSorts = ['id', 'amount', 'paid_at', 'created_at'];
    protected array $searchableFields = ['reference'];
    protected string $defaultSort = '-paid_at';

    /** payments has no company_id column of its own — scope indirectly through its sale. */
    protected function applyScope(): Model
    {
        $auth = Services::authContext();
        $sales = model(SaleModel::class)->where('company_id', $auth->companyId);

        if ($auth->allowedStoreIds !== null) {
            $sales = $sales->whereIn('store_id', $auth->allowedStoreIds);
        }

        return $this->model->whereIn('sale_id', $sales->findColumn('id') ?: [0]);
    }
}
