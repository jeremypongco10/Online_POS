<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreatePurchaseOrders extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id' => ['type' => 'BIGINT', 'constraint' => 20, 'unsigned' => true, 'auto_increment' => true],
            'company_id' => ['type' => 'BIGINT', 'constraint' => 20, 'unsigned' => true],
            'store_id' => ['type' => 'BIGINT', 'constraint' => 20, 'unsigned' => true],
            'supplier_id' => ['type' => 'BIGINT', 'constraint' => 20, 'unsigned' => true],
            'user_id' => ['type' => 'BIGINT', 'constraint' => 20, 'unsigned' => true, 'null' => true],
            'po_number' => ['type' => 'VARCHAR', 'constraint' => 40],
            'status' => ['type' => 'ENUM', 'constraint' => ['draft', 'ordered', 'received', 'cancelled'], 'default' => 'draft'],
            'order_date' => ['type' => 'DATE', 'null' => true],
            'expected_date' => ['type' => 'DATE', 'null' => true],
            'received_date' => ['type' => 'DATE', 'null' => true],
            'subtotal' => ['type' => 'DECIMAL', 'constraint' => '15,2', 'default' => 0],
            'tax_total' => ['type' => 'DECIMAL', 'constraint' => '15,2', 'default' => 0],
            'total' => ['type' => 'DECIMAL', 'constraint' => '15,2', 'default' => 0],
            'notes' => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true],
            'created_at' => ['type' => 'DATETIME', 'null' => true],
            'updated_at' => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addKey('company_id');
        $this->forge->addKey('store_id');
        $this->forge->addKey('supplier_id');
        $this->forge->addKey('status');
        $this->forge->addUniqueKey(['company_id', 'po_number']);
        $this->forge->addForeignKey('company_id', 'companies', 'id', 'CASCADE', 'CASCADE');
        $this->forge->addForeignKey('store_id', 'stores', 'id', 'RESTRICT', 'CASCADE');
        $this->forge->addForeignKey('supplier_id', 'suppliers', 'id', 'RESTRICT', 'CASCADE');
        $this->forge->addForeignKey('user_id', 'users', 'id', 'SET NULL', 'CASCADE');
        $this->forge->createTable('purchase_orders', false, ($this->db->DBDriver === 'MySQLi' ? ['ENGINE' => 'InnoDB'] : []));
    }

    public function down()
    {
        $this->forge->dropTable('purchase_orders', true);
    }
}
