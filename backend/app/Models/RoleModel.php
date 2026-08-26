<?php

namespace App\Models;

use CodeIgniter\Model;

class RoleModel extends Model
{
    protected $table = 'roles';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'object';
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';

    protected $allowedFields = [
        'company_id', 'name', 'description', 'is_system',
    ];

    protected $validationRules = [
        'company_id' => ['label' => 'Company', 'rules' => 'required|is_natural_no_zero'],
        'name' => ['label' => 'Name', 'rules' => 'required|min_length[2]|max_length[100]'],
        'description' => ['label' => 'Description', 'rules' => 'permit_empty|max_length[255]'],
        'is_system' => ['label' => 'System role', 'rules' => 'permit_empty|in_list[0,1]'],
    ];

    public function permissionSlugs(int $roleId): array
    {
        $rows = $this->db->table('role_permissions rp')
            ->select('p.slug')
            ->join('permissions p', 'p.id = rp.permission_id')
            ->where('rp.role_id', $roleId)
            ->get()->getResult();

        return array_map(static fn ($row) => $row->slug, $rows);
    }
}
