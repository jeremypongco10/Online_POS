<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Pre-existing gap, unrelated to any feature shipped this session: every
 * other role RoleSeeder.php gives 'categories.view' to (Cashier Supervisor,
 * Store Manager, Store Admin, plus Super/Company Admin via $allSlugs)
 * already has it in this database — only 'Cashier' doesn't, presumably
 * because whatever seed run originally created it predates
 * 'categories.view' being added to its definition, and re-seeding never
 * re-syncs an already-existing non-admin role (see RoleSeeder's own
 * $alwaysSyncRoles comment). Nothing in the POS screen needed this
 * permission before — the product search never called
 * GET /categories/tree — so the gap was invisible until category browsing
 * became load-bearing for every Cashier.
 */
class GrantCategoriesViewToExistingCashierRole extends Migration
{
    public function up()
    {
        $permission = $this->db->table('permissions')->where('slug', 'categories.view')->get()->getFirstRow();
        if (! $permission) {
            return;
        }

        $now = date('Y-m-d H:i:s');
        $roles = $this->db->table('roles')->where('name', 'Cashier')->get()->getResult();

        foreach ($roles as $role) {
            $exists = $this->db->table('role_permissions')
                ->where('role_id', $role->id)
                ->where('permission_id', $permission->id)
                ->get()->getFirstRow();

            if ($exists) {
                continue;
            }

            $this->db->table('role_permissions')->insert([
                'role_id' => $role->id,
                'permission_id' => $permission->id,
                'created_at' => $now,
            ]);
        }
    }

    public function down()
    {
        $permission = $this->db->table('permissions')->where('slug', 'categories.view')->get()->getFirstRow();
        if (! $permission) {
            return;
        }

        $roleIds = array_column($this->db->table('roles')->where('name', 'Cashier')->get()->getResultArray(), 'id');
        if ($roleIds === []) {
            return;
        }

        $this->db->table('role_permissions')->whereIn('role_id', $roleIds)->where('permission_id', $permission->id)->delete();
    }
}
