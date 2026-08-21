<?php

namespace App\Libraries;

/**
 * The single place payment/change math happens — mirrors TaxService's
 * role for tax. Controllers must total tenders, check sufficiency, and
 * compute change through here rather than reimplementing the arithmetic
 * inline (see SalesController::create()).
 */
class PaymentService
{
    /** A tiny epsilon guards against float rounding rejecting an exact payment. */
    private const EPSILON = 0.001;

    /**
     * Sums the tendered amount across every payment in a split-tender
     * transaction (e.g. Cash 500 + GCash 500 -> 1000.00).
     *
     * @param array<int, array{amount: float|int|string}> $payments
     */
    public function totalTendered(array $payments): float
    {
        $total = array_sum(array_map(static fn ($p) => (float) $p['amount'], $payments));

        return round($total, 2);
    }

    /** Whether the amount tendered covers the total, within a float-rounding epsilon. */
    public function isSufficient(float $total, float $amountPaid): bool
    {
        return $amountPaid >= $total - self::EPSILON;
    }

    /** Change due is never negative — an underpayment (caught by isSufficient()) is not this method's concern. */
    public function changeDue(float $total, float $amountPaid): float
    {
        return round(max(0, $amountPaid - $total), 2);
    }
}
