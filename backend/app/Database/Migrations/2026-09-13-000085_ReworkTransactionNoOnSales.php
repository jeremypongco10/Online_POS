<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Follows AddTransactionNumberSettingsToCompanies and
 * CreateTransactionCounters to finish moving transaction_no onto the new,
 * admin-configurable generation path:
 *
 * - `sales.transaction_no` becomes VARCHAR, storing the fully FORMATTED
 *   value (prefix + zero-padded number) exactly the way
 *   `sales.invoice_number` already stores its own formatted string —
 *   consistent with this app's "receipt fields are a frozen snapshot"
 *   rule (company_name, store_name, etc. on this same table): if the
 *   prefix/length setting changes later, an already-issued receipt must
 *   keep showing what actually printed, not be reformatted retroactively.
 *   It was a bare INT before this (see AddTransactionNoToSalesAndCash
 *   Sessions), back when there was no prefix/padding to speak of.
 *
 * - `idx_sales_session_txn` (unique on cash_session_id+transaction_no) is
 *   dropped. It was defense-in-depth for the one reset rule that existed
 *   at the time (always per-session); now that the rule is configurable,
 *   correctness comes from transaction_counters' own atomic FOR UPDATE
 *   increment (TransactionCounterModel::nextNumber()) — the same single
 *   source of truth regardless of which rule is active — rather than a
 *   sales-table constraint that would need to vary by rule to still mean
 *   anything.
 *
 * - `cash_sessions.next_transaction_no` is dropped — CashSessionModel::
 *   nextTransactionNo() is gone, superseded by TransactionCounterModel,
 *   which now owns every counter regardless of reset rule.
 */
class ReworkTransactionNoOnSales extends Migration
{
    public function up()
    {
        if ($this->db->DBDriver === 'MySQLi') {
            $this->forge->dropKey('sales', 'idx_sales_session_txn');
        }

        $this->forge->modifyColumn('sales', [
            'transaction_no' => [
                'name' => 'transaction_no',
                'type' => 'VARCHAR',
                'constraint' => 40,
                'null' => true,
            ],
        ]);

        $this->forge->dropColumn('cash_sessions', ['next_transaction_no']);
    }

    public function down()
    {
        $this->forge->addColumn('cash_sessions', [
            'next_transaction_no' => [
                'type' => 'INT',
                'constraint' => 10,
                'unsigned' => true,
                'null' => false,
                'default' => 1,
                'after' => 'opening_balance',
            ],
        ]);

        $this->forge->modifyColumn('sales', [
            'transaction_no' => [
                'name' => 'transaction_no',
                'type' => 'INT',
                'constraint' => 10,
                'unsigned' => true,
                'null' => true,
            ],
        ]);

        if ($this->db->DBDriver === 'MySQLi') {
            $this->forge->addKey(['cash_session_id', 'transaction_no'], false, true, 'idx_sales_session_txn');
            $this->forge->processIndexes('sales');
        }
    }
}
