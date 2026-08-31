<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Lets a sale line exist with no real product behind it (a cashier-typed
 * "custom item" — name + price, no catalog entry) — see
 * SalesController::create()'s new empty($item['product_id']) branch and
 * SaleItemModel's now-permit_empty product_id rule. sale_items already has
 * nullable product_name/product_sku snapshot columns from
 * 2026-08-16-000044_AddInvoiceSnapshotFields — a custom item just leaves
 * product_id null and product_name holds the typed name.
 *
 * Runs the real ALTER on both drivers (unlike the NOT-NULL-*enforcing*
 * migrations elsewhere in this codebase that skip SQLite and rely on
 * app-level validation instead — this one *removes* a NOT NULL constraint
 * to unblock a code path the SQLite-backed PHPUnit suite needs to actually
 * exercise, so skipping isn't an option here). sale_items has an incoming
 * FK from return_items.sale_item_id (RESTRICT) — CI4's SQLite
 * modifyColumn() (rename-aside/recreate/copy-back, no lightweight ALTER
 * exists under SQLite) has once already this session left a *different*
 * dependent table's FK text stale after altering its referenced table;
 * tests/_support/build-test-db.php now has a generic repair pass for
 * exactly that failure mode (not hardcoded to the earlier products case),
 * so this was verified safe to attempt rather than avoided outright.
 */
class MakeSaleItemsProductIdNullable extends Migration
{
    public function up()
    {
        $this->forge->modifyColumn('sale_items', [
            'product_id' => [
                'name' => 'product_id',
                'type' => 'BIGINT',
                'constraint' => 20,
                'unsigned' => true,
                'null' => true,
            ],
        ]);
    }

    public function down()
    {
        $this->forge->modifyColumn('sale_items', [
            'product_id' => [
                'name' => 'product_id',
                'type' => 'BIGINT',
                'constraint' => 20,
                'unsigned' => true,
                'null' => false,
            ],
        ]);
    }
}
