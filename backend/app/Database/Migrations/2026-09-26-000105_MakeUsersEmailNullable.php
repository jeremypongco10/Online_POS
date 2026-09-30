<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Email is no longer collected when a Back Office admin creates a user
 * (see UsersScreen's "Add User" form) — accounts can now be identified by
 * username alone. The column has to actually allow NULL for that: leaving
 * it NOT NULL would force the frontend to send an empty string instead,
 * and a second blank-email account would then collide with the first on
 * the existing unique key (MySQL's unique index treats '' as a real,
 * comparable value, but allows any number of NULLs through untouched).
 *
 * Same rebuild-corrupts-FKs issue as EnforceCustomerNameFieldsNotNull —
 * skipped for SQLite; UserModel's own validation rule (permit_empty, not
 * required) is what actually governs this at the application layer, and
 * the test DB is rebuilt fresh from migrations either way.
 */
class MakeUsersEmailNullable extends Migration
{
    public function up()
    {
        if ($this->db->DBDriver === 'MySQLi') {
            $this->forge->modifyColumn('users', [
                'email' => ['name' => 'email', 'type' => 'VARCHAR', 'constraint' => 150, 'null' => true],
            ]);
        }
    }

    public function down()
    {
        if ($this->db->DBDriver === 'MySQLi') {
            $this->forge->modifyColumn('users', [
                'email' => ['name' => 'email', 'type' => 'VARCHAR', 'constraint' => 150, 'null' => false],
            ]);
        }
    }
}
