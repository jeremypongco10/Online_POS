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
        'company_id', 'name', 'rate', 'is_default', 'is_active',
    ];

    protected $validationRules = [
        'company_id' => ['label' => 'Company', 'rules' => 'required|is_natural_no_zero'],
        'name' => ['label' => 'Name', 'rules' => 'required|max_length[100]'],
        'rate' => ['label' => 'Rate', 'rules' => 'required|decimal'],
        'is_default' => ['label' => 'Default', 'rules' => 'permit_empty|in_list[0,1]'],
        'is_active' => ['label' => 'Active status', 'rules' => 'permit_empty|in_list[0,1]'],
    ];

    public function defaultForCompany(int $companyId): ?object
    {
        return $this->where('company_id', $companyId)
            ->where('is_default', 1)
            ->where('is_active', 1)
            ->first();
    }
}
