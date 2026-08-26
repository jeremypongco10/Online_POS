<?php

namespace App\Models;

use CodeIgniter\Model;

class RegisterModel extends Model
{
    protected $table = 'registers';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'object';
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';

    protected $allowedFields = ['store_id', 'name', 'code', 'is_active'];

    protected $validationRules = [
        'store_id' => ['label' => 'Store', 'rules' => 'required|is_natural_no_zero'],
        'name' => ['label' => 'Name', 'rules' => 'required|max_length[100]'],
        'code' => ['label' => 'Code', 'rules' => 'required|max_length[30]'],
        'is_active' => ['label' => 'Active status', 'rules' => 'permit_empty|in_list[0,1]'],
    ];
}
