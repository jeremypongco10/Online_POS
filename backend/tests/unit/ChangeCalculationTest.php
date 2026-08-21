<?php

use App\Libraries\PaymentService;
use CodeIgniter\Test\CIUnitTestCase;

/**
 * @internal
 */
final class ChangeCalculationTest extends CIUnitTestCase
{
    private const DELTA = 0.001;

    private PaymentService $payments;

    protected function setUp(): void
    {
        parent::setUp();
        $this->payments = new PaymentService();
    }

    public function testExactPaymentHasNoChange(): void
    {
        $this->assertEqualsWithDelta(0.00, $this->payments->changeDue(500.00, 500.00), self::DELTA);
    }

    public function testOverpaymentReturnsTheDifference(): void
    {
        $this->assertEqualsWithDelta(100.00, $this->payments->changeDue(400.00, 500.00), self::DELTA);
    }

    public function testUnderpaymentNeverProducesNegativeChange(): void
    {
        // Checkout would already have been rejected by isSufficient() before
        // this is ever called, but change must still never go negative.
        $this->assertEqualsWithDelta(0.00, $this->payments->changeDue(500.00, 400.00), self::DELTA);
    }

    public function testChangeIsRoundedToTwoDecimals(): void
    {
        $this->assertEqualsWithDelta(0.01, $this->payments->changeDue(99.99, 100.00), self::DELTA);
    }

    public function testLargeOverpaymentChange(): void
    {
        $this->assertEqualsWithDelta(500.00, $this->payments->changeDue(500.00, 1000.00), self::DELTA);
    }

    public function testZeroTotalWithPaymentReturnsFullAmountAsChange(): void
    {
        $this->assertEqualsWithDelta(50.00, $this->payments->changeDue(0.00, 50.00), self::DELTA);
    }
}
