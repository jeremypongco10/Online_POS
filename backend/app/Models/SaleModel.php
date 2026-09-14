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
        'store_id', 'store_name', 'store_address', 'store_receipt_footer_note',
        'store_vat_reg_tin', 'store_pos_serial_no', 'store_min_no', 'show_bir_details',
        'register_id', 'cash_session_id', 'customer_id', 'customer_name',
        'customer_address', 'customer_tin', 'customer_business_style',
        'is_training', 'print_count',
        'user_id', 'cashier_name', 'bagger_id', 'bagger_name',
        'loyalty_card_id', 'loyalty_card_number',
        'invoice_number', 'transaction_no', 'status', 'sale_date',
        'subtotal', 'discount_total', 'discount_holder_name', 'discount_id_number', 'tax_total', 'total',
        'amount_paid', 'change_due', 'notes',
    ];

    protected $validationRules = [
        'company_id' => ['label' => 'Company', 'rules' => 'required|is_natural_no_zero'],
        'store_id' => ['label' => 'Store', 'rules' => 'required|is_natural_no_zero'],
        'register_id' => ['label' => 'POS Terminal', 'rules' => 'required|is_natural_no_zero'],
        'user_id' => ['label' => 'User', 'rules' => 'required|is_natural_no_zero'],
        'bagger_id' => ['label' => 'Bagger', 'rules' => 'permit_empty|is_natural_no_zero'],
        'loyalty_card_id' => ['label' => 'Loyalty card', 'rules' => 'permit_empty|is_natural_no_zero'],
        'invoice_number' => ['label' => 'Invoice number', 'rules' => 'required|max_length[40]'],
        'transaction_no' => ['label' => 'Transaction number', 'rules' => 'permit_empty|max_length[40]'],
        'status' => ['label' => 'Status', 'rules' => 'permit_empty|in_list[completed,voided,held]'],
        'sale_date' => ['label' => 'Sale date', 'rules' => 'required'],
        'subtotal' => ['label' => 'Subtotal', 'rules' => 'permit_empty|decimal'],
        'discount_total' => ['label' => 'Discount total', 'rules' => 'permit_empty|decimal'],
        // BIR RR 7-2010 documentation for a Senior Citizen / PWD / 5% BNPC
        // discount — required (see SalesController::create()) only when at
        // least one line on the sale carries one of those discount types.
        'discount_holder_name' => ['label' => 'Discount holder name', 'rules' => 'permit_empty|max_length[150]'],
        'discount_id_number' => ['label' => 'Discount ID number', 'rules' => 'permit_empty|max_length[60]'],
        'tax_total' => ['label' => 'Tax total', 'rules' => 'permit_empty|decimal'],
        'total' => ['label' => 'Total', 'rules' => 'permit_empty|decimal'],
        'amount_paid' => ['label' => 'Amount paid', 'rules' => 'permit_empty|decimal'],
        'change_due' => ['label' => 'Change due', 'rules' => 'permit_empty|decimal'],
    ];
}
