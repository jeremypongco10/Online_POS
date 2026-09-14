<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * A configured default opening cash for a register, so a cashier isn't
 * required to type one in every login — the request that prompted this.
 *
 * `opening_float_mode` decides how much the cashier does at Open POS
 * Terminal:
 *
 *   - 'manual'        Today's behaviour, unchanged and still the
 *                      default: the cashier counts the drawer and types
 *                      what they counted. No configured float needed.
 *   - 'fixed'          The register opens automatically at
 *                      `default_opening_float` — no screen, no tap.
 *   - 'fixed_confirm'  The same configured figure, but the cashier sees
 *                      it and taps once to start the shift, rather than
 *                      it happening silently. Not an editable field —
 *                      if it needs to be typed instead, that's what
 *                      'manual' is for.
 *
 * Both 'fixed' modes resolve to the exact same number,
 * `default_opening_float` — see CashSessionsController::open(), which
 * is the actual source of truth for what a session opens at once one of
 * these modes is set. This column only decides how the cashier gets
 * there, never what the figure is; a register configured for a fixed
 * float can't be opened at a different one by a client sending a
 * different `opening_balance`.
 *
 * `default_opening_float` stays nullable and independent of the mode at
 * the schema level — RegistersController enforces "required whenever
 * mode isn't 'manual'" at the application layer instead of here, the
 * same reason company-wide settings in this schema validate that kind
 * of cross-field rule in a controller rather than the database: a
 * DECIMAL column has no clean way to say "required only sometimes."
 *
 * VARCHAR rather than ENUM for `opening_float_mode`, matching every
 * other regime/mode column added this way in this schema (see
 * AddTaxSystemToCompanies) — CI4's SQLite ENUM emulation rebuilds the
 * table to fake the constraint, and that rebuild has already been the
 * cause of a dropped foreign-key CASCADE elsewhere in this schema's
 * history.
 */
class AddOpeningFloatToRegisters extends Migration
{
    public function up()
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

    public function down()
    {
        $this->forge->dropColumn('registers', ['opening_float_mode', 'default_opening_float']);
    }
}
