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
        'tax_rate_id', 'tax_type', 'quantity', 'unit_price', 'discount',
        'tax_rate', 'tax_amount', 'line_total',
    ];

    protected $validationRules = [
        'sale_id' => 'required|is_natural_no_zero',
        'product_id' => 'required|is_natural_no_zero',
        'tax_rate_id' => 'permit_empty|is_natural_no_zero',
        'tax_type' => 'permit_empty|in_list[vat,vat_exempt,zero_rated,non_vat]',
        'quantity' => 'required|decimal',
        'unit_price' => 'required|decimal',
        'discount' => 'permit_empty|decimal',
        'tax_rate' => 'permit_empty|decimal',
        'tax_amount' => 'permit_empty|decimal',
        'line_total' => 'required|decimal',
    ];
}
