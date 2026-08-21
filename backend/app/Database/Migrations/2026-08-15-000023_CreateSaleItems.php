<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateSaleItems extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id' => ['type' => 'BIGINT', 'constraint' => 20, 'unsigned' => true, 'auto_increment' => true],
            'sale_id' => ['type' => 'BIGINT', 'constraint' => 20, 'unsigned' => true],
            'product_id' => ['type' => 'BIGINT', 'constraint' => 20, 'unsigned' => true],
            'quantity' => ['type' => 'DECIMAL', 'constraint' => '15,4'],
            'unit_price' => ['type' => 'DECIMAL', 'constraint' => '15,2'],
            'discount' => ['type' => 'DECIMAL', 'constraint' => '15,2', 'default' => 0],
            'tax_rate' => ['type' => 'DECIMAL', 'constraint' => '7,4', 'default' => 0],
            'tax_amount' => ['type' => 'DECIMAL', 'constraint' => '15,2', 'default' => 0],
            'line_total' => ['type' => 'DECIMAL', 'constraint' => '15,2'],
            'created_at' => ['type' => 'DATETIME', 'null' => true],
            'updated_at' => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addKey('sale_id');
        $this->forge->addKey('product_id');
        $this->forge->addForeignKey('sale_id', 'sales', 'id', 'CASCADE', 'CASCADE');
        $this->forge->addForeignKey('product_id', 'products', 'id', 'RESTRICT', 'CASCADE');
        $this->forge->createTable('sale_items', false, ($this->db->DBDriver === 'MySQLi' ? ['ENGINE' => 'InnoDB'] : []));
    }

    public function down()
    {
        $this->forge->dropTable('sale_items', true);
    }
}
