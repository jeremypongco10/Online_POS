<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * A single, append-only trail of every create/update/delete across the
 * app — who did it, when, to what, and (for updates) exactly which fields
 * changed. user_id/user_name are both kept: user_id for a live join back
 * to the user record, user_name as a permanent snapshot so a log entry
 * still reads correctly after that user is deleted. Rows here are never
 * updated or deleted through the API — see AuditLogsController.
 */
class CreateAuditLogs extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id' => ['type' => 'BIGINT', 'constraint' => 20, 'unsigned' => true, 'auto_increment' => true],
            'company_id' => ['type' => 'BIGINT', 'constraint' => 20, 'unsigned' => true],
            'user_id' => ['type' => 'BIGINT', 'constraint' => 20, 'unsigned' => true, 'null' => true],
            'user_name' => ['type' => 'VARCHAR', 'constraint' => 150, 'null' => true],
            'action' => ['type' => 'VARCHAR', 'constraint' => 30],
            'entity_type' => ['type' => 'VARCHAR', 'constraint' => 60],
            'entity_id' => ['type' => 'BIGINT', 'constraint' => 20, 'unsigned' => true, 'null' => true],
            'entity_label' => ['type' => 'VARCHAR', 'constraint' => 150, 'null' => true],
            'changes' => ['type' => 'TEXT', 'null' => true],
            'ip_address' => ['type' => 'VARCHAR', 'constraint' => 45, 'null' => true],
            'created_at' => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addKey('company_id');
        $this->forge->addKey(['entity_type', 'entity_id']);
        $this->forge->addKey('user_id');
        $this->forge->addKey('created_at');
        $this->forge->addForeignKey('company_id', 'companies', 'id', 'CASCADE', 'CASCADE');
        $this->forge->addForeignKey('user_id', 'users', 'id', 'SET NULL', 'CASCADE');
        $this->forge->createTable('audit_logs', false, ($this->db->DBDriver === 'MySQLi' ? ['ENGINE' => 'InnoDB'] : []));
    }

    public function down()
    {
        $this->forge->dropTable('audit_logs', true);
    }
}
