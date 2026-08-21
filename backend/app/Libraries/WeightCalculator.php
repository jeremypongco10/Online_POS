<?php

namespace App\Libraries;

/**
 * The pure rounding step behind UnitModel::roundToPrecision() — split out
 * as a plain, DB-free class (like TaxService/PaymentService/
 * InventoryCalculator) so quantity rounding for weighted/counted units
 * (KG, PCS, L, ...) is unit-testable without a units table row.
 */
class WeightCalculator
{
    /** Rounds a quantity to the number of decimal places a unit of measure supports. */
    public function roundQuantity(float $quantity, int $decimals): float
    {
        return round($quantity, $decimals);
    }
}
