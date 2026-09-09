<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Which regime a tax rate belongs to, so a company only ever sees, picks
 * from, and charges the rates that apply where it trades.
 *
 * Before this, every rate belonged to every company regardless of the
 * tax system it was on: a Papua New Guinea store running GST was offered
 * "VAT 12%" in the same product and POS pickers as a Philippine one, and
 * had no way to tell which of the two 0% rows ("VAT EXEMPT" vs a GST
 * equivalent) was the one it meant. The distinction is not cosmetic —
 * Philippine VAT is 12% and PNG GST is 10%, so the wrong pick is a real
 * two-point error on the customer's total, not a mislabelled receipt.
 *
 * Defaults to 'vat', which is right for every row that exists when this
 * runs: the seeded set (VAT, VAT EXEMPT, ZERO RATED, NON VAT) is the
 * Philippine BIR classification, and 'vat' is the companies.tax_system
 * default those rows were created under.
 *
 * VARCHAR rather than ENUM for the same reason as companies.tax_system —
 * see AddTaxSystemToCompanies for why the SQLite forge's ENUM emulation
 * is worth avoiding on this schema.
 */
class AddTaxSystemToTaxRates extends Migration
{
    public function up()
    {
        $this->forge->addColumn('tax_rates', [
            'tax_system' => [
                'type' => 'VARCHAR',
                'constraint' => 10,
                'null' => false,
                'default' => 'vat',
                'after' => 'name',
            ],
        ]);
    }

    public function down()
    {
        $this->forge->dropColumn('tax_rates', ['tax_system']);
    }
}
