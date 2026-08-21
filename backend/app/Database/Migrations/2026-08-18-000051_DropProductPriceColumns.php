<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/** Price moved to store_product_prices (per-store, no product-level default) — see CreateStoreProductPrices. */
class DropProductPriceColumns extends Migration
{
    public function up()
    {
        $this->forge->dropColumn('products', ['cost_price', 'selling_price']);
    }

    public function down()
    {
        $this->forge->addColumn('products', [
            'cost_price' => ['type' => 'DECIMAL', 'constraint' => '15,2', 'default' => 0],
            'selling_price' => ['type' => 'DECIMAL', 'constraint' => '15,2', 'default' => 0],
        ]);
    }
}
