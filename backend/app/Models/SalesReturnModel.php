<?php

namespace App\Models;

use CodeIgniter\Model;

/**
 * Maps to the `returns` table. Named SalesReturnModel because
 * `Return` is a reserved word and cannot be used as a PHP class name.
 */
class SalesReturnModel extends Model
{
    public const STATUS_PENDING = 'pending';
    public const STATUS_COMPLETED = 'completed';
    public const STATUS_CANCELLED = 'cancelled';

    protected $table = 'returns';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'object';
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';

    protected $allowedFields = [
        'sale_id', 'store_id', 'user_id', 'approved_by', 'customer_id', 'return_number',
        'reason', 'status', 'total_refund', 'return_date', 'approved_at',
    ];

    protected $validationRules = [
        'id' => 'permit_empty|is_natural', // used only to resolve the {id} placeholder below
        'sale_id' => ['label' => 'Sale', 'rules' => 'required|is_natural_no_zero'],
        'store_id' => ['label' => 'Store', 'rules' => 'required|is_natural_no_zero'],
        'user_id' => ['label' => 'User', 'rules' => 'required|is_natural_no_zero'],
        'approved_by' => ['label' => 'Approver', 'rules' => 'permit_empty|is_natural_no_zero'],
        'return_number' => ['label' => 'Return number', 'rules' => 'required|max_length[40]|is_unique[returns.return_number,id,{id}]'],
        'status' => ['label' => 'Status', 'rules' => 'permit_empty|in_list[pending,completed,cancelled]'],
        'total_refund' => ['label' => 'Total refund', 'rules' => 'permit_empty|decimal'],
        'return_date' => ['label' => 'Return date', 'rules' => 'required'],
    ];
}
