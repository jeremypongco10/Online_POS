<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * The single generic counter store behind `sales.transaction_no`,
 * replacing `cash_sessions.next_transaction_no` (see
 * ReworkTransactionNoOnSales) now that the reset boundary is
 * admin-configurable (companies.transaction_no_reset_rule) rather than
 * always "per cash session":
 *
 *   - per_session: scope_key = "session:{cash_session_id}"
 *   - per_register: scope_key = "register" (one row, ever, per register)
 *   - per_day:      scope_key = today's date ("2026-09-13")
 *
 * One row per (register, scope) — `unique(register_id, scope_key)` is what
 * TransactionCounterModel::nextNumber() locks and increments atomically,
 * the same FOR UPDATE shape used everywhere else in this codebase that
 * hands out a number (InvoiceSeriesModel, the old CashSessionModel
 * version of this). A row is created lazily on first use rather than
 * pre-seeded — there's no fixed set of "all possible scope keys" to
 * backfill the way invoice_series' one-per-store backfill had.
 */
class CreateTransactionCounters extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id' => ['type' => 'BIGINT', 'constraint' => 20, 'unsigned' => true, 'auto_increment' => true],
            'register_id' => ['type' => 'BIGINT', 'constraint' => 20, 'unsigned' => true],
            'scope_key' => ['type' => 'VARCHAR', 'constraint' => 40],
            'next_number' => ['type' => 'INT', 'constraint' => 10, 'unsigned' => true, 'default' => 1],
            'created_at' => ['type' => 'DATETIME', 'null' => true],
            'updated_at' => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addUniqueKey(['register_id', 'scope_key']);
        $this->forge->addForeignKey('register_id', 'registers', 'id', 'CASCADE', 'CASCADE');
        $this->forge->createTable('transaction_counters', false, ($this->db->DBDriver === 'MySQLi' ? ['ENGINE' => 'InnoDB'] : []));
    }

    public function down()
    {
        $this->forge->dropTable('transaction_counters', true);
    }
}
