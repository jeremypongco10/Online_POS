<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Marks a tax rate as a protected system default — the standard rate for
 * its regime (12% VAT for the Philippines, 10% GST for Papua New Guinea)
 * that every company should always have one of, and that "Reset
 * configuration" (SystemResetController::reset) must never delete along
 * with the rest of a company's tax setup. See that controller and
 * TaxesController::delete() for where this is actually enforced.
 *
 * Deliberately NOT in TaxRateModel::$allowedFields — this is set only by
 * the seed migration right after this one, never by a client. Letting an
 * admin flip it through the ordinary create/update payload would let them
 * either protect an arbitrary rate they don't intend to keep, or (worse)
 * un-protect the real default right before deleting it, defeating the
 * point. Distinct from the existing `is_default` column on purpose too:
 * that one picks which rate a new product starts with and is freely
 * admin-editable, which has nothing to do with what a reset is allowed to
 * remove — conflating the two would mean a routine "change which rate is
 * default" click could silently change what a reset protects.
 */
class AddIsSystemToTaxRates extends Migration
{
    public function up()
    {
        $this->forge->addColumn('tax_rates', [
            'is_system' => [
                'type' => 'TINYINT',
                'constraint' => 1,
                'unsigned' => true,
                'default' => 0,
                'null' => false,
                'after' => 'is_default',
            ],
        ]);
    }

    public function down()
    {
        $this->forge->dropColumn('tax_rates', ['is_system']);
    }
}
