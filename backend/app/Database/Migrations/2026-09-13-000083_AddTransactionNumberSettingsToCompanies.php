<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Admin-configurable rules for `sales.transaction_no` (see
 * AddTransactionNoToSalesAndCashSessions), kept deliberately separate from
 * the BIR invoice_series configuration — the two numbers serve different
 * purposes and an admin should be able to reason about (and change) them
 * independently: invoice_number is the legal document number and must
 * never reset; transaction_no is a plain internal shift reference, and
 * which boundary it resets on is a matter of operational preference, not
 * compliance.
 *
 * `reset_rule` decides which TransactionCounterModel scope key
 * SalesController::create() computes for a given sale:
 *   - per_session: resets to 1 each time the register opens a new cash
 *     session (this module's original, hard-coded behavior).
 *   - per_register: never resets — one continuously-climbing sequence per
 *     register, for the lifetime of that register.
 *   - per_day: resets to 1 at the start of each calendar day, per register.
 *
 * `prefix`/`length` are purely cosmetic formatting, mirroring
 * invoice_series' own prefix/number_length — optional, since an unformatted
 * plain integer ("7") is a perfectly good shift reference on its own.
 */
class AddTransactionNumberSettingsToCompanies extends Migration
{
    public function up()
    {
        $this->forge->addColumn('companies', [
            'transaction_no_reset_rule' => [
                'type' => 'ENUM',
                'constraint' => ['per_session', 'per_register', 'per_day'],
                'default' => 'per_session',
                'null' => false,
                'after' => 'pos_lock_idle_minutes',
            ],
            'transaction_no_prefix' => [
                'type' => 'VARCHAR',
                'constraint' => 20,
                'null' => true,
                'after' => 'transaction_no_reset_rule',
            ],
            'transaction_no_length' => [
                'type' => 'TINYINT',
                'constraint' => 3,
                'unsigned' => true,
                'default' => 0,
                'null' => false,
                'after' => 'transaction_no_prefix',
            ],
        ]);
    }

    public function down()
    {
        $this->forge->dropColumn('companies', ['transaction_no_reset_rule', 'transaction_no_prefix', 'transaction_no_length']);
    }
}
