<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * A per-shift transaction number, distinct from `sales.invoice_number`
 * (the Sales Invoice Configuration module's BIR-compliant, never-reset
 * series — see CreateInvoiceSeries). Where the invoice number is the
 * legal document number and must climb forever, this is a plain internal
 * reference a cashier/supervisor can use during a shift ("transaction 7")
 * that resets to 1 each time a register opens a new cash session — the
 * same unit an X/Z-reading reconciles against.
 *
 * `cash_sessions.next_transaction_no` holds the next value to hand out,
 * the same "counter lives on the parent, locked FOR UPDATE at issue time"
 * shape as InvoiceSeriesModel::nextNumber() — see
 * CashSessionModel::nextTransactionNo(). A sale rung up with no
 * cash_session_id attached (allowed by SalesController::create(), though
 * the POS always sends one) simply gets a null transaction_no.
 */
class AddTransactionNoToSalesAndCashSessions extends Migration
{
    public function up()
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

        $this->forge->addColumn('sales', [
            'transaction_no' => [
                'type' => 'INT',
                'constraint' => 10,
                'unsigned' => true,
                'null' => true,
                'after' => 'invoice_number',
            ],
        ]);

        // Defense-in-depth alongside the FOR UPDATE lock that assigns
        // these — mirrors sales' own unique(company_id, invoice_number).
        // NULL cash_session_id / transaction_no rows (a sale with no
        // session attached) are exempt from this by ordinary unique-index
        // NULL semantics, which is correct: there's nothing to collide.
        if ($this->db->DBDriver === 'MySQLi') {
            $this->forge->addKey(['cash_session_id', 'transaction_no'], false, true, 'idx_sales_session_txn');
            $this->forge->processIndexes('sales');
        }
    }

    public function down()
    {
        if ($this->db->DBDriver === 'MySQLi') {
            $this->forge->dropKey('sales', 'idx_sales_session_txn');
        }
        $this->forge->dropColumn('sales', ['transaction_no']);
        $this->forge->dropColumn('cash_sessions', ['next_transaction_no']);
    }
}
