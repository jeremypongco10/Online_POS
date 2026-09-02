<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * The frozen-at-checkout copy of Store::show_bir_details — same reasoning
 * as store_vat_reg_tin/store_pos_serial_no/store_min_no. This one governs
 * more than the store identifiers, though: SalesController::receipt()
 * also reads it to decide whether the VATable/VAT/VAT-Exempt/Zero-Rated
 * sales breakdown appears on the receipt at all, since a store owner who
 * turns those identifiers off almost always wants the whole BIR-specific
 * block gone, not just the three identifier lines with a VAT breakdown
 * still sitting underneath them.
 *
 * Freezing this (rather than the receipt endpoint reading the store's
 * current setting live) keeps it consistent with every other receipt
 * field: re-configuring a store afterwards can't reach back and change
 * whether a sale already rung up shows its VAT breakdown.
 */
class AddShowBirDetailsToSales extends Migration
{
    public function up()
    {
        $this->forge->addColumn('sales', [
            'show_bir_details' => ['type' => 'TINYINT', 'unsigned' => true, 'null' => false, 'default' => 1, 'after' => 'store_min_no'],
        ]);
    }

    public function down()
    {
        $this->forge->dropColumn('sales', ['show_bir_details']);
    }
}
