<?php

use App\Libraries\PaymentService;
use CodeIgniter\Test\CIUnitTestCase;

/**
 * @internal
 */
final class PaymentCalculationTest extends CIUnitTestCase
{
    private const DELTA = 0.001;

    private PaymentService $payments;

    protected function setUp(): void
    {
        parent::setUp();
        $this->payments = new PaymentService();
    }

    // --- Totaling tendered amounts ---

    public function testSinglePaymentTotal(): void
    {
        $this->assertEqualsWithDelta(500.00, $this->payments->totalTendered([
            ['amount' => 500.00],
        ]), self::DELTA);
    }

    public function testSplitTenderSumsAllMethods(): void
    {
        // Cash 500 + GCash 500 = 1000, same scenario the PaymentPanel UI describes.
        $total = $this->payments->totalTendered([
            ['amount' => 500.00],
            ['amount' => 500.00],
        ]);

        $this->assertEqualsWithDelta(1000.00, $total, self::DELTA);
    }

    public function testThreeWaySplitTenderSums(): void
    {
        $total = $this->payments->totalTendered([
            ['amount' => 300.50],
            ['amount' => 150.25],
            ['amount' => 49.25],
        ]);

        $this->assertEqualsWithDelta(500.00, $total, self::DELTA);
    }

    public function testStringAmountsAreCoercedToFloat(): void
    {
        // Amounts arrive as JSON-decoded request data, which may be strings.
        $total = $this->payments->totalTendered([
            ['amount' => '250.00'],
            ['amount' => '250.00'],
        ]);

        $this->assertEqualsWithDelta(500.00, $total, self::DELTA);
    }

    public function testEmptyPaymentsTotalZero(): void
    {
        $this->assertEqualsWithDelta(0.00, $this->payments->totalTendered([]), self::DELTA);
    }

    // --- Sufficiency check ---

    public function testExactPaymentIsSufficient(): void
    {
        $this->assertTrue($this->payments->isSufficient(1000.00, 1000.00));
    }

    public function testOverpaymentIsSufficient(): void
    {
        $this->assertTrue($this->payments->isSufficient(1000.00, 1500.00));
    }

    public function testUnderpaymentIsInsufficient(): void
    {
        $this->assertFalse($this->payments->isSufficient(1000.00, 999.00));
    }

    public function testFloatRoundingWithinEpsilonIsStillSufficient(): void
    {
        // 3 lines of 33.33 could sum to 99.99000000000001 in float math —
        // must not be rejected as "insufficient" for a 100.00 total tendered as 99.99.
        $this->assertTrue($this->payments->isSufficient(99.99, 99.9899999));
    }

    public function testMeaningfulShortfallIsNotMaskedByEpsilon(): void
    {
        $this->assertFalse($this->payments->isSufficient(100.00, 99.90));
    }
}
