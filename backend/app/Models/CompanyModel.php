<?php

namespace App\Models;

use CodeIgniter\Model;

class CompanyModel extends Model
{
    protected $table = 'companies';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'object';
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';

    protected $allowedFields = [
        'trade_name', 'legal_name', 'tax_id', 'is_vat_registered', 'vat_registration_number',
        'email', 'phone', 'address', 'currency', 'timezone', 'is_active', 'loyalty_points_per_100',
        'require_item_void_approval', 'require_cancel_approval', 'require_manual_discount_approval',
        'default_regular_discount_percent', 'default_promo_discount_percent', 'default_employee_discount_percent',
        'default_member_discount_percent', 'default_wholesale_discount_percent',
    ];

    protected $validationRules = [
        'id' => 'permit_empty|is_natural', // used only to resolve the {id} placeholder below
        'trade_name' => ['label' => 'Trade name', 'rules' => 'required|min_length[2]|max_length[150]|is_unique[companies.trade_name,id,{id}]'],
        'legal_name' => ['label' => 'Legal name', 'rules' => 'permit_empty|max_length[150]'],
        'tax_id' => ['label' => 'Tax ID', 'rules' => 'permit_empty|max_length[50]'],
        'is_vat_registered' => ['label' => 'VAT registered', 'rules' => 'permit_empty|in_list[0,1]'],
        'vat_registration_number' => ['label' => 'VAT registration number', 'rules' => 'permit_empty|max_length[50]'],
        'email' => ['label' => 'Email', 'rules' => 'permit_empty|valid_email|max_length[150]'],
        'phone' => ['label' => 'Phone', 'rules' => 'permit_empty|max_length[30]'],
        'currency' => ['label' => 'Currency', 'rules' => 'permit_empty|max_length[3]'],
        'timezone' => ['label' => 'Timezone', 'rules' => 'permit_empty|max_length[64]'],
        'is_active' => ['label' => 'Active status', 'rules' => 'permit_empty|in_list[0,1]'],
        // "Points earned per ₱100 of a sale's total" — 0 (the default) means
        // loyalty points aren't awarded automatically at all.
        'loyalty_points_per_100' => ['label' => 'Loyalty points per 100', 'rules' => 'permit_empty|is_natural'],
        // Whether a supervisor must authorize before the POS drops a cart
        // line / cancels the whole sale. Separate flags because the two
        // differ sharply in frequency and risk — see the migration that
        // split them.
        'require_item_void_approval' => ['label' => 'Require supervisor approval to void an item', 'rules' => 'permit_empty|in_list[0,1]'],
        'require_cancel_approval' => ['label' => 'Require supervisor approval to cancel a sale', 'rules' => 'permit_empty|in_list[0,1]'],
        // Manual Discount specifically — see AddRequireManualDiscountApprovalToCompanies.
        'require_manual_discount_approval' => ['label' => 'Require supervisor approval for a manual discount', 'rules' => 'permit_empty|in_list[0,1]'],
        // A starting point DiscountDialog pre-fills, not an enforced
        // ceiling — the cashier can always type a different number.
        // Null/blank is valid and means "no default configured".
        'default_regular_discount_percent' => ['label' => 'Default Regular Discount %', 'rules' => 'permit_empty|decimal|greater_than_equal_to[0]|less_than_equal_to[100]'],
        'default_promo_discount_percent' => ['label' => 'Default Promo Discount %', 'rules' => 'permit_empty|decimal|greater_than_equal_to[0]|less_than_equal_to[100]'],
        'default_employee_discount_percent' => ['label' => 'Default Employee Discount %', 'rules' => 'permit_empty|decimal|greater_than_equal_to[0]|less_than_equal_to[100]'],
        'default_member_discount_percent' => ['label' => 'Default Member/Loyalty Discount %', 'rules' => 'permit_empty|decimal|greater_than_equal_to[0]|less_than_equal_to[100]'],
        'default_wholesale_discount_percent' => ['label' => 'Default Wholesale Discount %', 'rules' => 'permit_empty|decimal|greater_than_equal_to[0]|less_than_equal_to[100]'],
    ];
}
