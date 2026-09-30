<?php

namespace App\Libraries;

use Config\Database;
use RuntimeException;

/**
 * The actual work behind `php spark dev:reset-transactions` and its HTTP
 * twin (DevToolsController::resetTransactions) — kept in one place so the
 * two entry points can never drift on what "reset" means. Neither entry
 * point does anything but gate access (the CLI command's ENVIRONMENT check
 * and typed prompt; the controller's ENVIRONMENT check, companies.manage
 * permission, and typed confirm field — see SystemResetController's
 * reset(), which this mirrors) and hand off to reset() here.
 *
 * Same scope and same non-negotiables as the CLI command this was pulled
 * out of: wipes every transactional record and rewinds every BIR-facing
 * counter, but leaves companies, stores, users, registers, products,
 * customers, loyalty balances, inventory quantities and settings alone.
 * See ResetTransactions (the CLI command) for the longer version of why.
 */
class TransactionResetService
{
    // Emptied with FK checks off, so order here doesn't matter. DELETE
    // (via emptyTable()), not TRUNCATE: TRUNCATE is DDL in MySQL and
    // auto-commits immediately, which would make the transaction below a
    // lie — a failure partway through would leave some tables emptied and
    // others not. DELETE stays inside the transaction, so this is
    // genuinely all-or-nothing, at the cost of auto_increment counters
    // not resetting to 1 — cosmetic, not worth trading atomicity for.
    private const TABLES_TO_EMPTY = [
        'return_items',
        'returns',
        'cash_movements',
        'payments',
        'sale_items',
        'sales',
        'cash_sessions',
        'loyalty_point_transactions',
        'z_readings',
        'audit_logs',
        'transaction_counters',
    ];

    /**
     * @return string[] the tables that were cleared, in the order they were cleared
     *
     * @throws RuntimeException if ENVIRONMENT is production, or the reset transaction failed
     */
    public function reset(): array
    {
        if (ENVIRONMENT === 'production') {
            throw new RuntimeException('Refusing to reset transactions: ENVIRONMENT is production.');
        }

        $db = Database::connect();
        $db->transStart();
        $db->query('SET FOREIGN_KEY_CHECKS = 0');

        foreach (self::TABLES_TO_EMPTY as $table) {
            $db->table($table)->emptyTable();
        }

        // Rewind current_number so the next call to nextNumber() reissues
        // each series' own starting_number, exactly like a series that was
        // just created and has never been used.
        $db->query('UPDATE invoice_series SET current_number = starting_number - 1');
        $db->query('UPDATE invoice_sequences SET last_number = 0');
        // reset_counter bumps rather than staying put — see
        // AddBirAccreditationFields's own docblock: it exists so a
        // grand-total reset is always on the record, never silent, and
        // that guarantee should hold here too even though this is a dev
        // tool rather than a real accredited-machine reset.
        $db->query('UPDATE registers SET grand_total = 0, z_counter = 0, reset_counter = reset_counter + 1');

        $db->query('SET FOREIGN_KEY_CHECKS = 1');
        $db->transComplete();

        if (! $db->transStatus()) {
            throw new RuntimeException('Reset failed — transaction rolled back, nothing was changed.');
        }

        return self::TABLES_TO_EMPTY;
    }
}
