<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Phase 17: cash movements â€” paid-ins/paid-outs against an open
 * register that aren't sales (e.g. petty cash withdrawal, change fund
 * top-up) â€” feed into the Expected Cash calculation at close time
 * alongside opening cash and cash sales.
 */
class CreateCashMovements extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id' => ['type' => 'BIGINT', 'constraint' => 20, 'unsigned' => true, 'auto_increment' => true],
            'cash_session_id' => ['type' => 'BIGINT', 'constraint' => 20, 'unsigned' => true],
            'type' => ['type' => 'ENUM', 'constraint' => ['cash_in', 'cash_out']],
            'amount' => ['type' => 'DECIMAL', 'constraint' => '15,2'],
            'reason' => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true],
            'user_id' => ['type' => 'BIGINT', 'constraint' => 20, 'unsigned' => true, 'null' => true],
            'created_at' => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addKey('cash_session_id');
        $this->forge->addForeignKey('cash_session_id', 'cash_sessions', 'id', 'CASCADE', 'CASCADE');
        $this->forge->addForeignKey('user_id', 'users', 'id', 'SET NULL', 'CASCADE');
        $this->forge->createTable('cash_movements', false, ($this->db->DBDriver === 'MySQLi' ? ['ENGINE' => 'InnoDB'] : []));
    }

    public function down()
    {
        $this->forge->dropTable('cash_movements', true);
    }
}
