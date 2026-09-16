<?php

namespace App\Models;

use CodeIgniter\Model;

/**
 * The single source of truth for tax percentages. Application code
 * must always resolve a rate through here (by tax_rate_id, or via
 * defaultForCompany()) — never hard-code a VAT percentage elsewhere.
 */
class TaxRateModel extends Model
{
    protected $table = 'tax_rates';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'object';
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';

    protected $allowedFields = [
        'company_id', 'name', 'tax_system', 'rate', 'is_default', 'is_active',
    ];

    protected $validationRules = [
        'company_id' => ['label' => 'Company', 'rules' => 'required|is_natural_no_zero'],
        'name' => ['label' => 'Name', 'rules' => 'required|max_length[100]'],
        'tax_system' => ['label' => 'Tax system', 'rules' => 'permit_empty|in_list[vat,gst]'],
        // A rate is a PERCENTAGE, so it has to sit in 0–100. `decimal`
        // alone let through both -5 and 150 — neither is a tax rate, and
        // either one silently corrupts the VAT on every sale computed
        // against it (and, through the sale_items snapshot, every receipt
        // and BIR reading built from those sales afterwards). Bounded here
        // rather than in the controller so the POS, the importer and the
        // seeders are all held to it, not just the settings form.
        'rate' => ['label' => 'Rate', 'rules' => 'required|decimal|greater_than_equal_to[0]|less_than_equal_to[100]'],
        'is_default' => ['label' => 'Default', 'rules' => 'permit_empty|in_list[0,1]'],
        'is_active' => ['label' => 'Active status', 'rules' => 'permit_empty|in_list[0,1]'],
    ];

    /** CI4's stock wording for the two bounds above ("must be greater than
     *  or equal to 0") reads as a generic number complaint; this says what
     *  a rate actually is. */
    protected $validationMessages = [
        'rate' => [
            'greater_than_equal_to' => 'Rate must be a percentage between 0 and 100.',
            'less_than_equal_to'    => 'Rate must be a percentage between 0 and 100.',
        ],
    ];

    /**
     * The company's default rate *within its own regime*. Scoped by
     * tax_system because the rate sets are parallel, not shared: a
     * company on GST must never fall back to the 12% Philippine VAT row
     * that happens to be flagged default, which is exactly what an
     * unscoped lookup would hand it.
     */
    public function defaultForCompany(int $companyId, ?string $taxSystem = null): ?object
    {
        $query = $this->where('company_id', $companyId)
            ->where('is_default', 1)
            ->where('is_active', 1);

        if ($taxSystem !== null) {
            $query = $query->where('tax_system', $taxSystem);
        }

        return $query->first();
    }
}
