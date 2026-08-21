<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateLoyaltyCards extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id' => ['type' => 'BIGINT', 'constraint' => 20, 'unsigned' => true, 'auto_increment' => true],
            'customer_id' => ['type' => 'BIGINT', 'constraint' => 20, 'unsigned' => true],
            'card_number' => ['type' => 'VARCHAR', 'constraint' => 40],
            'points' => ['type' => 'BIGINT', 'constraint' => 20, 'default' => 0],
            'balance' => ['type' => 'DECIMAL', 'constraint' => '15,2', 'default' => 0],
            'issued_at' => ['type' => 'DATETIME', 'null' => true],
            'expires_at' => ['type' => 'DATETIME', 'null' => true],
            'is_active' => ['type' => 'TINYINT', 'constraint' => 1, 'unsigned' => true, 'default' => 1],
            'created_at' => ['type' => 'DATETIME', 'null' => true],
            'updated_at' => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addKey('customer_id');
        $this->forge->addUniqueKey('card_number');
        $this->forge->addForeignKey('customer_id', 'customers', 'id', 'CASCADE', 'CASCADE');
        $this->forge->createTable('loyalty_cards', false, ($this->db->DBDriver === 'MySQLi' ? ['ENGINE' => 'InnoDB'] : []));
    }

    public function down()
    {
        $this->forge->dropTable('loyalty_cards', true);
    }
}
