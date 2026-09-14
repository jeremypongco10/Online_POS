<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Inserts the two invoice-series permission rows directly (idempotent,
 * checked by slug) and grants them to existing roles by name — the same
 * two-part job `2026-08-30-000058_GrantPaymentMethodPermissionsToExistingRoles.php`
 * does for payment methods, needed for the identical reason: PermissionSeeder's
 * own idempotent insert and RoleSeeder's role definitions (both updated
 * alongside this migration) only take effect on a fresh install or a
 * deliberate re-seed, and this backfills an already-running install
 * without requiring one.
 *
 * Super Admin/Company Admin deliberately excluded — RoleSeeder's own
 * `$alwaysSyncRoles` re-syncs those two to every current permission
 * (including these) the next time it runs at all, the same reasoning the
 * payment-methods precedent already established. Store Admin is
 * explicitly granted here because it's created with `$allSlugs` too but,
 * unlike Super Admin/Company Admin, is never in `$alwaysSyncRoles` — an
 * existing Store Admin role would otherwise never pick this up.
 * Cashier/Cashier Supervisor/Bagger get nothing: invoice series
 * configuration is an administrative concern a cashier never needs to
 * see, let alone touch (see requirement #10 in the module's own design).
 */
class GrantInvoiceSeriesPermissionsToExistingRoles extends Migration
{
    private const SLUGS = [
        'invoice-series.view' => ['View Invoice Series', 'Can view sales invoice numbering series and their configuration'],
        'invoice-series.manage' => ['Manage Invoice Series', 'Can create, edit, activate, and deactivate sales invoice numbering series'],
    ];

    private const GRANTS = [
        'Store Admin' => ['invoice-series.view', 'invoice-series.manage'],
        'Store Manager' => ['invoice-series.view', 'invoice-series.manage'],
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
