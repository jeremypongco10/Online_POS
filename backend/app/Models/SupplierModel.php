<?php

namespace App\Models;

use CodeIgniter\Model;

class SupplierModel extends Model
{
    protected $table = 'suppliers';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'object';
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';

    protected $allowedFields = [
        'company_id', 'name', 'contact_name', 'email', 'phone',
        'address', 'tax_id', 'is_active',
    ];

    protected $validationRules = [
        'company_id' => ['label' => 'Company', 'rules' => 'required|is_natural_no_zero'],
        'name' => ['label' => 'Name', 'rules' => 'required|max_length[150]'],
        'email' => ['label' => 'Email', 'rules' => 'permit_empty|valid_email|max_length[150]'],
        'phone' => ['label' => 'Phone', 'rules' => 'permit_empty|max_length[30]'],
        'is_active' => ['label' => 'Active status', 'rules' => 'permit_empty|in_list[0,1]'],
    ];
}
