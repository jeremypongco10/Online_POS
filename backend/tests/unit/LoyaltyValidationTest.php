<?php

use App\Libraries\LoyaltyService;
use App\Models\LoyaltyCardModel;
use CodeIgniter\Test\CIUnitTestCase;

/**
 * LoyaltyService::isUsable() (delegated to by LoyaltyCardModel) is
 * pure — it only inspects the card object it's handed, no DB lookup —
 * so it's exercised directly here with constructed card rows rather
 * than through the /loyalty/scan endpoint.
 *
 * @internal
 */
final class LoyaltyValidationTest extends CIUnitTestCase
{
    private LoyaltyService $loyalty;

    protected function setUp(): void
    {
        parent::setUp();
        $this->loyalty = new LoyaltyService();
    }

    private function card(string $status, ?string $expiresAt = null): object
    {
        return (object) ['status' => $status, 'expires_at' => $expiresAt];
    }

    public function testActiveCardWithNoExpiryIsUsable(): void
    {
        $this->assertTrue($this->loyalty->isUsable($this->card(LoyaltyCardModel::STATUS_ACTIVE)));
    }

    public function testActiveCardWithFutureExpiryIsUsable(): void
    {
        $futureDate = date('Y-m-d', strtotime('+1 year'));
        $this->assertTrue($this->loyalty->isUsable($this->card(LoyaltyCardModel::STATUS_ACTIVE, $futureDate)));
    }

    public function testActiveCardExpiringTodayIsStillUsable(): void
    {
        // expires_at is inclusive — "today" hasn't passed yet.
        $today = date('Y-m-d 23:59:59');
        $this->assertTrue($this->loyalty->isUsable($this->card(LoyaltyCardModel::STATUS_ACTIVE, $today)));
    }

    public function testActiveCardPastExpiryIsNotUsable(): void
    {
        $pastDate = date('Y-m-d', strtotime('-1 day'));
        $this->assertFalse($this->loyalty->isUsable($this->card(LoyaltyCardModel::STATUS_ACTIVE, $pastDate)));
    }

    public function testInactiveCardIsNotUsable(): void
    {
        $this->assertFalse($this->loyalty->isUsable($this->card(LoyaltyCardModel::STATUS_INACTIVE)));
    }

    public function testBlockedCardIsNotUsable(): void
    {
        $this->assertFalse($this->loyalty->isUsable($this->card(LoyaltyCardModel::STATUS_BLOCKED)));
    }

    public function testLostCardIsNotUsable(): void
    {
        $this->assertFalse($this->loyalty->isUsable($this->card(LoyaltyCardModel::STATUS_LOST)));
    }

    public function testBlockedCardIsNotUsableEvenWithFutureExpiry(): void
    {
        // Status is checked first — an unexpired card is still refused if blocked.
        $futureDate = date('Y-m-d', strtotime('+1 year'));
        $this->assertFalse($this->loyalty->isUsable($this->card(LoyaltyCardModel::STATUS_BLOCKED, $futureDate)));
    }
}
