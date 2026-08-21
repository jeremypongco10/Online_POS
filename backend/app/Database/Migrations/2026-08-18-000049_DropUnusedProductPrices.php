<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * `product_prices` (store_id/price_type/date-range overrides) was created
 * ahead of need and never wired up to any controller. Removed in favor of
 * `store_product_prices` (see CreateStoreProductPrices), which is what
 * per-store pricing actually shipped as: every store must have its own
 * explicit cost/selling price, no product-level default to fall back to.
 */
class DropUnusedProductPrices extends Migration
{
    public function up()
    {
        $this->forge->dropTable('product_prices', true);
    }

    public function down()
    {
        $this->forge->addField([
            'id' => ['type' => 'BIGINT', 'constraint' => 20, 'unsigned' => true, 'auto_increment' => true],
            'product_id' => ['type' => 'BIGINT', 'constraint' => 20, 'unsigned' => true],
            'store_id' => ['type' => 'BIGINT', 'constraint' => 20, 'unsigned' => true, 'null' => true],
            'price' => ['type' => 'DECIMAL', 'constraint' => '15,2'],
            'price_type' => ['type' => 'ENUM', 'constraint' => ['retail', 'wholesale', 'promo'], 'default' => 'retail'],
            'starts_at' => ['type' => 'DATETIME', 'null' => true],
            'ends_at' => ['type' => 'DATETIME', 'null' => true],
            'is_active' => ['type' => 'TINYINT', 'constraint' => 1, 'unsigned' => true, 'default' => 1],
            'created_at' => ['type' => 'DATETIME', 'null' => true],
            'updated_at' => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addKey('product_id');
        $this->forge->addKey('store_id');
        $this->forge->addKey(['product_id', 'store_id', 'price_type']);
        $this->forge->addForeignKey('product_id', 'products', 'id', 'CASCADE', 'CASCADE');
        $this->forge->addForeignKey('store_id', 'stores', 'id', 'CASCADE', 'CASCADE');
        $this->forge->createTable('product_prices', false, ($this->db->DBDriver === 'MySQLi' ? ['ENGINE' => 'InnoDB'] : []));
    }
}
