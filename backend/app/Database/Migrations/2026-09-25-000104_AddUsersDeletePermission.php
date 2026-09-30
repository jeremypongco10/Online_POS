<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Inserts the users.delete permission row — the one permission this app
 * grants to NO role by default, not even Super Admin/Company Admin.
 * Every other permission-adding migration in this project's history
 * explicitly includes those two (see e.g. GrantChatPermissionToExisting
 * Roles's own reasoning), because "full access" is meant to actually mean
 * full access. This one is the deliberate exception: a genuine, permanent
 * delete bypasses the deactivate-only workflow every real account in this
 * app is meant to use (see UsersController::delete()'s own docblock), so
 * handing it to "full access" roles by default would be handing every
 * Super Admin/Company Admin a footgun nobody asked for.
 *
 * It exists in the catalog (so it CAN be granted, via the ordinary Roles
 * → Permissions screen, to whichever role a company actually wants to
 * have it — e.g. a narrow dev/test-cleanup role) without this migration
 * or PermissionSeeder ever assuming who that should be.
 */
class AddUsersDeletePermission extends Migration
{
    private const SLUG = 'users.delete';
    private const NAME = 'Delete Users';
    private const DESCRIPTION = 'Can permanently delete a user account (not deactivate) — bypasses the normal deactivate-only workflow';

    public function up()
    {
        $existing = $this->db->table('permissions')->where('slug', self::SLUG)->get()->getFirstRow();
        if ($existing) {
            return;
        }

        $now = date('Y-m-d H:i:s');
        $this->db->table('permissions')->insert([
            'name' => self::NAME,
            'slug' => self::SLUG,
            'description' => self::DESCRIPTION,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
    }

    public function down()
    {
        // Also drops any role_permissions rows granting it (CASCADE via
        // permission_id's own FK — see CreateRolePermissions), whichever
        // role(s) an install had actually handed it to.
        $this->db->table('permissions')->where('slug', self::SLUG)->delete();
    }
}
