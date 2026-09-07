<?php

namespace App\Models;

use CodeIgniter\Model;

/**
 * A category's overrides for the discount taxonomy (TaxService::
 * DISCOUNT_TYPES) — a row only ever needs to exist to record an
 * exception, since TaxService::isProductEligibleForDiscount() treats a
 * missing row as eligible. See the migration that creates this table for
 * the fuller reasoning.
 */
class CategoryDiscountEligibilityModel extends Model
{
    protected $table = 'category_discount_eligibility';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'object';
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';

    protected $allowedFields = ['category_id', 'discount_type', 'eligible'];

    protected $validationRules = [
        'category_id' => ['label' => 'Category', 'rules' => 'required|is_natural_no_zero'],
        'discount_type' => ['label' => 'Discount type', 'rules' => 'required|in_list[senior_citizen,pwd,sc_pwd_5_bnpc,regular,promo,employee,member,wholesale,manual]'],
        'eligible' => ['label' => 'Eligible', 'rules' => 'permit_empty|in_list[0,1]'],
    ];
}
