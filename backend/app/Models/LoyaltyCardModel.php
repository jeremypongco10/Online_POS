<?php

namespace App\Models;

use App\Libraries\LoyaltyService;
use CodeIgniter\Model;

class LoyaltyCardModel extends Model
{
    public const STATUS_ACTIVE = 'active';
    public const STATUS_INACTIVE = 'inactive';
    public const STATUS_BLOCKED = 'blocked';
    public const STATUS_LOST = 'lost';

    protected $table = 'loyalty_cards';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'object';
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';

    protected $allowedFields = [
        'customer_id', 'card_number', 'status', 'points', 'balance',
        'issued_at', 'activated_at', 'expires_at',
    ];

    protected $validationRules = [
        'id' => 'permit_empty|is_natural', // used only to resolve the {id} placeholder below
        'customer_id' => 'required|is_natural_no_zero',
        'card_number' => 'required|max_length[40]|is_unique[loyalty_cards.card_number,id,{id}]',
        'status' => 'permit_empty|in_list[active,inactive,blocked,lost]',
        'points' => 'permit_empty|integer',
        'balance' => 'permit_empty|decimal',
    ];

    /**
     * A card that scans clean and can actually be used at the register:
     * status is active, and (if set) it hasn't expired.
     */
    public function isUsable(object $card): bool
    {
        return (new LoyaltyService())->isUsable($card);
    }

    public function findByCardNumber(string $cardNumber): ?object
    {
        return $this->where('card_number', $cardNumber)->first();
    }

    /**
     * One card per customer id, keyed by customer_id, for attaching a
     * `points` figure to a list of customers without an N+1 query per
     * row. A customer with no card simply has no entry in the result.
     */
    public function forCustomerIds(array $customerIds): array
    {
        if ($customerIds === []) {
            return [];
        }

        $cards = $this->whereIn('customer_id', $customerIds)->orderBy('id', 'ASC')->findAll();

        $byCustomer = [];
        foreach ($cards as $card) {
            $byCustomer[(int) $card->customer_id] = $card;
        }

        return $byCustomer;
    }

    /**
     * The customer's card if they already have one, otherwise a freshly
     * issued one — so every customer can have points adjusted from the
     * Customers page without a separate "issue a card first" step.
     */
    public function firstOrCreateForCustomer(int $customerId): object
    {
        $existing = $this->where('customer_id', $customerId)->orderBy('id', 'ASC')->first();

        if ($existing) {
            return $existing;
        }

        $id = $this->insert([
            'customer_id' => $customerId,
            'card_number' => 'LC-' . strtoupper(bin2hex(random_bytes(6))),
            'status' => self::STATUS_ACTIVE,
            'points' => 0,
            'issued_at' => date('Y-m-d H:i:s'),
            'activated_at' => date('Y-m-d H:i:s'),
        ], true);

        return $this->find($id);
    }
}
