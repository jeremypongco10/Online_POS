<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Whether the three BIR identifiers just added (vat_reg_tin, pos_serial_no,
 * min_no) actually print on this store's receipts. Kept separate from
 * whether the values are *filled in* — a store might record its MIN/serial
 * ahead of its BIR accreditation going live, or want to pull them off the
 * receipt temporarily, without losing the saved values either way.
 *
 * Deliberately no snapshot column on `sales` for this flag itself: the
 * flag is only ever consulted once, at checkout (SalesController::
 * create()), to decide whether to write the real identifiers or nulls
 * into the existing store_vat_reg_tin/store_pos_serial_no/store_min_no
 * snapshot columns. A receipt already issued is frozen by virtue of those
 * three columns already being null-or-not — toggling this afterwards
 * can't touch it, so a fourth snapshot column would just be redundant.
 *
 * Defaults to 1 (shown) — the fields were only just added and nobody has
 * had the chance to hide them yet, so "on" preserves the behaviour every
 * store already had a moment ago.
 */
class AddShowBirDetailsToStores extends Migration
{
    public function up()
    {
        $this->forge->addColumn('stores', [
            'show_bir_details' => ['type' => 'TINYINT', 'unsigned' => true, 'null' => false, 'default' => 1, 'after' => 'min_no'],
        ]);
    }

    public function down()
    {
        $this->forge->dropColumn('stores', ['show_bir_details']);
    }
}
