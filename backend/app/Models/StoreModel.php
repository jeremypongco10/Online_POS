<?php

namespace App\Models;

use CodeIgniter\Model;

class StoreModel extends Model
{
    protected $table = 'stores';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'object';
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';

    protected $allowedFields = [
        'company_id', 'name', 'code', 'address', 'phone', 'email', 'is_active',
    ];

    protected $validationRules = [
        'company_id' => ['label' => 'Company', 'rules' => 'required|is_natural_no_zero'],
        'name' => ['label' => 'Name', 'rules' => 'required|min_length[2]|max_length[150]'],
        'code' => ['label' => 'Code', 'rules' => 'required|max_length[30]'],
        'address' => ['label' => 'Address', 'rules' => 'permit_empty|max_length[255]'],
        'phone' => ['label' => 'Phone', 'rules' => 'permit_empty|max_length[30]'],
        'email' => ['label' => 'Email', 'rules' => 'permit_empty|valid_email|max_length[150]'],
        'is_active' => ['label' => 'Active status', 'rules' => 'permit_empty|in_list[0,1]'],
    ];
}
