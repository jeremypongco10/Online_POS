<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Price is per (product, store) — a product has no default price of its
 * own. A store must have an explicit row here before the product can be
 * sold there; see the follow-up migration dropping products.cost_price/
 * selling_price.
 */
class CreateStoreProductPrices extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id' => ['type' => 'BIGINT', 'constraint' => 20, 'unsigned' => true, 'auto_increment' => true],
            'product_id' => ['type' => 'BIGINT', 'constraint' => 20, 'unsigned' => true],
            'store_id' => ['type' => 'BIGINT', 'constraint' => 20, 'unsigned' => true],
            'cost_price' => ['type' => 'DECIMAL', 'constraint' => '15,2', 'default' => 0],
            'selling_price' => ['type' => 'DECIMAL', 'constraint' => '15,2', 'default' => 0],
            'created_at' => ['type' => 'DATETIME', 'null' => true],
            'updated_at' => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addUniqueKey(['product_id', 'store_id']);
        $this->forge->addKey('store_id');
        $this->forge->addForeignKey('product_id', 'products', 'id', 'CASCADE', 'CASCADE');
        $this->forge->addForeignKey('store_id', 'stores', 'id', 'CASCADE', 'CASCADE');
        $this->forge->createTable('store_product_prices', false, ($this->db->DBDriver === 'MySQLi' ? ['ENGINE' => 'InnoDB'] : []));
    }

    public function down()
    {
        $this->forge->dropTable('store_product_prices', true);
    }
}
