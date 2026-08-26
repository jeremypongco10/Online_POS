<?php

namespace App\Models;

use CodeIgniter\Model;

class LoyaltyPointTransactionModel extends Model
{
    protected $table = 'loyalty_point_transactions';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'object';
    protected $useTimestamps = false; // created_at only, set explicitly at insert — no updates to a ledger row.
    protected $createdField = 'created_at';

    protected $allowedFields = [
        'customer_id', 'loyalty_card_id', 'points_delta', 'balance_after', 'note', 'created_by', 'created_at',
    ];

    protected $validationRules = [
        'customer_id' => ['label' => 'Customer', 'rules' => 'required|is_natural_no_zero'],
        'loyalty_card_id' => ['label' => 'Loyalty card', 'rules' => 'required|is_natural_no_zero'],
        'points_delta' => ['label' => 'Points', 'rules' => 'required|integer'],
        'balance_after' => ['label' => 'Balance after', 'rules' => 'required|integer'],
        'note' => ['label' => 'Note', 'rules' => 'permit_empty|max_length[255]'],
    ];

    /** Current computed balance for one customer — the sum of every entry in their ledger, zero if they have none yet. */
    public function balanceForCustomer(int $customerId): int
    {
        $row = $this->selectSum('points_delta')->where('customer_id', $customerId)->first();

        return (int) ($row->points_delta ?? 0);
    }

    /**
     * Computed balances for several customers at once, keyed by customer
     * id — used by the Customers list so it isn't one SUM query per row.
     * A customer with no ledger entries simply has no key in the result.
     */
    public function balancesForCustomerIds(array $customerIds): array
    {
        if ($customerIds === []) {
            return [];
        }

        $rows = $this->select('customer_id, SUM(points_delta) AS total')
            ->whereIn('customer_id', $customerIds)
            ->groupBy('customer_id')
            ->findAll();

        $byCustomer = [];
        foreach ($rows as $row) {
            $byCustomer[(int) $row->customer_id] = (int) $row->total;
        }

        return $byCustomer;
    }

    /** Most recent entries first, capped so one customer's history can't grow the response unbounded. */
    public function historyForCustomer(int $customerId, int $limit = 200): array
    {
        return $this->where('customer_id', $customerId)
            ->orderBy('created_at', 'DESC')
            ->orderBy('id', 'DESC')
            ->limit($limit)
            ->findAll();
    }

    /**
     * Appends one ledger row and returns it. balance_after is computed
     * from the customer's current balance plus this delta, inside the
     * same flow that inserts the row, so it's always consistent with the
     * running total at the moment of write.
     */
    public function record(int $customerId, int $loyaltyCardId, int $pointsDelta, ?string $note, ?int $createdBy): object
    {
        $newBalance = $this->balanceForCustomer($customerId) + $pointsDelta;

        $id = $this->insert([
            'customer_id' => $customerId,
            'loyalty_card_id' => $loyaltyCardId,
            'points_delta' => $pointsDelta,
            'balance_after' => $newBalance,
            'note' => $note,
            'created_by' => $createdBy,
            'created_at' => date('Y-m-d H:i:s'),
        ], true);

        return $this->find($id);
    }
}
