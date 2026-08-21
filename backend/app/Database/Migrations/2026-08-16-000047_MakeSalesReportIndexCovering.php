<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Phase 24 follow-up: every sales report aggregate (SALE_AGGREGATES in
 * ReportsController — sale_count, subtotal, discount_total, tax_total,
 * total) filters exactly company_id + status + sale_date, then sums all
 * four money columns. idx_sales_company_status_date (added just before
 * this) lets MySQL find the matching rows via a single index range
 * scan, but summing money columns not in that index still means one
 * extra row lookup per match. At load-test scale (1M sales) that shows
 * up directly as query latency, load or no load on the DB server.
 *
 * Appending the four summed columns makes the index fully covering for
 * these reports — MySQL never touches the underlying row at all. The
 * narrower company+status+date index stays (kept for filters that don't
 * need every money column, and for other orderings), this is additive.
 */
class MakeSalesReportIndexCovering extends Migration
{
    public function up()
    {
        $this->forge->addKey(
            ['company_id', 'status', 'sale_date', 'subtotal', 'discount_total', 'tax_total', 'total'],
            false,
            false,
            'idx_sales_report_covering'
        );
        $this->forge->processIndexes('sales');
    }

    public function down()
    {
        $this->forge->dropKey('sales', 'idx_sales_report_covering');
    }
}
