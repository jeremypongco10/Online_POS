<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Phase 24: composite indexes matching the app's actual hot query
 * shapes, not guessed in the abstract. Each one targets a specific
 * existing filter pattern:
 *
 *  - sales(company_id, status, sale_date): every sales report
 *    (ReportsController::applyCompletedSalesFilters) filters exactly
 *    this combination — company scope, status='completed', a date range.
 *  - sales(store_id, status, sale_date): the same reports narrowed to
 *    one store, and the dashboard's per-store breakdown.
 *  - inventory_transactions(store_id, type, created_at): the movements
 *    report (stockMovement/stockAdjustments/stockTransfers) filters
 *    store + a type list + a date range.
 *  - products(company_id, is_active): the overwhelmingly common product
 *    list/search case — a company's currently-active catalog.
 *
 * The single-column indexes these tables already had are left in place;
 * these are additive, matching leftmost-prefix usage the existing
 * indexes couldn't serve as efficiently at large row counts.
 */
class AddPerformanceIndexes extends Migration
{
    public function up()
    {
        $this->forge->addKey(['company_id', 'status', 'sale_date'], false, false, 'idx_sales_company_status_date');
        $this->forge->processIndexes('sales');

        $this->forge->addKey(['store_id', 'status', 'sale_date'], false, false, 'idx_sales_store_status_date');
        $this->forge->processIndexes('sales');

        $this->forge->addKey(['store_id', 'type', 'created_at'], false, false, 'idx_invtx_store_type_created');
        $this->forge->processIndexes('inventory_transactions');

        $this->forge->addKey(['company_id', 'is_active'], false, false, 'idx_products_company_active');
        $this->forge->processIndexes('products');
    }

    public function down()
    {
        $this->forge->dropKey('sales', 'idx_sales_company_status_date');
        $this->forge->dropKey('sales', 'idx_sales_store_status_date');
        $this->forge->dropKey('inventory_transactions', 'idx_invtx_store_type_created');
        $this->forge->dropKey('products', 'idx_products_company_active');
    }
}
