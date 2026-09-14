<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Inserts the two X/Z-reading permission rows directly (idempotent,
 * checked by slug) and grants them to existing roles by name — the same
 * two-part job the payment-methods and invoice-series migrations before
 * it do, and for the identical reason: PermissionSeeder's own idempotent
 * insert and RoleSeeder's role definitions (both updated alongside this
 * migration) only take effect on a fresh install or a deliberate
 * re-seed, and this backfills an already-running install without
 * requiring one.
 *
 * Super Admin/Company Admin deliberately excluded — RoleSeeder's own
 *  re-syncs those two to every current permission the
 * next time it runs at all. Store Admin is explicitly granted because it
 * is created with  but never re-synced.
 *
 * Unlike invoice-series, the register-facing roles DO get these: taking a
 * reading is a till operation, not an administrative one. The split
 * between them is where the authority actually differs — a cashier reads
 * their own figures mid-shift (readings.view), while closing the period
 * into a permanent, counter-advancing Z is a supervisor action
 * (readings.manage).
 */
class GrantReadingPermissionsToExistingRoles extends Migration
{
    private const SLUGS = [
        'readings.view' => ['View X/Z Readings', 'Can take an X-reading and view issued Z-readings'],
        'readings.manage' => ['Generate Z-Readings', 'Can close the period and issue a Z-reading'],
    ];

    private const GRANTS = [
        'Store Admin' => ['readings.view', 'readings.manage'],
        'Store Manager' => ['readings.view', 'readings.manage'],
        'Cashier Supervisor' => ['readings.view', 'readings.manage'],
        // X-reading only — closing the period into a permanent Z is a
        // supervisor action, matching RoleSeeder's own split.
        'Cashier' => ['readings.view'],
    ];

    public function up()
    {
        $now = date('Y-m-d H:i:s');

        foreach (self::SLUGS as $slug => [$name, $description]) {
            $exists = $this->db->table('permissions')->where('slug', $slug)->get()->getFirstRow();
            if ($exists) {
                continue;
            }

            $this->db->table('permissions')->insert([
                'name' => $name,
                'slug' => $slug,
                'description' => $description,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }

        $permissionIdBySlug = [];
        foreach ($this->db->table('permissions')->whereIn('slug', array_keys(self::SLUGS))->get()->getResult() as $row) {
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
        $permissionIds = array_column(
            $this->db->table('permissions')->whereIn('slug', array_keys(self::SLUGS))->get()->getResultArray(),
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

        $this->db->table('permissions')->whereIn('slug', array_keys(self::SLUGS))->delete();
    }
}
