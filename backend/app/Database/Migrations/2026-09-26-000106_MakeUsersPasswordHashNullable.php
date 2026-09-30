<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * The Bagger role never signs in — a bagger is only ever picked from a
 * list by an already-logged-in cashier (see BaggerPanel / UsersController::
 * create()'s roleIsBagger() check), so Add User no longer requires a
 * password for that role. password_hash has to actually allow NULL for
 * that: left NOT NULL with no default, an insert that omits it would
 * either fail outright (strict SQL mode) or silently store an empty
 * string, which AuthController::login() would then need to guard against
 * anyway. NULL is the honest way to say "no password set."
 *
 * Same rebuild-corrupts-FKs issue as EnforceCustomerNameFieldsNotNull —
 * skipped for SQLite; the test DB is rebuilt fresh from migrations either
 * way.
 */
class MakeUsersPasswordHashNullable extends Migration
{
    public function up()
    {
        if ($this->db->DBDriver === 'MySQLi') {
            $this->forge->modifyColumn('users', [
                'password_hash' => ['name' => 'password_hash', 'type' => 'VARCHAR', 'constraint' => 255, 'null' => true],
            ]);
        }
    }

    public function down()
    {
        if ($this->db->DBDriver === 'MySQLi') {
            $this->forge->modifyColumn('users', [
                'password_hash' => ['name' => 'password_hash', 'type' => 'VARCHAR', 'constraint' => 255, 'null' => false],
            ]);
        }
    }
}
