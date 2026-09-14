<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Whether this business is registered with the BIR yet.
 *
 * Defaults to 1 so every existing install keeps charging tax exactly as
 * it did — this only changes behaviour for someone who deliberately
 * turns it off.
 *
 * Turned off, it disables the tax system outright rather than merely
 * hiding it: a business that is not registered cannot legally charge
 * VAT, so a sale that quietly computed 12% and kept it off the receipt
 * would be collecting tax it has no authority to collect. Every line is
 * therefore resolved at no tax at all (SalesController::create), and the
 * receipt drops the BIR identifiers and the VAT breakdown with it.
 *
 * Deliberately separate from companies.is_vat_registered, which answers
 * a different question: a business can be BIR-registered and still
 * Non-VAT (it pays percentage tax instead). This flag is the one that
 * says whether the business is in the tax system at all.
 */
class AddBirRegisteredToCompanies extends Migration
{
    public function up()
    {
        $this->forge->addColumn('companies', [
            'is_bir_registered' => [
                'type' => 'TINYINT',
                'constraint' => 1,
                'default' => 1,
                'null' => false,
                'after' => 'vat_registration_number',
            ],
        ]);
    }

    public function down()
    {
        $this->forge->dropColumn('companies', ['is_bir_registered']);
    }
}
