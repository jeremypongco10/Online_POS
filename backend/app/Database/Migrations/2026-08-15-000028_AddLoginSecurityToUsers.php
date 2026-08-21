<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddLoginSecurityToUsers extends Migration
{
    public function up()
    {
        $this->forge->addColumn('users', [
            'failed_login_attempts' => [
                'type' => 'INT',
                'constraint' => 10,
                'unsigned' => true,
                'default' => 0,
                'after' => 'password_hash',
            ],
            'locked_until' => [
                'type' => 'DATETIME',
                'null' => true,
                'after' => 'failed_login_attempts',
            ],
        ]);
    }

    public function down()
    {
        $this->forge->dropColumn('users', ['failed_login_attempts', 'locked_until']);
    }
}
