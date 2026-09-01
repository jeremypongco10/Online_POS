<?php

namespace App\Controllers\Api\V1;

use App\Controllers\Api\BaseCrudController;
use App\Libraries\TaxService;
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

    public function index()
    {
        return $this->withIndicators(parent::index());
    }

    public function show($id = null)
    {
        return $this->withIndicators(parent::show($id));
    }

    /**
     * Attaches the receipt flag (V/E/Z/N — see TaxService::indicator) to
     * every returned rate. Computed on read rather than stored, so it
     * always reflects the classification the tax math itself would apply
     * to a line using this rate.
     */
    private function withIndicators($response)
    {
        $body = json_decode($response->getBody(), true);

        if (! ($body['success'] ?? false) || ! isset($body['data'])) {
            return $response;
        }

        $taxService = new TaxService();
        $decorate = static function (array $row) use ($taxService): array {
            $row['indicator'] = $taxService->indicator((object) $row);

            return $row;
        };

        $body['data'] = array_is_list($body['data'] ?? [])
            ? array_map($decorate, $body['data'])
            : $decorate($body['data']);

        return $this->response->setJSON($body);
    }
}
