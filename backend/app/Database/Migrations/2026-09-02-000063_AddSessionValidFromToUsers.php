<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Single-session enforcement for cashiers.
 *
 * Deliberately mirrors the existing `password_changed_at` mechanism rather
 * than introducing a second kind of session tracking: JwtAuthFilter already
 * rejects any token whose `iat` predates that column, so one more timestamp
 * invalidates a user's earlier sessions without having to enumerate and
 * revoke individual tokens. Stamping it on login is what makes the newest
 * sign-in win.
 */
class AddSessionValidFromToUsers extends Migration
{
    public function up()
    {
        $this->forge->addColumn('users', [
            'session_valid_from' => [
                'type' => 'DATETIME',
                'null' => true,
                'after' => 'password_changed_at',
                'comment' => 'Tokens issued before this are rejected — set on login for roles held to one session at a time.',
            ],
        ]);
    }

    public function down()
    {
        $this->forge->dropColumn('users', 'session_valid_from');
    }
}
