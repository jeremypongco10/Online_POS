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
}
