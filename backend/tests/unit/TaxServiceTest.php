<?php

use App\Libraries\TaxService;
use CodeIgniter\Test\CIUnitTestCase;

/**
 * @internal
 */
final class TaxServiceTest extends CIUnitTestCase
{
    private const DELTA = 0.001;

    private TaxService $tax;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tax = new TaxService();
    }

    private function rate(string $name, float $rate): object
    {
        return (object) ['id' => 1, 'name' => $name, 'rate' => $rate];
    }

    // --- VAT (standard 12%, exclusive) ---

    public function testVat(): void
    {
        $result = $this->tax->calculateTax(1000.00, 12.0, TaxService::TYPE_VAT);

        $this->assertEqualsWithDelta(1000.00, $result['net_amount'], self::DELTA);
        $this->assertEqualsWithDelta(120.00, $result['tax_amount'], self::DELTA);
        $this->assertEqualsWithDelta(1120.00, $result['gross_amount'], self::DELTA);
        $this->assertEqualsWithDelta(1000.00, $result['taxable_amount'], self::DELTA);
        $this->assertEqualsWithDelta(0.00, $result['exempt_amount'], self::DELTA);
        $this->assertEqualsWithDelta(0.00, $result['zero_rated_amount'], self::DELTA);
    }

    // --- VAT exempt ---

    public function testVatExempt(): void
    {
        $result = $this->tax->calculateTax(500.00, 0.0, TaxService::TYPE_VAT_EXEMPT);

        $this->assertEqualsWithDelta(0.00, $result['tax_amount'], self::DELTA);
        $this->assertEqualsWithDelta(500.00, $result['net_amount'], self::DELTA);
        $this->assertEqualsWithDelta(500.00, $result['gross_amount'], self::DELTA);
        $this->assertEqualsWithDelta(500.00, $result['exempt_amount'], self::DELTA);
        $this->assertEqualsWithDelta(0.00, $result['taxable_amount'], self::DELTA);
        $this->assertEqualsWithDelta(0.00, $result['zero_rated_amount'], self::DELTA);
    }

    // --- Zero rated ---

    public function testZeroRated(): void
    {
        $result = $this->tax->calculateTax(300.00, 0.0, TaxService::TYPE_ZERO_RATED);

        $this->assertEqualsWithDelta(0.00, $result['tax_amount'], self::DELTA);
        $this->assertEqualsWithDelta(300.00, $result['net_amount'], self::DELTA);
        $this->assertEqualsWithDelta(300.00, $result['gross_amount'], self::DELTA);
        $this->assertEqualsWithDelta(300.00, $result['zero_rated_amount'], self::DELTA);
        $this->assertEqualsWithDelta(0.00, $result['taxable_amount'], self::DELTA);
        $this->assertEqualsWithDelta(0.00, $result['exempt_amount'], self::DELTA);
    }

    // --- Mixed transaction: one line of each classification ---

    public function testMixedTransactionSummary(): void
    {
        $lines = [
            $this->tax->calculateTax(1000.00, 12.0, TaxService::TYPE_VAT),
            $this->tax->calculateTax(500.00, 0.0, TaxService::TYPE_VAT_EXEMPT),
            $this->tax->calculateTax(300.00, 0.0, TaxService::TYPE_ZERO_RATED),
        ];

        $summary = $this->tax->summarize($lines);

        $this->assertEqualsWithDelta(1000.00, $summary['taxable_amount'], self::DELTA); // VATable sales only
        $this->assertEqualsWithDelta(120.00, $summary['tax_amount'], self::DELTA);      // VAT on the VAT line only
        $this->assertEqualsWithDelta(500.00, $summary['exempt_amount'], self::DELTA);
        $this->assertEqualsWithDelta(300.00, $summary['zero_rated_amount'], self::DELTA);
        $this->assertEqualsWithDelta(1800.00, $summary['net_amount'], self::DELTA);     // 1000 + 500 + 300
        $this->assertEqualsWithDelta(1920.00, $summary['gross_amount'], self::DELTA);   // 1120 + 500 + 300
    }

    // --- Discount + VAT: discount must reduce the taxable base before tax is computed ---

    public function testDiscountAppliedBeforeVat(): void
    {
        $vatRate = $this->rate('VAT', 12.0);

        // 1 unit @ 1000, 100 discount -> taxable base 900, not 1000.
        $result = $this->tax->calculateLine(1.0, 1000.00, 100.00, $vatRate, false);

        $this->assertEqualsWithDelta(900.00, $result['net_amount'], self::DELTA);
        $this->assertEqualsWithDelta(108.00, $result['tax_amount'], self::DELTA);
        $this->assertEqualsWithDelta(1008.00, $result['gross_amount'], self::DELTA);
    }

    // --- Decimal quantity + VAT (e.g. 0.5 KG of rice) ---

    public function testDecimalQuantityWithVat(): void
    {
        $vatRate = $this->rate('VAT', 12.0);

        $result = $this->tax->calculateLine(0.5, 58.00, 0.0, $vatRate, false);

        $this->assertEqualsWithDelta(29.00, $result['net_amount'], self::DELTA);
        $this->assertEqualsWithDelta(3.48, $result['tax_amount'], self::DELTA);
        $this->assertEqualsWithDelta(32.48, $result['gross_amount'], self::DELTA);
    }

    // --- VAT-inclusive pricing: the given amount already contains VAT ---

    public function testVatInclusivePricing(): void
    {
        // A shelf price of 1120 that already includes 12% VAT backs out
        // to exactly 1000 net + 120 VAT.
        $result = $this->tax->calculateVAT(1120.00, 12.0, true);

        $this->assertEqualsWithDelta(1000.00, $result['net_amount'], self::DELTA);
        $this->assertEqualsWithDelta(120.00, $result['tax_amount'], self::DELTA);
        $this->assertEqualsWithDelta(1120.00, $result['gross_amount'], self::DELTA);
    }

    // --- VAT-exclusive pricing: tax is added on top of the given amount ---

    public function testVatExclusivePricing(): void
    {
        $result = $this->tax->calculateVAT(1000.00, 12.0, false);

        $this->assertEqualsWithDelta(1000.00, $result['net_amount'], self::DELTA);
        $this->assertEqualsWithDelta(120.00, $result['tax_amount'], self::DELTA);
        $this->assertEqualsWithDelta(1120.00, $result['gross_amount'], self::DELTA);

        // Same nominal amount, opposite mode, must NOT produce the same gross.
        $inclusive = $this->tax->calculateVAT(1000.00, 12.0, true);
        $this->assertNotEqualsWithDelta($result['gross_amount'], $inclusive['gross_amount'], self::DELTA);
    }

    // --- Helper method coverage: taxable/exempt/zero-rated amount shortcuts ---

    public function testCalculateTaxableAmountMatchesVatNet(): void
    {
        $this->assertEqualsWithDelta(1000.00, $this->tax->calculateTaxableAmount(1120.00, 12.0, true), self::DELTA);
        $this->assertEqualsWithDelta(500.00, $this->tax->calculateTaxableAmount(500.00, 12.0, false), self::DELTA);
    }

    public function testCalculateExemptAndZeroRatedAmountsPassThrough(): void
    {
        $this->assertEqualsWithDelta(250.00, $this->tax->calculateExemptAmount(250.00), self::DELTA);
        $this->assertEqualsWithDelta(75.55, $this->tax->calculateZeroRatedAmount(75.55), self::DELTA);
    }

    // --- Classification from a tax_rates row's name ---

    public function testClassifiesKnownTaxRateNames(): void
    {
        $this->assertSame(TaxService::TYPE_VAT, $this->tax->classify($this->rate('VAT', 12.0)));
        $this->assertSame(TaxService::TYPE_VAT_EXEMPT, $this->tax->classify($this->rate('VAT EXEMPT', 0.0)));
        $this->assertSame(TaxService::TYPE_ZERO_RATED, $this->tax->classify($this->rate('ZERO RATED', 0.0)));
        $this->assertSame(TaxService::TYPE_NON_VAT, $this->tax->classify($this->rate('NON VAT', 0.0)));
    }

    // --- No tax rate at all (e.g. a line with no tax_rate_id) behaves as non-VAT ---

    public function testCalculateLineWithNoTaxRateIsNonVat(): void
    {
        $result = $this->tax->calculateLine(3.0, 10.00, 0.0, null, false);

        $this->assertSame(TaxService::TYPE_NON_VAT, $result['tax_type']);
        $this->assertEqualsWithDelta(0.00, $result['tax_amount'], self::DELTA);
        $this->assertEqualsWithDelta(30.00, $result['non_vat_amount'], self::DELTA);
        $this->assertNull($result['tax_rate_id']);
    }
}
