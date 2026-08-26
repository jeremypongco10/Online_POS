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
        'purchase_order_id' => ['label' => 'Purchase order', 'rules' => 'required|is_natural_no_zero'],
        'product_id' => ['label' => 'Product', 'rules' => 'required|is_natural_no_zero'],
        'tax_rate_id' => ['label' => 'Tax rate', 'rules' => 'permit_empty|is_natural_no_zero'],
        'quantity' => ['label' => 'Quantity', 'rules' => 'required|decimal'],
        'unit_cost' => ['label' => 'Unit cost', 'rules' => 'required|decimal'],
        'tax_rate' => ['label' => 'Tax rate percentage', 'rules' => 'permit_empty|decimal'],
        'line_total' => ['label' => 'Line total', 'rules' => 'required|decimal'],
        'received_quantity' => ['label' => 'Received quantity', 'rules' => 'permit_empty|decimal'],
    ];
}
