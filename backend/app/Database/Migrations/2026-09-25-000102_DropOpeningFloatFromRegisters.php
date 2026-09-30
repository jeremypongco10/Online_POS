<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Reverts the register-level half of AddOpeningFloatToRegisters /
 * ChangeRegistersOpeningFloatDefaultToInherit: a register no longer
 * carries its own opening-float configuration or an 'inherit' choice at
 * all — every register simply always uses its own store's setting (see
 * AddOpeningFloatToStores), decided to be simpler and less to configure
 * than "centralize by default, but still allow a per-register override."
 * RegisterModel::resolveOpeningFloat() now reads the store directly,
 * unconditionally.
 */
class DropOpeningFloatFromRegisters extends Migration
{
    public function up()
    {
        $this->forge->dropColumn('registers', ['opening_float_mode', 'default_opening_float']);
    }

    public function down()
    {
        $this->forge->addColumn('registers', [
            'opening_float_mode' => [
                'type' => 'VARCHAR',
                'constraint' => 20,
                'null' => false,
                'default' => 'manual',
                'after' => 'code',
            ],
            'default_opening_float' => [
                'type' => 'DECIMAL',
                'constraint' => '15,2',
                'null' => true,
                'after' => 'opening_float_mode',
            ],
        ]);
    }
}
