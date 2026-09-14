<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * How long the POS screen sits untouched before it locks itself — a
 * company-wide default, the same "0 means off" shape as
 * loyalty_points_per_100 rather than a separate enabled/minutes pair:
 * there's nothing a minute count on its own can't already say, and a
 * DECIMAL-style dual-column split (see AddOpeningFloatToRegisters) only
 * earns its keep when the two values can genuinely disagree, which
 * "enabled" and "after how long" never do here.
 *
 * The lock itself is never optional — every cashier can lock the screen
 * by hand at any time regardless of this setting (see AccountMenu's Lock
 * Screen button); this column only controls whether it also happens on
 * its own after sitting idle, and after how long.
 *
 * Read off the auth payload rather than a dedicated endpoint, the same
 * reasoning as currency/tax_system on this same table (see
 * AddTaxSystemToCompanies) — every signed-in cashier needs this the
 * moment the POS screen mounts, and companies.view (which gates the full
 * company record) is exactly the permission a Cashier role lacks.
 */
class AddPosLockIdleMinutesToCompanies extends Migration
{
    public function up()
    {
        $this->forge->addColumn('companies', [
            'pos_lock_idle_minutes' => [
                'type' => 'INT',
                'constraint' => 11,
                'unsigned' => true,
                'null' => false,
                'default' => 0,
                'after' => 'tax_system',
            ],
        ]);
    }

    public function down()
    {
        $this->forge->dropColumn('companies', ['pos_lock_idle_minutes']);
    }
}
