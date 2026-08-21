<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * sale_items/purchase_order_items only stored the resolved percentage
 * (tax_rate) and computed tax_amount, which loses which tax_rates row
 * — and therefore which classification (VAT/exempt/zero-rated/non-VAT)
 * — produced it. A 0% line could be exempt, zero-rated, or non-VAT;
 * without the FK there's no way to tell them apart for BIR-style
 * reporting after the fact.
 */
class AddTaxRateIdToLineItems extends Migration
{
    public function up()
    {
        $this->forge->addColumn('sale_items', [
            'tax_rate_id' => [
                'type' => 'BIGINT',
                'constraint' => 20,
                'unsigned' => true,
                'null' => true,
                'after' => 'product_id',
            ],
        ]);
        if ($this->db->DBDriver === 'MySQLi') {
            $this->db->query('ALTER TABLE sale_items ADD CONSTRAINT sale_items_tax_rate_id_fk FOREIGN KEY (tax_rate_id) REFERENCES tax_rates (id) ON DELETE SET NULL ON UPDATE CASCADE');
        }

        $this->forge->addColumn('purchase_order_items', [
            'tax_rate_id' => [
                'type' => 'BIGINT',
                'constraint' => 20,
                'unsigned' => true,
                'null' => true,
                'after' => 'product_id',
            ],
        ]);
        if ($this->db->DBDriver === 'MySQLi') {
            $this->db->query('ALTER TABLE purchase_order_items ADD CONSTRAINT poi_tax_rate_id_fk FOREIGN KEY (tax_rate_id) REFERENCES tax_rates (id) ON DELETE SET NULL ON UPDATE CASCADE');
        }
    }

    public function down()
    {
        if ($this->db->DBDriver === 'MySQLi') {
            $this->db->query('ALTER TABLE sale_items DROP FOREIGN KEY sale_items_tax_rate_id_fk');
        }
        $this->forge->dropColumn('sale_items', ['tax_rate_id']);

        if ($this->db->DBDriver === 'MySQLi') {
            $this->db->query('ALTER TABLE purchase_order_items DROP FOREIGN KEY poi_tax_rate_id_fk');
        }
        $this->forge->dropColumn('purchase_order_items', ['tax_rate_id']);
    }
}
