<?php

namespace App\Models;

use CodeIgniter\Model;

class CashSessionModel extends Model
{
    protected $table = 'cash_sessions';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'object';
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';

    protected $allowedFields = [
        'register_id', 'user_id', 'opened_at', 'closed_at',
        'opening_balance', 'closing_balance', 'expected_balance', 'difference',
        'status', 'notes',
    ];

    protected $validationRules = [
        'register_id' => 'required|is_natural_no_zero',
        'user_id' => 'required|is_natural_no_zero',
        'opening_balance' => 'permit_empty|decimal',
        'status' => 'permit_empty|in_list[open,closed]',
    ];
}
