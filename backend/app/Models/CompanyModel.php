<?php

namespace App\Models;

use CodeIgniter\Model;

class CompanyModel extends Model
{
    protected $table = 'companies';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'object';
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';

    protected $allowedFields = [
        'trade_name', 'legal_name', 'tax_id', 'is_vat_registered', 'vat_registration_number',
        'email', 'phone', 'address', 'currency', 'timezone', 'is_active',
    ];

    protected $validationRules = [
        'id' => 'permit_empty|is_natural', // used only to resolve the {id} placeholder below
        'trade_name' => 'required|min_length[2]|max_length[150]|is_unique[companies.trade_name,id,{id}]',
        'legal_name' => 'permit_empty|max_length[150]',
        'tax_id' => 'permit_empty|max_length[50]',
        'is_vat_registered' => 'permit_empty|in_list[0,1]',
        'vat_registration_number' => 'permit_empty|max_length[50]',
        'email' => 'permit_empty|valid_email|max_length[150]',
        'phone' => 'permit_empty|max_length[30]',
        'currency' => 'permit_empty|max_length[3]',
        'timezone' => 'permit_empty|max_length[64]',
        'is_active' => 'permit_empty|in_list[0,1]',
    ];
}
