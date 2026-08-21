<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Phase 18: a receipt must be a frozen transaction snapshot — it must
 * never change because someone later renames a company/store/product,
 * edits a customer, or renames a tax rate. Everything the receipt shows
 * beyond raw money math is copied onto the sale/sale_items row at the
 * moment of sale, so rendering a receipt never needs to join out to a
 * mutable reference table.
 */
class AddInvoiceSnapshotFields extends Migration
{
    public function up()
    {
        $this->forge->addColumn('sales', [
            'company_name' => ['type' => 'VARCHAR', 'constraint' => 150, 'null' => true, 'after' => 'company_id'],
            'company_tin' => ['type' => 'VARCHAR', 'constraint' => 50, 'null' => true, 'after' => 'company_name'],
            'store_name' => ['type' => 'VARCHAR', 'constraint' => 150, 'null' => true, 'after' => 'store_id'],
            'store_address' => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true, 'after' => 'store_name'],
            'cashier_name' => ['type' => 'VARCHAR', 'constraint' => 150, 'null' => true, 'after' => 'user_id'],
            'bagger_name' => ['type' => 'VARCHAR', 'constraint' => 150, 'null' => true, 'after' => 'bagger_id'],
            'customer_name' => ['type' => 'VARCHAR', 'constraint' => 150, 'null' => true, 'after' => 'customer_id'],
            'loyalty_card_id' => ['type' => 'BIGINT', 'constraint' => 20, 'unsigned' => true, 'null' => true, 'after' => 'customer_name'],
            'loyalty_card_number' => ['type' => 'VARCHAR', 'constraint' => 40, 'null' => true, 'after' => 'loyalty_card_id'],
        ]);
        if ($this->db->DBDriver === 'MySQLi') {
            $this->db->query(
                'ALTER TABLE sales ADD CONSTRAINT sales_loyalty_card_id_fk FOREIGN KEY (loyalty_card_id) REFERENCES loyalty_cards (id) ON DELETE SET NULL ON UPDATE CASCADE'
            );
        }

        $this->forge->addColumn('sale_items', [
            'product_name' => ['type' => 'VARCHAR', 'constraint' => 150, 'null' => true, 'after' => 'product_id'],
            'product_sku' => ['type' => 'VARCHAR', 'constraint' => 60, 'null' => true, 'after' => 'product_name'],
            // Resolved TaxService classification (vat/vat_exempt/zero_rated/non_vat)
            // at sale time — the receipt's VAT/Exempt/Zero-Rated breakdown reads
            // this, not a live lookup of tax_rates.name which could be renamed later.
            'tax_type' => ['type' => 'VARCHAR', 'constraint' => 20, 'null' => true, 'after' => 'tax_rate_id'],
        ]);
    }

    public function down()
    {
        if ($this->db->DBDriver === 'MySQLi') {
            $this->db->query('ALTER TABLE sales DROP FOREIGN KEY sales_loyalty_card_id_fk');
        }
        $this->forge->dropColumn('sales', [
            'company_name', 'company_tin', 'store_name', 'store_address',
            'cashier_name', 'bagger_name', 'customer_name',
            'loyalty_card_id', 'loyalty_card_number',
        ]);
        $this->forge->dropColumn('sale_items', ['product_name', 'product_sku', 'tax_type']);
    }
}
