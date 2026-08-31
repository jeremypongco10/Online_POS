<?php

namespace App\Models;

use CodeIgniter\Model;

/**
 * The per-company list a cashier picks from at checkout (see
 * PaymentPanel.tsx). `code` is what actually gets written into
 * payments.method — server-generated from `name` on create and never
 * editable afterward (see PaymentMethodsController), so it's not part of
 * $validationRules the way a normal user-supplied field would be.
 */
class PaymentMethodModel extends Model
{
    protected $table = 'payment_methods';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'object';
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';

    protected $allowedFields = ['company_id', 'name', 'code', 'is_active'];

    protected $validationRules = [
        'company_id' => ['label' => 'Company', 'rules' => 'required|is_natural_no_zero'],
        'name' => ['label' => 'Name', 'rules' => 'required|max_length[100]'],
        'code' => ['label' => 'Code', 'rules' => 'required|max_length[60]'],
        'is_active' => ['label' => 'Active status', 'rules' => 'permit_empty|in_list[0,1]'],
    ];
}
