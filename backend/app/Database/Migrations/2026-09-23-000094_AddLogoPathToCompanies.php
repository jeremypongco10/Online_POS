<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * The business's own logo — shown on the Business Information card in
 * Settings > Sales Invoicing, and printed at the top of every receipt (both
 * the browser/window.print() one and, as an ESC/POS raster image, the
 * Bluetooth thermal-printer one — see EscPosImageService).
 *
 * Deliberately read LIVE off this column at receipt time, not frozen onto
 * `sales` the way company_name/company_tin are (see SalesController::
 * create()). Those two are the legal identity a receipt is attesting to,
 * and BIR expects a reprint to show the name that was true when the
 * invoice was issued. A logo carries no such compliance weight — it's
 * decoration, the same category ptu_number's own "read live" comment
 * already argues for stores — so a reprint showing a business's CURRENT
 * branding is the behaviour worth having, not a frozen one.
 */
class AddLogoPathToCompanies extends Migration
{
    public function up()
    {
        $this->forge->addColumn('companies', [
            'logo_path' => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true, 'after' => 'trade_name'],
        ]);
    }

    public function down()
    {
        $this->forge->dropColumn('companies', ['logo_path']);
    }
}
