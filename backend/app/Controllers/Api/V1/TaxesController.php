<?php

namespace App\Controllers\Api\V1;

use App\Controllers\Api\BaseCrudController;
use App\Libraries\TaxService;
use App\Models\CompanyModel;
use App\Models\TaxRateModel;
use CodeIgniter\Model;
use Config\Services;

/**
 * /api/v1/taxes — the centralized, per-company tax rate configuration.
 * All tax math elsewhere in the app must read `rate` from here rather
 * than hard-coding a percentage.
 *
 * Every read is additionally scoped to the company's own tax regime —
 * see applyScope(). That is what keeps a Philippine store from being
 * offered a 10% GST rate in its product and POS pickers, and a Papua
 * New Guinea one from being offered 12% VAT: the two sets are parallel
 * alternatives, and only one of them is ever correct for a given
 * company at a given time.
 */
class TaxesController extends BaseCrudController
{
    protected string $modelClass = TaxRateModel::class;
    protected array $allowedFilters = ['company_id', 'is_active', 'is_default'];
    protected array $allowedSorts = ['id', 'name', 'rate', 'created_at'];
    protected array $searchableFields = ['name'];
    protected string $defaultSort = 'name';

    /**
     * The regime this company is on, which every rate it sees is scoped
     * to. Falls back to 'vat' — the companies.tax_system column default,
     * and what this system did before regimes existed — so a company row
     * that somehow carries nothing still resolves to a real set rather
     * than to an empty tax list, which would leave the POS with no rate
     * to charge at all.
     */
    private function companyTaxSystem(): string
    {
        $company = model(CompanyModel::class)->find(Services::authContext()->companyId);
        $system = $company->tax_system ?? 'vat';

        return $system === 'gst' ? 'gst' : 'vat';
    }

    /**
     * Tenant/store scope as usual, narrowed again to the company's own
     * regime. Deliberately not an optional `?tax_system=` filter the
     * caller opts into: six separate screens read this endpoint (the
     * Taxes tab, three product screens, purchase orders, the POS), and
     * a rule that only holds where each remembered to pass a parameter
     * is a rule that will be missed somewhere. Scoping it here means
     * "you only ever see the rates that apply to you" holds everywhere
     * by construction.
     */
    protected function applyScope(): Model
    {
        return parent::applyScope()->where('tax_rates.tax_system', $this->companyTaxSystem());
    }

    /**
     * A rate is always written into the regime its company is on, on
     * create and on update alike. Never taken from the request body: the
     * create form has no business asking which regime a rate is for when
     * the answer is already known, and a mismatched value would produce
     * a row invisible to the very screen that just created it (see
     * applyScope). Forcing it on update is a no-op in practice — a rate
     * from the other regime can't be fetched to edit in the first place
     * — and keeps the column from being moved by a hand-made request.
     */
    protected function payload(): array
    {
        return array_merge(parent::payload(), ['tax_system' => $this->companyTaxSystem()]);
    }

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
