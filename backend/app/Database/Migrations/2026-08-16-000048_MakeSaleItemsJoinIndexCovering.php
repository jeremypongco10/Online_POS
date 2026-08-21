<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Phase 24 follow-up: product-sales/category-sales/top-products reports
 * join sale_items to sales on sale_id, then aggregate quantity and
 * line_total grouped by product_id. sale_items already had a plain
 * sale_id index for the join itself, but MySQL still had to look up the
 * actual row to read product_id/quantity/line_total for every matching
 * item — at 5M sale_items, that's the dominant cost once the sales side
 * of the join is already covering (see MakeSalesReportIndexCovering).
 * Appending those three columns makes the sale_items side of the join
 * covering too.
 */
class MakeSaleItemsJoinIndexCovering extends Migration
{
    public function up()
    {
        $this->forge->addKey(
            ['sale_id', 'product_id', 'quantity', 'line_total'],
            false,
            false,
            'idx_sale_items_report_covering'
        );
        $this->forge->processIndexes('sale_items');
    }

    public function down()
    {
        $this->forge->dropKey('sale_items', 'idx_sale_items_report_covering');
    }
}
