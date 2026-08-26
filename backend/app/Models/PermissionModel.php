<?php

namespace App\Models;

use CodeIgniter\Model;

class PermissionModel extends Model
{
    protected $table = 'permissions';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'object';
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';

    protected $allowedFields = ['name', 'slug', 'description'];

    protected $validationRules = [
        'id' => 'permit_empty|is_natural', // used only to resolve the {id} placeholder below
        'name' => ['label' => 'Name', 'rules' => 'required|max_length[100]'],
        'slug' => ['label' => 'Slug', 'rules' => 'required|max_length[100]|is_unique[permissions.slug,id,{id}]'],
        'description' => ['label' => 'Description', 'rules' => 'permit_empty|max_length[255]'],
    ];
}
