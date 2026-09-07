<?php

use App\Libraries\TaxService;
use CodeIgniter\Test\CIUnitTestCase;

/**
 * Discount math lives in TaxService::calculateLine() (applied to the
 * base amount before tax) and TaxService::isValidDiscount() (the bounds
 * check SalesController runs before ever calling calculateLine()).
 *
 * @internal
 */
final class DiscountCalculationTest extends CIUnitTestCase
{
    private const DELTA = 0.001;

    private TaxService $tax;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tax = new TaxService();
    }

    // --- Bounds validation ---

    public function testZeroDiscountIsValid(): void
    {
        $this->assertTrue($this->tax->isValidDiscount(2.0, 50.00, 0.0));
    }

    public function testDiscountEqualToLineSubtotalIsValid(): void
    {
        // A "free item" line: 100% off, but never negative.
        $this->assertTrue($this->tax->isValidDiscount(1.0, 75.00, 75.00));
    }

    public function testDiscountUnderLineSubtotalIsValid(): void
    {
        $this->assertTrue($this->tax->isValidDiscount(3.0, 20.00, 10.00));
    }

    public function testNegativeDiscountIsInvalid(): void
    {
        // A negative discount would inflate the line instead of reducing it.
        $this->assertFalse($this->tax->isValidDiscount(1.0, 100.00, -10.00));
    }

    public function testDiscountLargerThanLineSubtotalIsInvalid(): void
    {
        // 1 unit @ 50 = 50 subtotal; a 60 discount would flip the line negative.
        $this->assertFalse($this->tax->isValidDiscount(1.0, 50.00, 60.00));
    }

    public function testDiscountValidAcrossMultipleUnits(): void
    {
        // 3 units @ 20 = 60 subtotal; 60 discount is exactly the boundary (valid).
        $this->assertTrue($this->tax->isValidDiscount(3.0, 20.00, 60.00));
        // One centavo over the boundary is not.
        $this->assertFalse($this->tax->isValidDiscount(3.0, 20.00, 60.01));
    }

    // --- Effect on the line total once a valid discount is applied ---

    public function testDiscountReducesTaxableBaseBeforeTax(): void
    {
        $vatRate = (object) ['id' => 1, 'name' => 'VAT', 'rate' => 12.0];

        // 2 units @ 100, 50 discount -> taxable base 150, not 200.
        $result = $this->tax->calculateLine(2.0, 100.00, 50.00, $vatRate, false);

        $this->assertEqualsWithDelta(150.00, $result['net_amount'], self::DELTA);
        $this->assertEqualsWithDelta(18.00, $result['tax_amount'], self::DELTA);
        $this->assertEqualsWithDelta(168.00, $result['gross_amount'], self::DELTA);
    }

    public function testFullDiscountZeroesOutTheLine(): void
    {
        $vatRate = (object) ['id' => 1, 'name' => 'VAT', 'rate' => 12.0];

        $result = $this->tax->calculateLine(1.0, 80.00, 80.00, $vatRate, false);

        $this->assertEqualsWithDelta(0.00, $result['net_amount'], self::DELTA);
        $this->assertEqualsWithDelta(0.00, $result['tax_amount'], self::DELTA);
        $this->assertEqualsWithDelta(0.00, $result['gross_amount'], self::DELTA);
    }

    public function testNoDiscountLeavesLineUnchanged(): void
    {
        $result = $this->tax->calculateLine(4.0, 25.00, 0.0, null, false);

        $this->assertEqualsWithDelta(100.00, $result['net_amount'], self::DELTA);
        $this->assertEqualsWithDelta(0.00, $result['discount'], self::DELTA);
    }

    // --- Government discount types (calculateGovernmentDiscountLine) ---

    public function testSeniorCitizenDiscountRemovesVatBeforeApplyingTwentyPercent(): void
    {
        // VAT-inclusive shelf price: 2 units @ 112.00 = 224.00 gross.
        // netBeforeDiscount = 224 / 1.12 = 200.00
        // discount = 200 * 20% = 40.00
        // amountDue = 200 - 40 = 160.00, VAT exempt (no tax added back).
        $vatRate = (object) ['id' => 1, 'name' => 'VAT', 'rate' => 12.0];

        $result = $this->tax->calculateGovernmentDiscountLine('senior_citizen', 2.0, 112.00, $vatRate, true);

        $this->assertSame('vat_exempt', $result['tax_type']);
        $this->assertEqualsWithDelta(40.00, $result['discount'], self::DELTA);
        $this->assertEqualsWithDelta(160.00, $result['net_amount'], self::DELTA);
        $this->assertEqualsWithDelta(0.00, $result['tax_amount'], self::DELTA);
        $this->assertEqualsWithDelta(160.00, $result['gross_amount'], self::DELTA);
    }

    public function testPwdDiscountMatchesSeniorCitizenMath(): void
    {
        $vatRate = (object) ['id' => 1, 'name' => 'VAT', 'rate' => 12.0];

        $result = $this->tax->calculateGovernmentDiscountLine('pwd', 1.0, 56.00, $vatRate, true);

        // netBeforeDiscount = 56 / 1.12 = 50.00; discount = 10.00; due = 40.00.
        $this->assertSame('vat_exempt', $result['tax_type']);
        $this->assertEqualsWithDelta(10.00, $result['discount'], self::DELTA);
        $this->assertEqualsWithDelta(40.00, $result['net_amount'], self::DELTA);
    }

    public function testFiveBnpcDiscountDoesNotForceVatExemption(): void
    {
        // Separate statutory benefit from the 20% one — no VAT override,
        // just an ordinary 5%-of-subtotal discount at the line's own rate.
        $vatRate = (object) ['id' => 1, 'name' => 'VAT', 'rate' => 12.0];

        $result = $this->tax->calculateGovernmentDiscountLine('sc_pwd_5_bnpc', 1.0, 100.00, $vatRate, false);

        $this->assertSame('vat', $result['tax_type']);
        $this->assertEqualsWithDelta(5.00, $result['discount'], self::DELTA);
        // (100 - 5) taxable base at 12%: net 95, tax 11.40, gross 106.40.
        $this->assertEqualsWithDelta(95.00, $result['net_amount'], self::DELTA);
        $this->assertEqualsWithDelta(11.40, $result['tax_amount'], self::DELTA);
    }

    public function testSeniorCitizenDiscountWithNoTaxRateStillAppliesTwentyPercent(): void
    {
        // A non-VAT line (no tax_rate_id at all): nothing to back out, so
        // the discount is just 20% of the plain amount.
        $result = $this->tax->calculateGovernmentDiscountLine('senior_citizen', 3.0, 50.00, null, true);

        $this->assertEqualsWithDelta(30.00, $result['discount'], self::DELTA);
        $this->assertEqualsWithDelta(120.00, $result['net_amount'], self::DELTA);
    }

    public function testCalculateGovernmentDiscountLineRejectsNonGovernmentType(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->tax->calculateGovernmentDiscountLine('regular', 1.0, 100.00, null, false);
    }

    public function testIsGovernmentDiscountTypeAndVatExemptionFlags(): void
    {
        $this->assertTrue($this->tax->isGovernmentDiscountType('senior_citizen'));
        $this->assertTrue($this->tax->isGovernmentDiscountType('pwd'));
        $this->assertTrue($this->tax->isGovernmentDiscountType('sc_pwd_5_bnpc'));
        $this->assertFalse($this->tax->isGovernmentDiscountType('regular'));
        $this->assertFalse($this->tax->isGovernmentDiscountType(null));

        $this->assertTrue($this->tax->discountRequiresVatExemption('senior_citizen'));
        $this->assertTrue($this->tax->discountRequiresVatExemption('pwd'));
        $this->assertFalse($this->tax->discountRequiresVatExemption('sc_pwd_5_bnpc'));

        $this->assertTrue($this->tax->discountRequiresHolderId('senior_citizen'));
        $this->assertTrue($this->tax->discountRequiresHolderId('pwd'));
        $this->assertTrue($this->tax->discountRequiresHolderId('sc_pwd_5_bnpc'));
        $this->assertFalse($this->tax->discountRequiresHolderId('manual'));
    }

    public function testIsKnownDiscountType(): void
    {
        $this->assertTrue($this->tax->isKnownDiscountType(null));
        foreach (TaxService::DISCOUNT_TYPES as $type) {
            $this->assertTrue($this->tax->isKnownDiscountType($type));
        }
        $this->assertFalse($this->tax->isKnownDiscountType('bogus'));
    }
}
