<?php

namespace App\Models;

use CodeIgniter\Model;

class SaleModel extends Model
{
    protected $table = 'sales';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'object';
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';

    protected $allowedFields = [
        'company_id', 'company_name', 'company_tin',
        'store_id', 'store_name', 'store_address',
        'register_id', 'cash_session_id', 'customer_id', 'customer_name',
        'user_id', 'cashier_name', 'bagger_id', 'bagger_name',
        'loyalty_card_id', 'loyalty_card_number',
        'invoice_number', 'status', 'sale_date',
        'subtotal', 'discount_total', 'tax_total', 'total',
        'amount_paid', 'change_due', 'notes',
    ];

    protected $validationRules = [
        'company_id' => 'required|is_natural_no_zero',
        'store_id' => 'required|is_natural_no_zero',
        'register_id' => 'required|is_natural_no_zero',
        'user_id' => 'required|is_natural_no_zero',
        'bagger_id' => 'permit_empty|is_natural_no_zero',
        'loyalty_card_id' => 'permit_empty|is_natural_no_zero',
        'invoice_number' => 'required|max_length[40]',
        'status' => 'permit_empty|in_list[completed,voided,held]',
        'sale_date' => 'required',
        'subtotal' => 'permit_empty|decimal',
        'discount_total' => 'permit_empty|decimal',
        'tax_total' => 'permit_empty|decimal',
        'total' => 'permit_empty|decimal',
        'amount_paid' => 'permit_empty|decimal',
        'change_due' => 'permit_empty|decimal',
    ];
}
