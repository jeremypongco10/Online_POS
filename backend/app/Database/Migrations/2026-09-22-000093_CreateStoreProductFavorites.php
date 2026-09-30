<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Which products a store has starred as Favorites — the shortcut pill next
 * to Top Sellers on the POS product grid.
 *
 * Per (store, product), one shared list per branch rather than a setting on
 * each terminal: a store's front-of-shelf picks are a merchandising
 * decision, and per-terminal storage would drift between the desktop and the
 * tablet and vanish whenever a browser's site data is cleared.
 *
 * A table of its own rather than a flag on store_product_prices: that table
 * means "this store has priced this product", and a favourite is a separate
 * fact that shouldn't ride along with (or be clobbered by) a price upsert.
 * Both foreign keys cascade, so deleting a product or a branch — including
 * "Reset configuration", which deletes branches — takes its favourites with
 * it instead of being blocked by them.
 */
class CreateStoreProductFavorites extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id' => ['type' => 'BIGINT', 'constraint' => 20, 'unsigned' => true, 'auto_increment' => true],
            'store_id' => ['type' => 'BIGINT', 'constraint' => 20, 'unsigned' => true],
            'product_id' => ['type' => 'BIGINT', 'constraint' => 20, 'unsigned' => true],
            'created_at' => ['type' => 'DATETIME', 'null' => true],
            'updated_at' => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addUniqueKey(['store_id', 'product_id']);
        $this->forge->addKey('product_id');
        $this->forge->addForeignKey('store_id', 'stores', 'id', 'CASCADE', 'CASCADE');
        $this->forge->addForeignKey('product_id', 'products', 'id', 'CASCADE', 'CASCADE');
        $this->forge->createTable('store_product_favorites', false, ($this->db->DBDriver === 'MySQLi' ? ['ENGINE' => 'InnoDB'] : []));
    }

    public function down()
    {
        $this->forge->dropTable('store_product_favorites', true);
    }
}
