<?php

namespace App\Models;

use CodeIgniter\Model;

class InvoiceSequenceModel extends Model
{
    protected $table = 'invoice_sequences';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'object';
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';

    protected $allowedFields = [
        'company_id', 'store_id', 'type', 'prefix', 'last_number',
    ];

    protected $validationRules = [
        'company_id' => 'required|is_natural_no_zero',
        'store_id' => 'required|is_natural_no_zero',
        'type' => 'required|in_list[sale,purchase_order,return]',
        'prefix' => 'permit_empty|max_length[20]',
        'last_number' => 'permit_empty|is_natural',
    ];

    /**
     * Atomically reserves and returns the next number for a
     * (company, store, type) sequence, creating the row if needed.
     *
     * Runs inside its own transaction with a row lock so concurrent
     * requests can't be handed the same invoice number.
     */
    public function nextNumber(int $companyId, int $storeId, string $type, string $prefix = ''): string
    {
        $this->db->transStart();

        // Raw query with FOR UPDATE so concurrent requests for the same
        // sequence block on this row instead of racing for the same
        // number. FOR UPDATE is MySQL-only syntax — SQLite has no
        // equivalent row-level lock (it locks at the database-file level
        // instead), so it's omitted there; that's fine for tests, which
        // don't exercise concurrent access.
        $forUpdate = $this->db->DBDriver === 'MySQLi' ? ' FOR UPDATE' : '';
        $row = $this->db->query(
            'SELECT * FROM invoice_sequences WHERE company_id = ? AND store_id = ? AND type = ?' . $forUpdate,
            [$companyId, $storeId, $type]
        )->getFirstRow();

        if (! $row) {
            $this->insert([
                'company_id' => $companyId,
                'store_id' => $storeId,
                'type' => $type,
                'prefix' => $prefix,
                'last_number' => 1,
            ]);
            $number = 1;
            $resolvedPrefix = $prefix;
        } else {
            $number = (int) $row->last_number + 1;
            $resolvedPrefix = $row->prefix ?? $prefix;
            $this->update($row->id, ['last_number' => $number]);
        }

        $this->db->transComplete();

        return $resolvedPrefix . str_pad((string) $number, 6, '0', STR_PAD_LEFT);
    }
}
