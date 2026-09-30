<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * A store-wide default for the same opening-float configuration
 * registers already have (see AddOpeningFloatToRegisters) — so an admin
 * with five registers in one store doesn't have to type the same
 * "Opens automatic at ₱3000" configuration five separate times.
 *
 * A register's own opening_float_mode gets a new value, 'inherit'
 * (added at the application/validation layer only — see RegisterModel;
 * the column is already a plain VARCHAR with room for it), meaning "use
 * whatever this store is set to" rather than carrying its own figure.
 * The store itself only ever has manual/fixed/fixed_confirm — there's
 * nothing further up for a store to inherit from, so 'inherit' is never
 * valid here.
 *
 * Existing registers are left exactly as they are: this only changes
 * what's POSSIBLE going forward (an admin can switch a register to
 * 'inherit' explicitly, and new registers default to it — see
 * RegistersController), not what any already-configured register
 * currently does.
 */
class AddOpeningFloatToStores extends Migration
{
    public function up()
    {
        $this->forge->addColumn('stores', [
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

    public function down()
    {
        $this->forge->dropColumn('stores', ['opening_float_mode', 'default_opening_float']);
    }
}
