<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Inserts the chat.access permission row and grants it to existing roles
 * by name — the same two-part job the payment-methods/invoice-series/
 * readings migrations before it do, for the identical reason:
 * PermissionSeeder's idempotent insert and RoleSeeder's role definitions
 * (both updated alongside this migration) only take effect on a fresh
 * install, and this backfills an already-running one.
 *
 * Deliberately excludes Cashier and Cashier Supervisor — the two roles
 * POS_ROLES (frontend) already draws the line at for "spends their day at
 * the register" versus everyone else. Chat is Back Office staff messaging
 * each other; it has no POS-side UI at all, so granting it to either
 * register-bound role would be a permission with nothing to reach.
 *
 * Super Admin/Company Admin are included explicitly here rather than left
 * to "RoleSeeder re-syncs them later" the way the reading-permissions
 * migration reasons about it — that re-sync only actually happens if
 * someone manually reruns `php spark db:seed RoleSeeder` on this exact
 * install, which isn't guaranteed to have occurred. Granting it to all
 * four non-register roles here directly is a harmless no-op wherever it
 * already holds true, and the only way to be sure a company's own admin
 * account isn't left unable to see its own chat feature.
 */
class GrantChatPermissionToExistingRoles extends Migration
{
    private const SLUG = 'chat.access';
    private const NAME = 'Access Chat';
    private const DESCRIPTION = 'Can send and receive Back Office direct messages';

    private const GRANT_TO_ROLES = ['Super Admin', 'Company Admin', 'Store Admin', 'Store Manager'];

    public function up()
    {
        $now = date('Y-m-d H:i:s');

        $existing = $this->db->table('permissions')->where('slug', self::SLUG)->get()->getFirstRow();
        if (! $existing) {
            $this->db->table('permissions')->insert([
                'name' => self::NAME,
                'slug' => self::SLUG,
                'description' => self::DESCRIPTION,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }

        $permissionId = $this->db->table('permissions')->where('slug', self::SLUG)->get()->getFirstRow()->id;

        foreach ($this->db->table('roles')->whereIn('name', self::GRANT_TO_ROLES)->get()->getResult() as $role) {
            $exists = $this->db->table('role_permissions')
                ->where('role_id', $role->id)
                ->where('permission_id', $permissionId)
                ->get()->getFirstRow();

            if ($exists) {
                continue;
            }

            $this->db->table('role_permissions')->insert([
                'role_id' => $role->id,
                'permission_id' => $permissionId,
                'created_at' => $now,
            ]);
        }
    }

    public function down()
    {
        $permission = $this->db->table('permissions')->where('slug', self::SLUG)->get()->getFirstRow();

        if ($permission) {
            $roleIds = array_column(
                $this->db->table('roles')->whereIn('name', self::GRANT_TO_ROLES)->get()->getResultArray(),
                'id'
            );
            if ($roleIds !== []) {
                $this->db->table('role_permissions')
                    ->whereIn('role_id', $roleIds)
                    ->where('permission_id', $permission->id)
                    ->delete();
            }
        }

        $this->db->table('permissions')->where('slug', self::SLUG)->delete();
    }
}
