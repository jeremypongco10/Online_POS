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
        'store_id' => 'required|is_natural_no_zero',
        'name' => 'required|max_length[100]',
        'code' => 'required|max_length[30]',
        'is_active' => 'permit_empty|in_list[0,1]',
    ];
}
