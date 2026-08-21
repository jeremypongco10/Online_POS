<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Products maintain a base selling price and minimum stock directly
 * (the common case), while `product_prices` remains available for
 * per-store/wholesale/promo overrides layered on top of this default.
 */
class AddSellingPriceAndMinStockToProducts extends Migration
{
    public function up()
    {
        $this->forge->addColumn('products', [
            'selling_price' => [
                'type' => 'DECIMAL',
                'constraint' => '15,2',
                'default' => 0,
                'after' => 'cost_price',
            ],
            'minimum_stock' => [
                'type' => 'DECIMAL',
                'constraint' => '15,4',
                'default' => 0,
                'after' => 'selling_price',
            ],
        ]);
    }

    public function down()
    {
        $this->forge->dropColumn('products', ['selling_price', 'minimum_stock']);
    }
}
