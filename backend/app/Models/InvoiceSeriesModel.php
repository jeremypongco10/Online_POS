<?php

namespace App\Models;

use CodeIgniter\Model;
use RuntimeException;

/**
 * BIR-style invoice numbering series — see the module's own migration
 * (CreateInvoiceSeries) for the shape and why this replaces
 * InvoiceSequenceModel. The single source of truth for both the admin
 * CRUD (InvoiceSeriesController) and the actual number generation
 * (nextNumber(), called from SalesController::create()).
 */
class InvoiceSeriesModel extends Model
{
    protected $table = 'invoice_series';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'object';
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';

    protected $allowedFields = [
        'company_id', 'store_id', 'invoice_type', 'series_code', 'prefix', 'suffix',
        'starting_number', 'current_number', 'maximum_number', 'number_length',
        'warning_threshold', 'critical_threshold', 'effective_from', 'effective_to',
        'status', 'created_by', 'updated_by',
    ];

    protected $validationRules = [
        'company_id' => ['label' => 'Company', 'rules' => 'required|is_natural_no_zero'],
        'store_id' => ['label' => 'Branch', 'rules' => 'required|is_natural_no_zero'],
        'invoice_type' => ['label' => 'Invoice type', 'rules' => 'required|max_length[60]'],
        'series_code' => ['label' => 'Series code', 'rules' => 'required|max_length[30]'],
        'prefix' => ['label' => 'Prefix', 'rules' => 'permit_empty|max_length[20]'],
        'suffix' => ['label' => 'Suffix', 'rules' => 'permit_empty|max_length[20]'],
        'starting_number' => ['label' => 'Starting number', 'rules' => 'required|is_natural_no_zero'],
        'current_number' => ['label' => 'Current number', 'rules' => 'required|is_natural'],
        'maximum_number' => ['label' => 'Maximum number', 'rules' => 'required|is_natural_no_zero'],
        'number_length' => ['label' => 'Number length', 'rules' => 'required|is_natural_no_zero|less_than_equal_to[18]'],
        'warning_threshold' => ['label' => 'Warning threshold', 'rules' => 'permit_empty|is_natural'],
        'critical_threshold' => ['label' => 'Critical threshold', 'rules' => 'permit_empty|is_natural'],
        'effective_from' => ['label' => 'Effective from', 'rules' => 'required|valid_date'],
        'effective_to' => ['label' => 'Effective to', 'rules' => 'permit_empty|valid_date'],
        'status' => ['label' => 'Status', 'rules' => 'permit_empty|in_list[active,inactive,exhausted]'],
    ];

    /**
     * The cross-field checks spec §13 calls for that CI4's single-column
     * $validationRules can't express on its own — no built-in
     * "less-than-another-field" rule exists here (see the model's own
     * design note), so this runs as an explicit second pass. Returns a
     * field => message map, empty when the row is valid; the caller
     * (InvoiceSeriesController) merges this into the same validationFail()
     * response shape the model's own rules would have produced.
     *
     * $merged is the row as it will exist after the write — the
     * controller is responsible for merging the existing row with the
     * incoming payload before calling this on an update, so a partial
     * PATCH-style edit is checked against its real resulting state, not
     * just the fields that happened to be submitted.
     */
    public function validateBusinessRules(array $merged): array
    {
        $errors = [];

        $starting = (int) ($merged['starting_number'] ?? 0);
        $current = (int) ($merged['current_number'] ?? 0);
        $maximum = (int) ($merged['maximum_number'] ?? 0);
        $length = (int) ($merged['number_length'] ?? 0);

        if ($starting > $maximum) {
            $errors['starting_number'] = 'Starting number must not exceed the maximum number.';
        }
        if ($current > $maximum) {
            $errors['current_number'] = 'Current number must not exceed the maximum number.';
        }
        if ($length > 0 && $maximum > 0 && strlen((string) $maximum) > $length) {
            $errors['number_length'] = "Number length must be long enough to print the maximum number ({$maximum}).";
        }

        $from = $merged['effective_from'] ?? null;
        $to = $merged['effective_to'] ?? null;
        if ($from && $to && strtotime((string) $to) < strtotime((string) $from)) {
            $errors['effective_to'] = 'Effective To cannot be earlier than Effective From.';
        }

        return $errors;
    }

    /**
     * True when some OTHER row already holds `status = 'active'` for this
     * exact (store, invoice_type) — the "an active series must not
     * overlap with another conflicting series" rule from spec §13. Not a
     * DB constraint (see the migration's own note on why status can't be
     * expressed that way) — checked here so InvoiceSeriesController can
     * run the identical check whether a row is being created directly as
     * active, updated into active, or activated via the dedicated action.
     */
    public function hasOverlappingActive(int $companyId, int $storeId, string $invoiceType, ?int $excludeId = null): bool
    {
        $query = $this->where('company_id', $companyId)
            ->where('store_id', $storeId)
            ->where('invoice_type', $invoiceType)
            ->where('status', 'active');

        if ($excludeId !== null) {
            $query = $query->where('id !=', $excludeId);
        }

        return $query->countAllResults() > 0;
    }

    /**
     * Atomically reserves and returns the next number for this
     * (company, store, invoice_type)'s one active series — the sole
     * successor to InvoiceSequenceModel::nextNumber(), called from
     * SalesController::create() inside that method's own transaction.
     *
     * Same FOR UPDATE row-lock technique as InvoiceSequenceModel: MySQL
     * only (SQLite has no row-level lock, so this is a no-op there — the
     * test suite doesn't exercise real concurrency), but the entire
     * select-check-increment sequence happens against one locked row, so
     * two concurrent callers can never both read the same current_number
     * and both increment from it.
     *
     * Throws RuntimeException with the exact spec §15 message when no
     * eligible series exists (none active, none effective today, or the
     * one that is has already reached its maximum) — SalesController
     * catches this and turns it into a 422 with that message as the
     * cashier-facing checkoutError.
     */
    public function nextNumber(int $companyId, int $storeId, string $invoiceType): array
    {
        $today = date('Y-m-d');
        $forUpdate = $this->db->DBDriver === 'MySQLi' ? ' FOR UPDATE' : '';

        $row = $this->db->query(
            'SELECT * FROM invoice_series
             WHERE company_id = ? AND store_id = ? AND invoice_type = ? AND status = ?
               AND effective_from <= ? AND (effective_to IS NULL OR effective_to >= ?)
             ORDER BY id ASC LIMIT 1' . $forUpdate,
            [$companyId, $storeId, $invoiceType, 'active', $today, $today]
        )->getFirstRow();

        if (! $row) {
            throw new RuntimeException(
                'No active invoice series is available for this branch. Please contact an authorized administrator.'
            );
        }

        $current = (int) $row->current_number;
        $maximum = (int) $row->maximum_number;

        if ($current >= $maximum) {
            // Defensive: the row below should already have flipped to
            // 'exhausted' the moment it reached maximum, so a still-active
            // row already at its ceiling means something upstream let it
            // through — treated identically to "none available" rather
            // than issuing a number past the configured maximum.
            throw new RuntimeException(
                'No active invoice series is available for this branch. Please contact an authorized administrator.'
            );
        }

        $next = $current + 1;
        $update = ['current_number' => $next];
        // Flips to exhausted in the SAME update as the increment that
        // reaches it — there is no window where this row reads as
        // 'active' with nothing left to issue.
        if ($next >= $maximum) {
            $update['status'] = 'exhausted';
        }
        $this->update($row->id, $update);

        $formatted = ($row->prefix ?? '') . $row->series_code . '-' . str_pad((string) $next, (int) $row->number_length, '0', STR_PAD_LEFT) . ($row->suffix ?? '');

        return ['number' => $next, 'formatted' => $formatted, 'series_id' => (int) $row->id];
    }
}
