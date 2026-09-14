<?php

namespace App\Models;

use CodeIgniter\Model;

/**
 * The generic counter behind `sales.transaction_no` — see
 * CreateTransactionCounters for the (register_id, scope_key) shape and why
 * a single generic table replaced the old per-session-only column on
 * cash_sessions. SalesController::create() computes the scope_key from
 * the company's own companies.transaction_no_reset_rule before calling
 * nextNumber() here; this model has no opinion on what a scope_key means,
 * only that each one increments atomically and independently.
 */
class TransactionCounterModel extends Model
{
    protected $table = 'transaction_counters';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'object';
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';

    protected $allowedFields = ['register_id', 'scope_key', 'next_number'];

    /**
     * Atomically reserves and returns the next number for this
     * (register, scope) pair, creating the row on first use.
     *
     * Same FOR UPDATE row-lock shape as InvoiceSeriesModel::nextNumber()
     * (MySQL only — a no-op lock under SQLite, matching every other
     * generator in this codebase). The "row doesn't exist yet" case can't
     * be locked directly (there's nothing to lock), so it's handled with
     * an insert-or-ignore first: safe under a concurrent first-ever call
     * for the same scope, since one caller's insert wins and the other's
     * is silently dropped by the unique key rather than erroring — both
     * then fall through to the same lock-and-increment read below.
     */
    public function nextNumber(int $registerId, string $scopeKey): int
    {
        $ignore = $this->db->DBDriver === 'SQLite3' ? 'INSERT OR IGNORE' : 'INSERT IGNORE';
        $this->db->query(
            "{$ignore} INTO transaction_counters (register_id, scope_key, next_number, created_at, updated_at) VALUES (?, ?, 1, ?, ?)",
            [$registerId, $scopeKey, date('Y-m-d H:i:s'), date('Y-m-d H:i:s')]
        );

        $forUpdate = $this->db->DBDriver === 'MySQLi' ? ' FOR UPDATE' : '';
        $row = $this->db->query(
            'SELECT * FROM transaction_counters WHERE register_id = ? AND scope_key = ?' . $forUpdate,
            [$registerId, $scopeKey]
        )->getFirstRow();

        $next = (int) $row->next_number;
        $this->update($row->id, ['next_number' => $next + 1]);

        return $next;
    }
}
