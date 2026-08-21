<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * JWTs are stateless by design, so "logout" needs an explicit
 * revocation list: any jti in here is treated as invalid even if
 * its signature/expiry are still otherwise valid. Rows can be
 * purged once expires_at is in the past.
 */
class CreateRevokedTokens extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'jti' => ['type' => 'VARCHAR', 'constraint' => 36],
            'user_id' => ['type' => 'BIGINT', 'constraint' => 20, 'unsigned' => true],
            'expires_at' => ['type' => 'DATETIME'],
            'revoked_at' => ['type' => 'DATETIME'],
        ]);
        $this->forge->addKey('jti', true);
        $this->forge->addKey('user_id');
        $this->forge->addKey('expires_at');
        $this->forge->addForeignKey('user_id', 'users', 'id', 'CASCADE', 'CASCADE');
        $this->forge->createTable('revoked_tokens', false, ($this->db->DBDriver === 'MySQLi' ? ['ENGINE' => 'InnoDB'] : []));
    }

    public function down()
    {
        $this->forge->dropTable('revoked_tokens', true);
    }
}
