<?php

namespace App\Models;

use CodeIgniter\Model;

class PurchaseOrderModel extends Model
{
    public const STATUS_DRAFT = 'draft';
    public const STATUS_APPROVED = 'approved';
    public const STATUS_RECEIVED = 'received';
    public const STATUS_CANCELLED = 'cancelled';

    protected $table = 'purchase_orders';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'object';
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';

    protected $allowedFields = [
        'company_id', 'store_id', 'supplier_id', 'user_id', 'approved_by', 'po_number',
        'status', 'order_date', 'approved_at', 'expected_date', 'received_date',
        'subtotal', 'tax_total', 'total', 'notes',
    ];

    protected $validationRules = [
        'company_id' => 'required|is_natural_no_zero',
        'store_id' => 'required|is_natural_no_zero',
        'supplier_id' => 'required|is_natural_no_zero',
        'po_number' => 'required|max_length[40]',
        'status' => 'permit_empty|in_list[draft,approved,received,cancelled]',
        'subtotal' => 'permit_empty|decimal',
        'tax_total' => 'permit_empty|decimal',
        'total' => 'permit_empty|decimal',
    ];
}
