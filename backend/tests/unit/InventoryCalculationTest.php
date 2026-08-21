<?php

use App\Libraries\InventoryCalculator;
use CodeIgniter\Test\CIUnitTestCase;

/**
 * @internal
 */
final class InventoryCalculationTest extends CIUnitTestCase
{
    private const DELTA = 0.0001;

    private InventoryCalculator $inventory;

    protected function setUp(): void
    {
        parent::setUp();
        $this->inventory = new InventoryCalculator();
    }

    // --- applyDelta(): the shared math behind sales, voids, returns, purchases, transfers ---

    public function testSaleDecrementsStock(): void
    {
        // A sale removes stock — a negative delta.
        $this->assertEqualsWithDelta(7.0, $this->inventory->applyDelta(10.0, -3.0), self::DELTA);
    }

    public function testVoidRestoresStock(): void
    {
        // Voiding a sale (or a return/purchase receipt) adds stock back.
        $this->assertEqualsWithDelta(13.0, $this->inventory->applyDelta(10.0, 3.0), self::DELTA);
    }

    public function testTransferOutAndInAreSymmetric(): void
    {
        $sourceAfter = $this->inventory->applyDelta(20.0, -5.0);
        $destinationAfter = $this->inventory->applyDelta(8.0, 5.0);

        $this->assertEqualsWithDelta(15.0, $sourceAfter, self::DELTA);
        $this->assertEqualsWithDelta(13.0, $destinationAfter, self::DELTA);
    }

    public function testDecimalQuantityDelta(): void
    {
        // 0.5 KG sold from 2.75 KG on hand.
        $this->assertEqualsWithDelta(2.25, $this->inventory->applyDelta(2.75, -0.5), self::DELTA);
    }

    public function testZeroCurrentQuantityPlusIncomingStock(): void
    {
        $this->assertEqualsWithDelta(50.0, $this->inventory->applyDelta(0.0, 50.0), self::DELTA);
    }

    public function testDeltaCanDriveBalanceNegative(): void
    {
        // applyDelta() is pure math — hasSufficientStock() is what should
        // have prevented this from being called with too large a delta.
        $this->assertEqualsWithDelta(-2.0, $this->inventory->applyDelta(3.0, -5.0), self::DELTA);
    }

    // --- hasSufficientStock(): the guard checked before a sale/transfer is allowed ---

    public function testExactStockIsSufficient(): void
    {
        $this->assertTrue($this->inventory->hasSufficientStock(10.0, 10.0));
    }

    public function testMoreThanEnoughStockIsSufficient(): void
    {
        $this->assertTrue($this->inventory->hasSufficientStock(100.0, 3.0));
    }

    public function testInsufficientStockIsRejected(): void
    {
        $this->assertFalse($this->inventory->hasSufficientStock(2.0, 5.0));
    }

    public function testZeroStockRequestOfZeroIsSufficient(): void
    {
        $this->assertTrue($this->inventory->hasSufficientStock(0.0, 0.0));
    }

    public function testNegativeRequestIsNeverSufficient(): void
    {
        $this->assertFalse($this->inventory->hasSufficientStock(10.0, -1.0));
    }

    public function testDecimalStockBoundary(): void
    {
        $this->assertTrue($this->inventory->hasSufficientStock(1.500, 1.5));
        $this->assertFalse($this->inventory->hasSufficientStock(1.499, 1.5));
    }
}
