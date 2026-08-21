<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateSales extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id' => ['type' => 'BIGINT', 'constraint' => 20, 'unsigned' => true, 'auto_increment' => true],
            'company_id' => ['type' => 'BIGINT', 'constraint' => 20, 'unsigned' => true],
            'store_id' => ['type' => 'BIGINT', 'constraint' => 20, 'unsigned' => true],
            'register_id' => ['type' => 'BIGINT', 'constraint' => 20, 'unsigned' => true],
            'cash_session_id' => ['type' => 'BIGINT', 'constraint' => 20, 'unsigned' => true, 'null' => true],
            'customer_id' => ['type' => 'BIGINT', 'constraint' => 20, 'unsigned' => true, 'null' => true],
            'user_id' => ['type' => 'BIGINT', 'constraint' => 20, 'unsigned' => true],
            'invoice_number' => ['type' => 'VARCHAR', 'constraint' => 40],
            'status' => ['type' => 'ENUM', 'constraint' => ['completed', 'voided', 'held'], 'default' => 'completed'],
            'sale_date' => ['type' => 'DATETIME'],
            'subtotal' => ['type' => 'DECIMAL', 'constraint' => '15,2', 'default' => 0],
            'discount_total' => ['type' => 'DECIMAL', 'constraint' => '15,2', 'default' => 0],
            'tax_total' => ['type' => 'DECIMAL', 'constraint' => '15,2', 'default' => 0],
            'total' => ['type' => 'DECIMAL', 'constraint' => '15,2', 'default' => 0],
            'amount_paid' => ['type' => 'DECIMAL', 'constraint' => '15,2', 'default' => 0],
            'change_due' => ['type' => 'DECIMAL', 'constraint' => '15,2', 'default' => 0],
            'notes' => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true],
            'created_at' => ['type' => 'DATETIME', 'null' => true],
            'updated_at' => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addKey('company_id');
        $this->forge->addKey('store_id');
        $this->forge->addKey('register_id');
        $this->forge->addKey('cash_session_id');
        $this->forge->addKey('customer_id');
        $this->forge->addKey('user_id');
        $this->forge->addKey('sale_date');
        $this->forge->addUniqueKey(['company_id', 'invoice_number']);
        $this->forge->addForeignKey('company_id', 'companies', 'id', 'CASCADE', 'CASCADE');
        $this->forge->addForeignKey('store_id', 'stores', 'id', 'RESTRICT', 'CASCADE');
        $this->forge->addForeignKey('register_id', 'registers', 'id', 'RESTRICT', 'CASCADE');
        $this->forge->addForeignKey('cash_session_id', 'cash_sessions', 'id', 'SET NULL', 'CASCADE');
        $this->forge->addForeignKey('customer_id', 'customers', 'id', 'SET NULL', 'CASCADE');
        $this->forge->addForeignKey('user_id', 'users', 'id', 'RESTRICT', 'CASCADE');
        $this->forge->createTable('sales', false, ($this->db->DBDriver === 'MySQLi' ? ['ENGINE' => 'InnoDB'] : []));
    }

    public function down()
    {
        $this->forge->dropTable('sales', true);
    }
}
