<?php

use App\Libraries\WeightCalculator;
use CodeIgniter\Test\CIUnitTestCase;

/**
 * "Weight calculation" here is quantity rounded to the precision a unit
 * of measure actually supports — e.g. 0.5 KG for a weighted product vs
 * a whole-number PCS for a counted one. WeightCalculator is the pure
 * half of UnitModel::roundToPrecision(), split out so it's testable
 * without a units table row/DB lookup — see UnitModel for the wrapper
 * that resolves decimal_places from the DB before delegating here.
 *
 * @internal
 */
final class WeightCalculationTest extends CIUnitTestCase
{
    private WeightCalculator $units;

    protected function setUp(): void
    {
        parent::setUp();
        $this->units = new WeightCalculator();
    }

    public function testWholeNumberUnitRoundsToZeroDecimals(): void
    {
        // PCS: decimal_places = 0
        $this->assertSame(3.0, $this->units->roundQuantity(3.4, 0));
        $this->assertSame(4.0, $this->units->roundQuantity(3.5, 0));
    }

    public function testKilogramUnitRoundsToThreeDecimals(): void
    {
        // KG: decimal_places = 3
        $this->assertSame(0.5, $this->units->roundQuantity(0.5, 3));
        $this->assertSame(1.235, $this->units->roundQuantity(1.2346, 3));
    }

    public function testLiterUnitRoundsToTwoDecimals(): void
    {
        $this->assertSame(1.46, $this->units->roundQuantity(1.457, 2));
    }

    public function testExactValueIsUnchanged(): void
    {
        $this->assertSame(2.5, $this->units->roundQuantity(2.5, 1));
    }

    public function testZeroDecimalPlacesFloorsFractionalWeight(): void
    {
        $this->assertSame(0.0, $this->units->roundQuantity(0.4, 0));
    }

    public function testHighPrecisionUnitPreservesFourDecimals(): void
    {
        $this->assertSame(0.1235, $this->units->roundQuantity(0.12346, 4));
    }
}
