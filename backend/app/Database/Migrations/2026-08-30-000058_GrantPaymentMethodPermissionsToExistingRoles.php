<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * RoleSeeder's own re-run only ever re-syncs Super Admin/Company Admin
 * (see its $alwaysSyncRoles comment — every other role is a starting
 * point an admin may have already customized, so re-seeding never
 * touches it again after creation). That's the right default, but it
 * also means the two new payment-methods permissions never reach any
 * Store Manager, Cashier Supervisor, or Cashier role that already
 * existed before this feature shipped — and a Cashier without
 * payment-methods.view can't even load the method list at checkout, so
 * this can't be left to "an admin will notice eventually" the way a
 * genuinely optional permission could be. Grants it directly, by role
 * name, matching exactly what RoleSeeder would hand a freshly-created
 * role of the same name — safe to run more than once (checks for an
 * existing grant first) and touches nothing an admin has since changed
 * beyond adding these slugs.
 *
 * Store Admin deliberately excluded — an admin using this account
 * requested payment-methods access be kept off it specifically, even
 * though RoleSeeder's own role definition would otherwise give it every
 * permission (Store Admin gets $allSlugs at role-creation time).
 */
class GrantPaymentMethodPermissionsToExistingRoles extends Migration
{
    private const GRANTS = [
        'Store Manager' => ['payment-methods.view', 'payment-methods.manage'],
        'Cashier Supervisor' => ['payment-methods.view'],
        'Cashier' => ['payment-methods.view'],
    ];

    public function up()
    {
        $now = date('Y-m-d H:i:s');

        $permissionIdBySlug = [];
        foreach ($this->db->table('permissions')->whereIn('slug', ['payment-methods.view', 'payment-methods.manage'])->get()->getResult() as $row) {
            $permissionIdBySlug[$row->slug] = $row->id;
        }

        foreach (self::GRANTS as $roleName => $slugs) {
            $roles = $this->db->table('roles')->where('name', $roleName)->get()->getResult();

            foreach ($roles as $role) {
                foreach ($slugs as $slug) {
                    if (! isset($permissionIdBySlug[$slug])) {
                        continue;
                    }

                    $exists = $this->db->table('role_permissions')
                        ->where('role_id', $role->id)
                        ->where('permission_id', $permissionIdBySlug[$slug])
                        ->get()->getFirstRow();

                    if ($exists) {
                        continue;
                    }

                    $this->db->table('role_permissions')->insert([
                        'role_id' => $role->id,
                        'permission_id' => $permissionIdBySlug[$slug],
                        'created_at' => $now,
                    ]);
                }
            }
        }
    }

    public function down()
    {
        $slugs = array_unique(array_merge(...array_values(self::GRANTS)));

        $permissionIds = array_column(
            $this->db->table('permissions')->whereIn('slug', $slugs)->get()->getResultArray(),
            'id'
        );

        if ($permissionIds !== []) {
            $roleNames = array_keys(self::GRANTS);
            $roleIds = array_column($this->db->table('roles')->whereIn('name', $roleNames)->get()->getResultArray(), 'id');

            if ($roleIds !== []) {
                $this->db->table('role_permissions')
                    ->whereIn('role_id', $roleIds)
                    ->whereIn('permission_id', $permissionIds)
                    ->delete();
            }
        }
    }
}
