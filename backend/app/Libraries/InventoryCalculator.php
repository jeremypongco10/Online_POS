<?php

namespace App\Libraries;

/**
 * The single place stock-balance math happens — mirrors TaxService's
 * role for tax. Every place inventory.quantity changes (a sale, a void,
 * a return, a purchase receipt, a transfer) is the same "current balance
 * plus/minus a signed delta" operation; controllers must compute the new
 * balance through here rather than reimplementing the arithmetic inline.
 */
class InventoryCalculator
{
    /**
     * The new on-hand balance after a movement. $delta is signed: negative
     * for stock leaving (a sale), positive for stock arriving (a void,
     * return, purchase receipt, or a transfer's destination leg).
     */
    public function applyDelta(float $currentQuantity, float $delta): float
    {
        return round($currentQuantity + $delta, 4);
    }

    /** Whether enough stock is on hand to satisfy a requested quantity — never true for a negative request. */
    public function hasSufficientStock(float $available, float $requested): bool
    {
        return $requested >= 0 && $available >= $requested;
    }
}
