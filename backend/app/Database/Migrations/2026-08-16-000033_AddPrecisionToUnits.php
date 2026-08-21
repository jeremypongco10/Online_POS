<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * "Each unit supports appropriate decimal precision" — e.g. you can
 * sell 0.250 KG of rice but not 1.5 PCS of a can of Coke. Quantity
 * columns stay DECIMAL(15,4) everywhere (max precision available);
 * this column says how many of those decimals are actually valid for
 * a given unit, enforced when quantities are recorded.
 */
class AddPrecisionToUnits extends Migration
{
    public function up()
    {
        $this->forge->addColumn('units', [
            'decimal_places' => [
                'type' => 'TINYINT',
                'constraint' => 3,
                'unsigned' => true,
                'default' => 2,
                'after' => 'abbreviation',
            ],
        ]);
    }

    public function down()
    {
        $this->forge->dropColumn('units', ['decimal_places']);
    }
}
