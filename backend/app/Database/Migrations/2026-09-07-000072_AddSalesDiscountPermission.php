<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * A brand-new permission (unlike GrantCategoriesViewToExistingCashierRole
 * or GrantPaymentMethodPermissionsToExistingRoles, which backfilled a
 * grant for a permission that already existed) — so this migration both
 * inserts the `permissions` row itself and grants it, rather than relying
 * on PermissionSeeder having been re-run first. PermissionSeeder still
 * carries the same entry (see its `sales.discount` line) for a fresh
 * install; this is the existing-install path.
 *
 * Same authority as sales.void, on purpose: this is the "a supervisor
 * signs off on this register action" permission the app already has,
 * and Manual Discount is exactly that kind of action. Granted to every
 * role that already holds sales.void, minus none — the set is identical
 * — plus Super Admin/Company Admin/Store Admin, which hold every
 * permission that exists by design (RoleSeeder's $allSlugs) and so are
 * included explicitly here rather than left to a re-seed that may never
 * happen on an existing install.
 */
class AddSalesDiscountPermission extends Migration
{
    private const SLUG = 'sales.discount';
    private const ROLE_NAMES = ['Super Admin', 'Company Admin', 'Store Admin', 'Store Manager', 'Cashier Supervisor'];

    public function up()
    {
        $now = date('Y-m-d H:i:s');

        $permission = $this->db->table('permissions')->where('slug', self::SLUG)->get()->getFirstRow();
        if (! $permission) {
            $this->db->table('permissions')->insert([
                'name' => 'Approve Discounts',
                'slug' => self::SLUG,
                'description' => 'Can approve a manual/discretionary discount that falls outside the standard discount types',
                'created_at' => $now,
                'updated_at' => $now,
            ]);
            $permission = $this->db->table('permissions')->where('slug', self::SLUG)->get()->getFirstRow();
        }

        $roles = $this->db->table('roles')->whereIn('name', self::ROLE_NAMES)->get()->getResult();

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
        $permission = $this->db->table('permissions')->where('slug', self::SLUG)->get()->getFirstRow();
        if (! $permission) {
            return;
        }

        $this->db->table('role_permissions')->where('permission_id', $permission->id)->delete();
        $this->db->table('permissions')->where('id', $permission->id)->delete();
    }
}
