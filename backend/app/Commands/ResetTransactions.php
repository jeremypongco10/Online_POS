<?php

namespace App\Commands;

use App\Libraries\TransactionResetService;
use CodeIgniter\CLI\BaseCommand;
use CodeIgniter\CLI\CLI;
use RuntimeException;

/**
 * Developer-only backdoor: wipes every transactional record (sales, cart
 * history, cash sessions, audit trail, loyalty history, Z-readings) and
 * rewinds every BIR-facing counter back to a clean start — invoice_series,
 * the legacy invoice_sequences (still live for purchase-order numbering,
 * see PurchasesController), each register's transaction_counters rows, and
 * each register's own grand_total/z_counter.
 *
 * The actual work lives in TransactionResetService, shared with this
 * command's HTTP twin (DevToolsController::resetTransactions, behind the
 * "Reset transaction data" card on Settings > Security, dev builds only) —
 * see that service's own docblock for the full compliance reasoning. This
 * command only owns the CLI-specific gating: refuses outright when
 * ENVIRONMENT is production, and always asks for a typed confirmation
 * first (bypassable with --force for CI).
 *
 * Left alone, on purpose: companies, stores, users/roles, registers
 * (the rows themselves), products, categories, taxes, payment methods,
 * customers, loyalty card point balances, inventory quantities, settings.
 * This clears history, not the shop.
 */
class ResetTransactions extends BaseCommand
{
    protected $group       = 'Dev';
    protected $name        = 'dev:reset-transactions';
    protected $description = 'DEV ONLY: wipes all sales/cart/cash/audit/loyalty history and rewinds every invoice/transaction/grand-total counter to zero.';
    protected $usage       = 'dev:reset-transactions [--force]';
    protected $options     = [
        '--force' => 'Skip the interactive confirmation prompt (for scripted/CI use).',
    ];

    public function run(array $params)
    {
        if (ENVIRONMENT === 'production') {
            CLI::error('Refusing to run: ENVIRONMENT is production. This command is for dev/staging boxes only.');

            return;
        }

        CLI::write('This will PERMANENTLY delete every sale, payment, return, cash session,', 'yellow');
        CLI::write('audit log entry, loyalty transaction, and Z-reading — and rewind every', 'yellow');
        CLI::write('invoice/transaction counter and register grand total to zero.', 'yellow');
        CLI::write('Products, stores, users, customers, and settings are left untouched.', 'yellow');
        CLI::write('If a cash drawer is open on any terminal right now, closing this out from', 'yellow');
        CLI::write('under it will break that session — make sure nobody is mid-shift first.', 'yellow');
        CLI::newLine();

        if (! CLI::getOption('force')) {
            $confirm = CLI::prompt('Type RESET to continue', null, 'required');
            if ($confirm !== 'RESET') {
                CLI::error('Aborted — nothing was changed.');

                return;
            }
        }

        try {
            $tables = (new TransactionResetService())->reset();
        } catch (RuntimeException $e) {
            CLI::error($e->getMessage());

            return;
        }

        foreach ($tables as $table) {
            CLI::write("  cleared {$table}", 'green');
        }

        CLI::newLine();
        CLI::write('Done. All transactional data cleared and counters rewound.', 'green');
    }
}
