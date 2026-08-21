<?php

namespace App\Models;

use CodeIgniter\Model;

class PurchaseOrderItemModel extends Model
{
    protected $table = 'purchase_order_items';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'object';
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';

    protected $allowedFields = [
        'purchase_order_id', 'product_id', 'tax_rate_id', 'quantity', 'unit_cost',
        'tax_rate', 'line_total', 'received_quantity',
    ];

    protected $validationRules = [
        'purchase_order_id' => 'required|is_natural_no_zero',
        'product_id' => 'required|is_natural_no_zero',
        'tax_rate_id' => 'permit_empty|is_natural_no_zero',
        'quantity' => 'required|decimal',
        'unit_cost' => 'required|decimal',
        'tax_rate' => 'permit_empty|decimal',
        'line_total' => 'required|decimal',
        'received_quantity' => 'permit_empty|decimal',
    ];
}
