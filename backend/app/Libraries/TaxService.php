<?php

namespace App\Libraries;

use App\Models\TaxRateModel;
use InvalidArgumentException;

/**
 * The single place tax math happens. Controllers must resolve a rate
 * through TaxRateModel and hand it to this service — never hard-code a
 * VAT percentage or reimplement the inclusive/exclusive math inline.
 *
 * Tax classifications (matched against tax_rates.name, case-insensitively):
 *   - 'vat'         standard vatable sale, rate > 0
 *   - 'vat_exempt'  statutorily VAT-exempt, rate = 0
 *   - 'zero_rated'  VAT-registered but taxed at 0%, rate = 0
 *   - 'non_vat'     seller/line not under the VAT regime at all
 *
 * Money is rounded to 2 decimals on every returned figure (DECIMAL(15,2)
 * columns downstream); quantities are the caller's responsibility to
 * round to the product's unit precision before this service ever sees
 * them (see UnitModel::roundToPrecision, already applied in Sales/
 * Purchases/Inventory controllers).
 *
 * IMPORTANT — Philippine BIR compliance: this service produces the
 * standard four-bucket breakdown (Vatable Sales, VAT Amount, VAT-Exempt
 * Sales, Zero-Rated Sales) used on BIR-compliant invoices/receipts, but
 * actual BIR requirements (invoicing format, CAS/POS accreditation,
 * rounding rules, senior citizen/PWD discount VAT treatment, etc.) are
 * business- and jurisdiction-specific. Before a real Philippine
 * deployment, have this validated against the applicable BIR
 * regulations for the specific business — this code is not a substitute
 * for that review.
 */
class TaxService
{
    public const TYPE_VAT = 'vat';
    public const TYPE_VAT_EXEMPT = 'vat_exempt';
    public const TYPE_ZERO_RATED = 'zero_rated';
    public const TYPE_NON_VAT = 'non_vat';

    private const VALID_TYPES = [
        self::TYPE_VAT,
        self::TYPE_VAT_EXEMPT,
        self::TYPE_ZERO_RATED,
        self::TYPE_NON_VAT,
    ];

    /**
     * Full breakdown for one amount under one tax classification.
     *
     * @return array{
     *   tax_type: string, rate: float, inclusive: bool,
     *   net_amount: float, tax_amount: float, gross_amount: float,
     *   taxable_amount: float, exempt_amount: float,
     *   zero_rated_amount: float, non_vat_amount: float
     * }
     */
    public function calculateTax(float $amount, float $ratePercent, string $taxType = self::TYPE_VAT, bool $inclusive = false): array
    {
        if (! in_array($taxType, self::VALID_TYPES, true)) {
            throw new InvalidArgumentException("Unknown tax type: {$taxType}");
        }

        $breakdown = [
            'tax_type' => $taxType,
            'rate' => $ratePercent,
            'inclusive' => $inclusive,
            'net_amount' => 0.0,
            'tax_amount' => 0.0,
            'gross_amount' => 0.0,
            'taxable_amount' => 0.0,
            'exempt_amount' => 0.0,
            'zero_rated_amount' => 0.0,
            'non_vat_amount' => 0.0,
        ];

        switch ($taxType) {
            case self::TYPE_VAT:
                $vat = $this->calculateVAT($amount, $ratePercent, $inclusive);
                $breakdown['net_amount'] = $vat['net_amount'];
                $breakdown['tax_amount'] = $vat['tax_amount'];
                $breakdown['gross_amount'] = $vat['gross_amount'];
                $breakdown['taxable_amount'] = $vat['net_amount'];
                break;

            case self::TYPE_VAT_EXEMPT:
                $exempt = $this->calculateExemptAmount($amount);
                $breakdown['net_amount'] = $exempt;
                $breakdown['gross_amount'] = $exempt;
                $breakdown['exempt_amount'] = $exempt;
                break;

            case self::TYPE_ZERO_RATED:
                $zeroRated = $this->calculateZeroRatedAmount($amount);
                $breakdown['net_amount'] = $zeroRated;
                $breakdown['gross_amount'] = $zeroRated;
                $breakdown['zero_rated_amount'] = $zeroRated;
                break;

            case self::TYPE_NON_VAT:
                $nonVat = round($amount, 2);
                $breakdown['net_amount'] = $nonVat;
                $breakdown['gross_amount'] = $nonVat;
                $breakdown['non_vat_amount'] = $nonVat;
                break;
        }

        return $breakdown;
    }

    /**
     * VAT-specific net/tax/gross split.
     *
     * Exclusive (default): $amount is the taxable base; tax is added on top.
     *   net = amount, tax = net * rate/100, gross = net + tax
     *
     * Inclusive: $amount already contains the tax; back it out.
     *   net = amount / (1 + rate/100), tax = amount - net, gross = amount
     *
     * @return array{net_amount: float, tax_amount: float, gross_amount: float}
     */
    public function calculateVAT(float $amount, float $ratePercent, bool $inclusive = false): array
    {
        $rateFraction = $ratePercent / 100;

        if ($inclusive) {
            $gross = $amount;
            $net = $rateFraction > 0 ? $amount / (1 + $rateFraction) : $amount;
            $tax = $gross - $net;
        } else {
            $net = $amount;
            $tax = $net * $rateFraction;
            $gross = $net + $tax;
        }

        return [
            'net_amount' => round($net, 2),
            'tax_amount' => round($tax, 2),
            'gross_amount' => round($gross, 2),
        ];
    }

    /** The VAT-taxable base of an amount (net of VAT, regardless of pricing mode). */
    public function calculateTaxableAmount(float $amount, float $ratePercent, bool $inclusive = false): float
    {
        return $this->calculateVAT($amount, $ratePercent, $inclusive)['net_amount'];
    }

    /** VAT-exempt sales carry no VAT component; the full amount is the exempt bucket. */
    public function calculateExemptAmount(float $amount): float
    {
        return round($amount, 2);
    }

    /** Zero-rated sales are taxed at 0% but remain a distinct BIR reporting bucket from exempt. */
    public function calculateZeroRatedAmount(float $amount): float
    {
        return round($amount, 2);
    }

    /**
     * Computes one sale/purchase line end-to-end: applies the discount to
     * the base amount, resolves the tax classification from a tax_rates
     * row (or its absence), and returns the same breakdown shape as
     * calculateTax(), plus the resolved rate/tax_rate_id for persistence.
     *
     * This is what SalesController/PurchasesController call — the only
     * place quantity * price - discount and the tax split happen.
     */
    public function calculateLine(
        float $quantity,
        float $unitPrice,
        float $discount = 0.0,
        ?object $taxRate = null,
        bool $inclusive = false
    ): array {
        $baseAmount = ($quantity * $unitPrice) - $discount;

        $ratePercent = $taxRate ? (float) $taxRate->rate : 0.0;
        $taxType = $taxRate ? $this->classify($taxRate) : self::TYPE_NON_VAT;

        $result = $this->calculateTax($baseAmount, $ratePercent, $taxType, $inclusive);
        $result['tax_rate_id'] = $taxRate->id ?? null;
        $result['quantity'] = $quantity;
        $result['unit_price'] = $unitPrice;
        $result['discount'] = round($discount, 2);

        return $result;
    }

    /**
     * Aggregates calculateLine()/calculateTax() results into an
     * invoice-level BIR-style breakdown.
     *
     * @param array<int, array<string, mixed>> $lines
     */
    public function summarize(array $lines): array
    {
        $totals = [
            'taxable_amount' => 0.0,
            'tax_amount' => 0.0,
            'exempt_amount' => 0.0,
            'zero_rated_amount' => 0.0,
            'non_vat_amount' => 0.0,
            'net_amount' => 0.0,
            'gross_amount' => 0.0,
        ];

        foreach ($lines as $line) {
            $totals['taxable_amount'] += $line['taxable_amount'];
            $totals['tax_amount'] += $line['tax_amount'];
            $totals['exempt_amount'] += $line['exempt_amount'];
            $totals['zero_rated_amount'] += $line['zero_rated_amount'];
            $totals['non_vat_amount'] += $line['non_vat_amount'];
            $totals['net_amount'] += $line['net_amount'];
            $totals['gross_amount'] += $line['gross_amount'];
        }

        foreach ($totals as $key => $value) {
            $totals[$key] = round($value, 2);
        }

        return $totals;
    }

    /**
     * The single-letter flag a BIR-style receipt prints beside each line
     * so a customer can tell at a glance how that item was taxed:
     * V(atable), E(xempt), Z(ero-rated), N(on-VAT).
     *
     * Derived from classify() rather than stored as an editable column on
     * tax_rates, deliberately: a hand-entered letter could say "E" on a
     * row that classify() treats as 12% VAT, and the receipt would then
     * claim exempt while the sale actually charged the tax. Deriving it
     * means the flag and the math can never disagree.
     */
    public function indicator(object $taxRate): string
    {
        return $this->indicatorForType($this->classify($taxRate));
    }

    /**
     * Same flag, from an already-resolved tax type rather than a rate row
     * — sale_items persists `tax_type` per line, so a receipt can be
     * flagged from the sale as it was actually rung up, without
     * re-reading (or depending on the continued existence of) the
     * tax_rates row behind it.
     */
    public function indicatorForType(?string $taxType): string
    {
        return match ($taxType) {
            self::TYPE_VAT => 'V',
            self::TYPE_VAT_EXEMPT => 'E',
            self::TYPE_ZERO_RATED => 'Z',
            default => 'N',
        };
    }

    /** Classifies a tax_rates row by name (falls back to rate-based guess for unrecognized names). */
    public function classify(object $taxRate): string
    {
        $name = strtoupper(trim((string) $taxRate->name));

        if (str_contains($name, 'ZERO RATED') || str_contains($name, 'ZERO-RATED')) {
            return self::TYPE_ZERO_RATED;
        }

        if (str_contains($name, 'EXEMPT')) {
            return self::TYPE_VAT_EXEMPT;
        }

        if (str_contains($name, 'NON VAT') || str_contains($name, 'NON-VAT')) {
            return self::TYPE_NON_VAT;
        }

        if (str_contains($name, 'VAT')) {
            return self::TYPE_VAT;
        }

        return (float) $taxRate->rate > 0 ? self::TYPE_VAT : self::TYPE_NON_VAT;
    }

    /**
     * A discount is only ever a reduction of the line's own subtotal —
     * never negative (which would inflate the line instead of reducing
     * it) and never more than the subtotal itself (which would flip the
     * line negative). Callers must check this before calculateLine().
     */
    public function isValidDiscount(float $quantity, float $unitPrice, float $discount): bool
    {
        return $discount >= 0 && $discount <= round($quantity * $unitPrice, 2) + 0.001;
    }

    public function resolveRate(?int $taxRateId): ?object
    {
        if ($taxRateId === null) {
            return null;
        }

        return model(TaxRateModel::class)->find($taxRateId);
    }
}
