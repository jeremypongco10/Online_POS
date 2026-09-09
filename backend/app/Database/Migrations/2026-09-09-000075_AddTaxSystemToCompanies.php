<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Which tax regime this company's wording and receipts follow — 'vat'
 * (Philippine VAT, the default and everything this system did before)
 * or 'gst'.
 *
 * Scope is deliberately narrow, and worth stating here so nobody later
 * mistakes this for a compliance switch: the arithmetic is identical
 * either way, because a percentage applied inclusive or exclusive is the
 * same operation under both regimes. What this column changes is what
 * things are *called* and which Philippine-only apparatus is shown —
 * the BIR V/E/Z/N line indicators and the Vatable/VAT-Exempt/Zero-Rated
 * receipt breakdown are conventions of the Philippine regime, so they're
 * hidden when a company is on 'gst' rather than mislabelled.
 *
 * What it explicitly does NOT do: the Senior Citizen, PWD and 5% BNPC
 * discounts stay tied to VAT. Those are Philippine statute (RA 9994,
 * RA 10754), including the rule that the 20% discount comes off a
 * VAT-exclusive base — none of that has a GST equivalent, so it isn't
 * relabelled into one.
 *
 * VARCHAR rather than ENUM: CI4's SQLite forge (which the PHPUnit suite
 * runs on) has no native ENUM, and the table rebuild it does to fake one
 * is the same rebuild that silently dropped foreign-key CASCADE clauses
 * earlier in this schema's history. A plain column plus an in_list rule
 * on CompanyModel gets the same guarantee without the rebuild.
 */
class AddTaxSystemToCompanies extends Migration
{
    public function up()
    {
        $this->forge->addColumn('companies', [
            'tax_system' => [
                'type' => 'VARCHAR',
                'constraint' => 10,
                'null' => false,
                'default' => 'vat',
                'after' => 'currency',
            ],
        ]);
    }

    public function down()
    {
        $this->forge->dropColumn('companies', ['tax_system']);
    }
}
