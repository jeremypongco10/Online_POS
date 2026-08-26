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
        'trade_name' => ['label' => 'Trade name', 'rules' => 'required|min_length[2]|max_length[150]|is_unique[companies.trade_name,id,{id}]'],
        'legal_name' => ['label' => 'Legal name', 'rules' => 'permit_empty|max_length[150]'],
        'tax_id' => ['label' => 'Tax ID', 'rules' => 'permit_empty|max_length[50]'],
        'is_vat_registered' => ['label' => 'VAT registered', 'rules' => 'permit_empty|in_list[0,1]'],
        'vat_registration_number' => ['label' => 'VAT registration number', 'rules' => 'permit_empty|max_length[50]'],
        'email' => ['label' => 'Email', 'rules' => 'permit_empty|valid_email|max_length[150]'],
        'phone' => ['label' => 'Phone', 'rules' => 'permit_empty|max_length[30]'],
        'currency' => ['label' => 'Currency', 'rules' => 'permit_empty|max_length[3]'],
        'timezone' => ['label' => 'Timezone', 'rules' => 'permit_empty|max_length[64]'],
        'is_active' => ['label' => 'Active status', 'rules' => 'permit_empty|in_list[0,1]'],
    ];
}
