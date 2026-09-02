<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * A short block of custom text a store can have printed on its own
 * receipts, under the store name/address — a branch notice, a BIR permit
 * number, "Non-VAT Registered", etc. Per store rather than per company:
 * two branches of the same company can carry different BIR
 * accreditation details on their receipts.
 *
 * store_receipt_header_note on `sales` is the frozen-at-checkout copy —
 * same reasoning as every other column AddInvoiceSnapshotFields added:
 * a receipt must never change because someone edits the store's config
 * afterwards. SalesController::create() writes it; ::receipt() reads it
 * back, never the live stores row.
 */
class AddReceiptHeaderNoteToStores extends Migration
{
    public function up()
    {
        $this->forge->addColumn('stores', [
            'receipt_header_note' => ['type' => 'TEXT', 'null' => true, 'after' => 'address'],
        ]);

        $this->forge->addColumn('sales', [
            'store_receipt_header_note' => ['type' => 'TEXT', 'null' => true, 'after' => 'store_address'],
        ]);
    }

    public function down()
    {
        $this->forge->dropColumn('stores', ['receipt_header_note']);
        $this->forge->dropColumn('sales', ['store_receipt_header_note']);
    }
}
