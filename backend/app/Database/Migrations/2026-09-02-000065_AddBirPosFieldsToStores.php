<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * The three BIR-mandated identifiers a Philippine POS/CRM receipt must
 * carry alongside the business TIN: VAT Registration TIN, the Machine
 * Identification Number (MIN), and the POS unit's own serial number.
 * Per store, like receipt_header_note added just before this — a
 * company's branches are commonly separately BIR-accredited, each with
 * its own MIN/serial, so these can't be a single company-wide value.
 *
 * Same frozen-snapshot treatment as every other receipt field: the
 * store_* columns on `sales` are the copy SalesController::create()
 * writes at checkout and ::receipt() reads back, so re-accrediting a
 * store (a new MIN after a machine swap, say) never rewrites a receipt
 * already issued under the old one.
 */
class AddBirPosFieldsToStores extends Migration
{
    public function up()
    {
        $this->forge->addColumn('stores', [
            'vat_reg_tin' => ['type' => 'VARCHAR', 'constraint' => 30, 'null' => true, 'after' => 'receipt_header_note'],
            'pos_serial_no' => ['type' => 'VARCHAR', 'constraint' => 50, 'null' => true, 'after' => 'vat_reg_tin'],
            'min_no' => ['type' => 'VARCHAR', 'constraint' => 50, 'null' => true, 'after' => 'pos_serial_no'],
        ]);

        $this->forge->addColumn('sales', [
            'store_vat_reg_tin' => ['type' => 'VARCHAR', 'constraint' => 30, 'null' => true, 'after' => 'store_receipt_header_note'],
            'store_pos_serial_no' => ['type' => 'VARCHAR', 'constraint' => 50, 'null' => true, 'after' => 'store_vat_reg_tin'],
            'store_min_no' => ['type' => 'VARCHAR', 'constraint' => 50, 'null' => true, 'after' => 'store_pos_serial_no'],
        ]);
    }

    public function down()
    {
        $this->forge->dropColumn('stores', ['vat_reg_tin', 'pos_serial_no', 'min_no']);
        $this->forge->dropColumn('sales', ['store_vat_reg_tin', 'store_pos_serial_no', 'store_min_no']);
    }
}
