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
        'company_id' => 'required|is_natural_no_zero',
        'name' => 'required|min_length[2]|max_length[150]',
        'code' => 'required|max_length[30]',
        'address' => 'permit_empty|max_length[255]',
        'phone' => 'permit_empty|max_length[30]',
        'email' => 'permit_empty|valid_email|max_length[150]',
        'is_active' => 'permit_empty|in_list[0,1]',
    ];
}
