<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Lets a password reset invalidate every access token issued before
 * the reset, without having to track every individual jti: JwtAuthFilter
 * rejects any token whose `iat` predates this timestamp.
 */
class AddPasswordChangedAtToUsers extends Migration
{
    public function up()
    {
        $this->forge->addColumn('users', [
            'password_changed_at' => [
                'type' => 'DATETIME',
                'null' => true,
                'after' => 'locked_until',
            ],
        ]);
    }

    public function down()
    {
        $this->forge->dropColumn('users', ['password_changed_at']);
    }
}
