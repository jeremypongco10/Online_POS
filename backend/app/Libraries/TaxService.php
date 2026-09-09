<?php

namespace App\Libraries;

use App\Models\CategoryDiscountEligibilityModel;
use App\Models\ProductDiscountEligibilityModel;
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

    /*
     * -----------------------------------------------------------------
     * Discount types (Philippine retail POS)
     * -----------------------------------------------------------------
     *
     * The full set a cashier can pick, mirrored on the frontend by
     * frontend/src/pos/discountTypes.ts — that file drives the UI and
     * the client-side cart preview, this one is what actually decides
     * the money on checkout. Keep the two lists in sync by hand; there
     * is no way to share one source of truth across PHP and TypeScript
     * here, the same situation this codebase already accepted for its
     * tax math (see this class's own docblock vs. posTypes.ts).
     *
     * Three buckets, matching how differently each is allowed to be
     * decided:
     *
     *  - GOVERNMENT (self::DISCOUNT_RATES keys): a fixed statutory rate
     *    the cashier cannot change, driven by RA 9994 (Senior Citizens)
     *    and RA 10754 (PWD) and their joint IRR with DTI/DA/DOH for the
     *    5% Basic Necessities & Prime Commodities discount. The amount
     *    is always computed HERE from the rate, never trusted from the
     *    client — unlike an ordinary discount, a wrong number here is a
     *    tax-compliance error, not just a pricing one. Requires the
     *    purchaser's name and ID number on file (sales.discount_holder_
     *    name/discount_id_number) — BIR RR 7-2010 requires this
     *    documentation for the discount to be valid at all.
     *
     *  - CONFIGURABLE (regular/promo/employee/member/wholesale): the
     *    cashier enters a percentage or a fixed peso amount at the
     *    register, same trust model this app already applies to
     *    unit_price and every discount before this feature existed —
     *    the terminal is assumed to be attended and the amount lands in
     *    the audit trail via the sale itself. No forced VAT treatment;
     *    the line's own tax_rate_id still governs.
     *
     *  - MANUAL: same free-entry behaviour as the configurable group,
     *    but the one type explicitly gated behind a supervisor (see
     *    Company::require_manual_discount_approval and
     *    SalesController::authorizeItemDiscount/logItemDiscount) —
     *    every other type on this list has a statutory rate or a
     *    standing business policy behind it; Manual is pure discretion,
     *    and that's exactly what a supervisor sign-off exists to check.
     *
     * Deliberately NOT modeled as "stack multiple discounts on one
     * line" — sale_items carries exactly one discount_type and one
     * discount amount per row. A cashier switching a line from one type
     * to another always REPLACES the old discount rather than adding to
     * it, which is what keeps a Senior Citizen discount and a Promo
     * discount from ever combining on the same item without any extra
     * stacking logic needed here — there is simply nowhere for a second
     * discount to attach.
     */
    public const DISCOUNT_SENIOR_CITIZEN = 'senior_citizen';
    public const DISCOUNT_PWD = 'pwd';
    public const DISCOUNT_SC_PWD_5_BNPC = 'sc_pwd_5_bnpc';
    public const DISCOUNT_REGULAR = 'regular';
    public const DISCOUNT_PROMO = 'promo';
    public const DISCOUNT_EMPLOYEE = 'employee';
    public const DISCOUNT_MEMBER = 'member';
    public const DISCOUNT_WHOLESALE = 'wholesale';
    public const DISCOUNT_MANUAL = 'manual';

    public const DISCOUNT_TYPES = [
        self::DISCOUNT_SENIOR_CITIZEN,
        self::DISCOUNT_PWD,
        self::DISCOUNT_SC_PWD_5_BNPC,
        self::DISCOUNT_REGULAR,
        self::DISCOUNT_PROMO,
        self::DISCOUNT_EMPLOYEE,
        self::DISCOUNT_MEMBER,
        self::DISCOUNT_WHOLESALE,
        self::DISCOUNT_MANUAL,
    ];

    /** Fixed statutory percentage for the three government discount types — never cashier-editable. */
    private const DISCOUNT_RATES = [
        self::DISCOUNT_SENIOR_CITIZEN => 20.0,
        self::DISCOUNT_PWD => 20.0,
        self::DISCOUNT_SC_PWD_5_BNPC => 5.0,
    ];

    /**
     * Only the primary 20% Senior Citizen / PWD discount carries the VAT
     * exemption. The 5% Basic Necessities & Prime Commodities discount
     * is a *separate* statutory benefit (granted in lieu of, not on top
     * of, the 20%+exempt one on the same purchase) and does not itself
     * remove VAT — it is computed the same way an ordinary discount is,
     * just at a rate the cashier can't edit.
     */
    private const VAT_EXEMPT_DISCOUNT_TYPES = [
        self::DISCOUNT_SENIOR_CITIZEN,
        self::DISCOUNT_PWD,
    ];

    /** Government types requiring the purchaser's name + ID number on the sale. All three do — 5% BNPC is also SC/PWD-only and carries the same documentation duty as the 20% discount. */
    private const ID_REQUIRED_DISCOUNT_TYPES = [
        self::DISCOUNT_SENIOR_CITIZEN,
        self::DISCOUNT_PWD,
        self::DISCOUNT_SC_PWD_5_BNPC,
    ];

    /** For error messages only (e.g. isProductEligibleForDiscount's caller) — mirrors discountTypes.ts's DISCOUNT_TYPE_BY_CODE[x].label, kept in sync by hand like everything else in this class. */
    private const DISCOUNT_LABELS = [
        self::DISCOUNT_SENIOR_CITIZEN => 'Senior Citizen',
        self::DISCOUNT_PWD => 'PWD',
        self::DISCOUNT_SC_PWD_5_BNPC => '5% Basic Necessities / Prime Commodities',
        self::DISCOUNT_REGULAR => 'Regular Discount',
        self::DISCOUNT_PROMO => 'Promo Discount',
        self::DISCOUNT_EMPLOYEE => 'Employee Discount',
        self::DISCOUNT_MEMBER => 'Member / Loyalty Discount',
        self::DISCOUNT_WHOLESALE => 'Wholesale / Bulk Discount',
        self::DISCOUNT_MANUAL => 'Manual Discount',
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

    public function isKnownDiscountType(?string $discountType): bool
    {
        return $discountType === null || in_array($discountType, self::DISCOUNT_TYPES, true);
    }

    public function isGovernmentDiscountType(?string $discountType): bool
    {
        return $discountType !== null && array_key_exists($discountType, self::DISCOUNT_RATES);
    }

    public function discountRequiresVatExemption(?string $discountType): bool
    {
        return $discountType !== null && in_array($discountType, self::VAT_EXEMPT_DISCOUNT_TYPES, true);
    }

    public function discountRequiresHolderId(?string $discountType): bool
    {
        return $discountType !== null && in_array($discountType, self::ID_REQUIRED_DISCOUNT_TYPES, true);
    }

    /**
     * Computes a government-type discount line end-to-end, the
     * server-authoritative counterpart to calculateLine() — callers
     * must use this instead of calculateLine() whenever
     * isGovernmentDiscountType() is true, and must NOT trust any
     * discount amount the client sent for one of these lines.
     *
     * For the VAT-exempt pair (Senior Citizen, PWD), BIR RR 7-2010 sets
     * the order of operations deliberately differently from an ordinary
     * discounted+taxed line: VAT comes out FIRST (against the full,
     * undiscounted price), and the 20% is then taken off that
     * VAT-exclusive amount — not the other way around. Concretely, for
     * a catalog price that already includes VAT:
     *
     *   netBeforeDiscount = (qty × unitPrice) / (1 + rate/100)   [VAT backed out of the full price]
     *   discount           = netBeforeDiscount × 20%
     *   amountDue          = netBeforeDiscount − discount        [no VAT added back — exempt]
     *
     * This is why it can't reuse calculateLine(), whose formula
     * (baseAmount = qty×price − discount, THEN classify/tax that
     * result) computes a smaller VAT-exclusive base than the correct
     * one whenever a real discount is layered on top of tax removal in
     * the wrong order. When `$inclusive` is false the two orders
     * coincide (there's no VAT to back out of a price that doesn't
     * carry it yet), so this still produces the right number either
     * way — it's simply the one formula that's always correct instead
     * of only conditionally so.
     *
     * 5% Basic Necessities & Prime Commodities does not carry VAT
     * exemption (see VAT_EXEMPT_DISCOUNT_TYPES) — its discount is
     * simply 5% of the plain quantity × unitPrice, run through the
     * ordinary calculateLine() at the line's own tax rate, same as any
     * other discount type.
     *
     * IMPORTANT — same caveat as this class's own docblock: this
     * encodes a good-faith reading of RA 9994/RA 10754 and their IRRs,
     * not a substitute for accountant/BIR review before a real
     * deployment relies on it.
     *
     * @throws InvalidArgumentException if $discountType isn't one of the government types.
     */
    public function calculateGovernmentDiscountLine(
        string $discountType,
        float $quantity,
        float $unitPrice,
        ?object $taxRate = null,
        bool $inclusive = false
    ): array {
        if (! $this->isGovernmentDiscountType($discountType)) {
            throw new InvalidArgumentException("Not a government discount type: {$discountType}");
        }

        $ratePercent = self::DISCOUNT_RATES[$discountType];

        if (! $this->discountRequiresVatExemption($discountType)) {
            // 5% BNPC: an ordinary discount at a fixed rate, no VAT override.
            $discount = round($quantity * $unitPrice * $ratePercent / 100, 2);

            return $this->calculateLine($quantity, $unitPrice, $discount, $taxRate, $inclusive);
        }

        $grossBeforeDiscount = $quantity * $unitPrice;
        $taxRatePercent = $taxRate ? (float) $taxRate->rate : 0.0;
        $netBeforeDiscount = $inclusive && $taxRatePercent > 0
            ? $grossBeforeDiscount / (1 + $taxRatePercent / 100)
            : $grossBeforeDiscount;

        $discount = round($netBeforeDiscount * $ratePercent / 100, 2);
        $net = round($netBeforeDiscount - $discount, 2);

        return [
            'tax_type' => self::TYPE_VAT_EXEMPT,
            'rate' => $ratePercent,
            'inclusive' => $inclusive,
            'net_amount' => $net,
            'tax_amount' => 0.0,
            'gross_amount' => $net,
            'taxable_amount' => 0.0,
            'exempt_amount' => $net,
            'zero_rated_amount' => 0.0,
            'non_vat_amount' => 0.0,
            'tax_rate_id' => $taxRate->id ?? null,
            'quantity' => $quantity,
            'unit_price' => $unitPrice,
            'discount' => $discount,
        ];
    }

    public static function discountLabel(string $discountType): string
    {
        return self::DISCOUNT_LABELS[$discountType] ?? $discountType;
    }

    /**
     * Whether $product may receive $discountType at all — resolved most-
     * specific-first:
     *
     *   1. A product_discount_eligibility row for this exact product.
     *   2. Failing that, a category_discount_eligibility row for the
     *      product's category.
     *   3. Failing both, NOT eligible. Deliberately opt-in rather than
     *      opt-out, per a direct decision to flip the original design:
     *      every product/category starts with every discount type off,
     *      and a company (or store admin) turns individual ones on —
     *      see CategoriesController::updateDiscountEligibility and
     *      ProductsController::updateDiscountEligibility. Nothing here
     *      guesses which products should qualify for which discount;
     *      that's entirely the deploying business's call to make and
     *      keep current, government-mandated types (Senior Citizen/
     *      PWD/5% BNPC) included.
     *
     * $product === null (a custom, non-catalog line item — see
     * SalesController::create()'s empty($item['product_id']) branch) is
     * the one built-in exception, and stays eligible regardless of the
     * off-by-default rule above: there is no catalog record to look an
     * override up against, and inventing a blanket rule for custom
     * items wasn't asked for and isn't this method's call to make.
     * Documented here as a real, known gap rather than a silent
     * decision — a deployment relying on custom line items for
     * anything an SC/PWD/other restricted discount type could apply to
     * should treat this as unenforced until it's specifically
     * addressed.
     */
    public function isProductEligibleForDiscount(string $discountType, ?object $product): bool
    {
        if ($product === null) {
            return true;
        }

        $productRule = model(ProductDiscountEligibilityModel::class)
            ->where('product_id', $product->id)
            ->where('discount_type', $discountType)
            ->first();
        if ($productRule !== null) {
            return (bool) $productRule->eligible;
        }

        return $this->isCategoryEligibleForDiscount($discountType, $product->category_id ?? null);
    }

    /**
     * The category layer alone (category rule, else NOT eligible by
     * default) — what a product's eligibility would resolve to if it
     * carried NO product-level override of its own. Factored out of
     * isProductEligibleForDiscount() because ProductsController::
     * updateDiscountEligibility() needs exactly this value on its own:
     * writing a product-level "eligible: true" can only safely DELETE
     * the row (this table is sparse by design — see the migration that
     * creates it) when the category layer already agrees — which, now
     * that the category layer itself defaults to false, means most
     * product-level "turn this on" requests genuinely are overrides and
     * need a real eligible=1 row; only a product being explicitly
     * turned OFF where the category is already off (or was itself
     * turned on) collapses back to no row. See that controller's
     * docblock for the full delete-vs-write reasoning.
     */
    public function isCategoryEligibleForDiscount(string $discountType, ?int $categoryId): bool
    {
        if ($categoryId === null) {
            return false;
        }

        $categoryRule = model(CategoryDiscountEligibilityModel::class)
            ->where('category_id', $categoryId)
            ->where('discount_type', $discountType)
            ->first();

        return $categoryRule !== null && (bool) $categoryRule->eligible;
    }
}
