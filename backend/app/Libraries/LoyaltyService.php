<?php

namespace App\Libraries;

/**
 * The pure usability check behind LoyaltyCardModel::isUsable() — split
 * out as a plain, DB-free class (like TaxService/PaymentService/
 * InventoryCalculator/WeightCalculator) since it only ever inspects the
 * card row it's handed, never queries anything itself.
 */
class LoyaltyService
{
    public const STATUS_ACTIVE = 'active';

    /**
     * A card that scans clean and can actually be used at the register:
     * status is active, and (if set) it hasn't expired.
     */
    public function isUsable(object $card): bool
    {
        if ($card->status !== self::STATUS_ACTIVE) {
            return false;
        }

        return $card->expires_at === null || strtotime($card->expires_at) >= time();
    }
}
