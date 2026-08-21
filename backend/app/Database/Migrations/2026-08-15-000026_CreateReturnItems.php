<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateReturnItems extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id' => ['type' => 'BIGINT', 'constraint' => 20, 'unsigned' => true, 'auto_increment' => true],
            'return_id' => ['type' => 'BIGINT', 'constraint' => 20, 'unsigned' => true],
            'sale_item_id' => ['type' => 'BIGINT', 'constraint' => 20, 'unsigned' => true],
            'product_id' => ['type' => 'BIGINT', 'constraint' => 20, 'unsigned' => true],
            'quantity' => ['type' => 'DECIMAL', 'constraint' => '15,4'],
            'unit_price' => ['type' => 'DECIMAL', 'constraint' => '15,2'],
            'refund_amount' => ['type' => 'DECIMAL', 'constraint' => '15,2'],
            'created_at' => ['type' => 'DATETIME', 'null' => true],
            'updated_at' => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addKey('return_id');
        $this->forge->addKey('sale_item_id');
        $this->forge->addKey('product_id');
        $this->forge->addForeignKey('return_id', 'returns', 'id', 'CASCADE', 'CASCADE');
        $this->forge->addForeignKey('sale_item_id', 'sale_items', 'id', 'RESTRICT', 'CASCADE');
        $this->forge->addForeignKey('product_id', 'products', 'id', 'RESTRICT', 'CASCADE');
        $this->forge->createTable('return_items', false, ($this->db->DBDriver === 'MySQLi' ? ['ENGINE' => 'InnoDB'] : []));
    }

    public function down()
    {
        $this->forge->dropTable('return_items', true);
    }
}
