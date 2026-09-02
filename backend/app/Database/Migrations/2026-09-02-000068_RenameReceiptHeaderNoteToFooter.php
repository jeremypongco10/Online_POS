<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Corrects a naming/placement mistake: the receipt's header is already a
 * fixed, structured block (store name, address, TIN, VAT Reg TIN, POS
 * Serial No, MIN No — all their own columns), so free text has no place
 * there. What was called receipt_header_note is a closing message —
 * "Thank you, come again", a return policy, a promo — so it belongs at
 * the bottom of the receipt, and is renamed accordingly rather than left
 * to carry a header name for something that now prints in the footer.
 *
 * A plain rename (not drop+add): existing values in stores must survive,
 * and any sale already frozen with store_receipt_header_note must keep
 * its value under the renamed column too.
 */
class RenameReceiptHeaderNoteToFooter extends Migration
{
    public function up()
    {
        $this->forge->modifyColumn('stores', [
            'receipt_header_note' => ['name' => 'receipt_footer_note', 'type' => 'TEXT', 'null' => true],
        ]);
        $this->forge->modifyColumn('sales', [
            'store_receipt_header_note' => ['name' => 'store_receipt_footer_note', 'type' => 'TEXT', 'null' => true],
        ]);
    }

    public function down()
    {
        $this->forge->modifyColumn('stores', [
            'receipt_footer_note' => ['name' => 'receipt_header_note', 'type' => 'TEXT', 'null' => true],
        ]);
        $this->forge->modifyColumn('sales', [
            'store_receipt_footer_note' => ['name' => 'store_receipt_header_note', 'type' => 'TEXT', 'null' => true],
        ]);
    }
}
