<?php

namespace App\Models;

use CodeIgniter\Model;

/**
 * A single product's overrides for the discount taxonomy (TaxService::
 * DISCOUNT_TYPES) — always the most specific rule TaxService::
 * isProductEligibleForDiscount() checks, ahead of any category rule. A
 * row only ever needs to exist to record an exception (eligible=0) or
 * to explicitly re-enable something the product's category turned off
 * (eligible=1) — see the migration that creates this table.
 */
class ProductDiscountEligibilityModel extends Model
{
    protected $table = 'product_discount_eligibility';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'object';
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';

    protected $allowedFields = ['product_id', 'discount_type', 'eligible'];

    protected $validationRules = [
        'product_id' => ['label' => 'Product', 'rules' => 'required|is_natural_no_zero'],
        'discount_type' => ['label' => 'Discount type', 'rules' => 'required|in_list[senior_citizen,pwd,sc_pwd_5_bnpc,regular,promo,employee,member,wholesale,manual]'],
        'eligible' => ['label' => 'Eligible', 'rules' => 'permit_empty|in_list[0,1]'],
    ];
}
