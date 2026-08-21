<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateCashSessions extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id' => ['type' => 'BIGINT', 'constraint' => 20, 'unsigned' => true, 'auto_increment' => true],
            'register_id' => ['type' => 'BIGINT', 'constraint' => 20, 'unsigned' => true],
            'user_id' => ['type' => 'BIGINT', 'constraint' => 20, 'unsigned' => true],
            'opened_at' => ['type' => 'DATETIME'],
            'closed_at' => ['type' => 'DATETIME', 'null' => true],
            'opening_balance' => ['type' => 'DECIMAL', 'constraint' => '15,2', 'default' => 0],
            'closing_balance' => ['type' => 'DECIMAL', 'constraint' => '15,2', 'null' => true],
            'expected_balance' => ['type' => 'DECIMAL', 'constraint' => '15,2', 'null' => true],
            'difference' => ['type' => 'DECIMAL', 'constraint' => '15,2', 'null' => true],
            'status' => ['type' => 'ENUM', 'constraint' => ['open', 'closed'], 'default' => 'open'],
            'notes' => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true],
            'created_at' => ['type' => 'DATETIME', 'null' => true],
            'updated_at' => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addKey('register_id');
        $this->forge->addKey('user_id');
        $this->forge->addKey('status');
        $this->forge->addForeignKey('register_id', 'registers', 'id', 'CASCADE', 'CASCADE');
        $this->forge->addForeignKey('user_id', 'users', 'id', 'RESTRICT', 'CASCADE');
        $this->forge->createTable('cash_sessions', false, ($this->db->DBDriver === 'MySQLi' ? ['ENGINE' => 'InnoDB'] : []));
    }

    public function down()
    {
        $this->forge->dropTable('cash_sessions', true);
    }
}
