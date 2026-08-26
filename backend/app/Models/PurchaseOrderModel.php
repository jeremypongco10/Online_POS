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
        'company_id' => ['label' => 'Company', 'rules' => 'required|is_natural_no_zero'],
        'store_id' => ['label' => 'Store', 'rules' => 'required|is_natural_no_zero'],
        'supplier_id' => ['label' => 'Supplier', 'rules' => 'required|is_natural_no_zero'],
        'po_number' => ['label' => 'PO number', 'rules' => 'required|max_length[40]'],
        'status' => ['label' => 'Status', 'rules' => 'permit_empty|in_list[draft,approved,received,cancelled]'],
        'subtotal' => ['label' => 'Subtotal', 'rules' => 'permit_empty|decimal'],
        'tax_total' => ['label' => 'Tax total', 'rules' => 'permit_empty|decimal'],
        'total' => ['label' => 'Total', 'rules' => 'permit_empty|decimal'],
    ];
}
