<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * A customer's points balance is derived by summing this table rather
 * than trusted from a mutable counter — every manual adjustment made
 * from the Customers page inserts a row here instead of incrementing
 * loyalty_cards.points directly, so the balance shown is always exactly
 * what the history accounts for.
 */
class CreateLoyaltyPointTransactions extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id' => ['type' => 'BIGINT', 'constraint' => 20, 'unsigned' => true, 'auto_increment' => true],
            'customer_id' => ['type' => 'BIGINT', 'constraint' => 20, 'unsigned' => true],
            'loyalty_card_id' => ['type' => 'BIGINT', 'constraint' => 20, 'unsigned' => true],
            'points_delta' => ['type' => 'BIGINT', 'constraint' => 20],
            'balance_after' => ['type' => 'BIGINT', 'constraint' => 20],
            'note' => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true],
            'created_by' => ['type' => 'BIGINT', 'constraint' => 20, 'unsigned' => true, 'null' => true],
            'created_at' => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addKey('customer_id');
        $this->forge->addKey('loyalty_card_id');
        $this->forge->addForeignKey('customer_id', 'customers', 'id', 'CASCADE', 'CASCADE');
        $this->forge->addForeignKey('loyalty_card_id', 'loyalty_cards', 'id', 'CASCADE', 'CASCADE');
        $this->forge->addForeignKey('created_by', 'users', 'id', 'SET NULL', 'CASCADE');
        $this->forge->createTable('loyalty_point_transactions', false, ($this->db->DBDriver === 'MySQLi' ? ['ENGINE' => 'InnoDB'] : []));
    }

    public function down()
    {
        $this->forge->dropTable('loyalty_point_transactions', true);
    }
}
