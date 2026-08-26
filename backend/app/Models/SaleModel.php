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
        'company_id' => ['label' => 'Company', 'rules' => 'required|is_natural_no_zero'],
        'store_id' => ['label' => 'Store', 'rules' => 'required|is_natural_no_zero'],
        'register_id' => ['label' => 'Register', 'rules' => 'required|is_natural_no_zero'],
        'user_id' => ['label' => 'User', 'rules' => 'required|is_natural_no_zero'],
        'bagger_id' => ['label' => 'Bagger', 'rules' => 'permit_empty|is_natural_no_zero'],
        'loyalty_card_id' => ['label' => 'Loyalty card', 'rules' => 'permit_empty|is_natural_no_zero'],
        'invoice_number' => ['label' => 'Invoice number', 'rules' => 'required|max_length[40]'],
        'status' => ['label' => 'Status', 'rules' => 'permit_empty|in_list[completed,voided,held]'],
        'sale_date' => ['label' => 'Sale date', 'rules' => 'required'],
        'subtotal' => ['label' => 'Subtotal', 'rules' => 'permit_empty|decimal'],
        'discount_total' => ['label' => 'Discount total', 'rules' => 'permit_empty|decimal'],
        'tax_total' => ['label' => 'Tax total', 'rules' => 'permit_empty|decimal'],
        'total' => ['label' => 'Total', 'rules' => 'permit_empty|decimal'],
        'amount_paid' => ['label' => 'Amount paid', 'rules' => 'permit_empty|decimal'],
        'change_due' => ['label' => 'Change due', 'rules' => 'permit_empty|decimal'],
    ];
}
