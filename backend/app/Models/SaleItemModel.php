<?php

namespace App\Models;

use CodeIgniter\Model;

class SaleItemModel extends Model
{
    protected $table = 'sale_items';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'object';
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';

    protected $allowedFields = [
        'sale_id', 'product_id', 'product_name', 'product_sku',
        'tax_rate_id', 'tax_type', 'quantity', 'unit_price', 'discount', 'discount_type',
        'tax_rate', 'tax_amount', 'line_total',
    ];

    protected $validationRules = [
        'sale_id' => ['label' => 'Sale', 'rules' => 'required|is_natural_no_zero'],
        // permit_empty, not required — a custom (non-catalog) line item has
        // no product_id at all, see SalesController::create()'s
        // empty($item['product_id']) branch.
        'product_id' => ['label' => 'Product', 'rules' => 'permit_empty|is_natural_no_zero'],
        'tax_rate_id' => ['label' => 'Tax rate', 'rules' => 'permit_empty|is_natural_no_zero'],
        'tax_type' => ['label' => 'Tax type', 'rules' => 'permit_empty|in_list[vat,vat_exempt,zero_rated,non_vat]'],
        'quantity' => ['label' => 'Quantity', 'rules' => 'required|decimal'],
        'unit_price' => ['label' => 'Unit price', 'rules' => 'required|decimal'],
        'discount' => ['label' => 'Discount', 'rules' => 'permit_empty|decimal'],
        // Mirrors TaxService::DISCOUNT_TYPES — kept as a duplicated literal
        // list rather than a shared constant, the same tradeoff this model
        // already made for 'tax_type' against TaxService::VALID_TYPES.
        'discount_type' => ['label' => 'Discount type', 'rules' => 'permit_empty|in_list[senior_citizen,pwd,sc_pwd_5_bnpc,regular,promo,employee,member,wholesale,manual]'],
        'tax_rate' => ['label' => 'Tax rate percentage', 'rules' => 'permit_empty|decimal'],
        'tax_amount' => ['label' => 'Tax amount', 'rules' => 'permit_empty|decimal'],
        'line_total' => ['label' => 'Line total', 'rules' => 'required|decimal'],
    ];
}
