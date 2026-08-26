<?php

namespace App\Models;

use CodeIgniter\Model;

class RolePermissionModel extends Model
{
    protected $table = 'role_permissions';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'object';
    protected $useTimestamps = false;

    protected $allowedFields = ['role_id', 'permission_id', 'created_at'];

    protected $validationRules = [
        'role_id' => ['label' => 'Role', 'rules' => 'required|is_natural_no_zero'],
        'permission_id' => ['label' => 'Permission', 'rules' => 'required|is_natural_no_zero'],
    ];

    protected $beforeInsert = ['setCreatedAt'];

    protected function setCreatedAt(array $data): array
    {
        $data['data']['created_at'] ??= date('Y-m-d H:i:s');

        return $data;
    }
}
