<?php

namespace App\Controllers\Api\V1;

use App\Controllers\Api\BaseCrudController;
use App\Models\CompanyModel;
use App\Models\RoleModel;
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

    /**
     * Fields on this one generic update() that are restricted to a caller
     * logged in as Dev Admin specifically, on top of ordinary
     * companies.manage — each paired with the message explaining why.
     * loyalty_enabled: switching the whole Customer Loyalty feature on/off.
     * transaction_no_*: Sales Invoicing's transaction-numbering settings —
     * see InvoiceSeriesController's own identical restriction on the
     * invoice series themselves, which this mirrors for the one other
     * numbering control that tab exposes but that doesn't live on
     * invoice_series (it's company-wide, not per-series).
     */
    private const DEV_ADMIN_ONLY_FIELDS = [
        'loyalty_enabled' => 'Only a Dev Admin can enable or disable Customer Loyalty',
        'transaction_no_reset_rule' => 'Only a Dev Admin can manage sales invoicing',
        'transaction_no_prefix' => 'Only a Dev Admin can manage sales invoicing',
        'transaction_no_length' => 'Only a Dev Admin can manage sales invoicing',
    ];

    /**
     * PUT /api/v1/companies/{id} — every other company setting goes
     * through this one generic update untouched; only the fields named
     * above are gated. The Settings screen's own controls already hide
     * themselves from everyone else; this is the server-side half of
     * that, so it can't be bypassed with a crafted request.
     */
    public function update($id = null)
    {
        $payload = $this->request->getJSON(true) ?? [];

        foreach (self::DEV_ADMIN_ONLY_FIELDS as $field => $message) {
            if (array_key_exists($field, $payload) && $this->callerRoleName() !== 'Dev Admin') {
                return $this->apiFail($message, 403);
            }
        }

        return parent::update($id);
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

    /** POST /api/v1/companies/{id}/logo — mirrors ProductsController::uploadImage(). */
    public function uploadLogo($id = null)
    {
        $company = $this->applyScope()->find($id);
        if ($company === null) {
            return $this->notFound();
        }

        $file = $this->request->getFile('logo');
        if ($file === null || ! $file->isValid()) {
            return $this->apiFail('A valid image file is required', 422);
        }

        // getMimeType() sniffs the actual file content (via fileinfo), unlike
        // getClientMimeType()/getClientExtension() which just echo back
        // whatever the request claimed — trivially spoofable.
        $allowed = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
        $mime = $file->getMimeType();
        if (! isset($allowed[$mime])) {
            return $this->apiFail('Logo must be JPEG, PNG, or WEBP', 422);
        }

        if ($file->getSize() > 2 * 1024 * 1024) {
            return $this->apiFail('Logo must be 2MB or smaller', 422);
        }

        $dir = FCPATH . 'uploads/companies/';
        if (! is_dir($dir)) {
            mkdir($dir, 0755, true);
        }

        $newName = $id . '_' . bin2hex(random_bytes(8)) . '.' . $allowed[$mime];
        $file->move($dir, $newName);
        $relativePath = 'uploads/companies/' . $newName;

        $oldPath = $company->logo_path;
        $this->model->update($id, ['logo_path' => $relativePath]);

        if ($oldPath) {
            $oldFull = FCPATH . $oldPath;
            if (is_file($oldFull)) {
                unlink($oldFull);
            }
        }

        return $this->ok($this->model->find($id), 'Logo uploaded');
    }

    /** DELETE /api/v1/companies/{id}/logo */
    public function deleteLogo($id = null)
    {
        $company = $this->applyScope()->find($id);
        if ($company === null) {
            return $this->notFound();
        }

        if ($company->logo_path) {
            $full = FCPATH . $company->logo_path;
            if (is_file($full)) {
                unlink($full);
            }
            $this->model->update($id, ['logo_path' => null]);
        }

        return $this->ok($this->model->find($id), 'Logo removed');
    }
}
