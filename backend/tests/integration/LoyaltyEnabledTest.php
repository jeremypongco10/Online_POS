<?php

use App\Libraries\JwtService;
use App\Models\CompanyModel;
use App\Models\CustomerModel;
use App\Models\LoyaltyCardModel;
use App\Models\LoyaltyPointTransactionModel;
use App\Models\RoleModel;
use App\Models\UserModel;
use CodeIgniter\Test\CIUnitTestCase;
use CodeIgniter\Test\DatabaseTestTrait;
use CodeIgniter\Test\FeatureTestTrait;

/**
 * companies.loyalty_enabled — the master switch for the whole Customer
 * Loyalty feature (see AddLoyaltyEnabledToCompanies). Checkout's own
 * gating on it is covered in SaleCheckoutFlowTest, alongside the rest of
 * that pipeline; this file covers the other two places it has to be
 * enforced: the auth payload (so the frontend knows to hide loyalty UI
 * without a second request) and CustomersController::attachPoints (so a
 * caller with loyalty.view still gets no points/card data back once the
 * company has switched the feature off).
 *
 * @internal
 */
final class LoyaltyEnabledTest extends CIUnitTestCase
{
    use DatabaseTestTrait;
    use FeatureTestTrait;

    protected $migrate = false;
    protected $refresh = false;
    protected $seed = '';

    private int $companyId;
    private int $roleId;
    private int $callerId;

    protected function setUp(): void
    {
        parent::setUp();

        $suffix = bin2hex(random_bytes(4));
        $this->companyId = (int) model(CompanyModel::class)->insert(['trade_name' => "Loyalty Enabled Test Co {$suffix}"], true);
        $this->roleId = (int) model(RoleModel::class)->insert(['company_id' => $this->companyId, 'name' => 'Test Admin', 'is_system' => 0], true);
        $this->callerId = (int) model(UserModel::class)->insert([
            'company_id' => $this->companyId,
            'role_id' => $this->roleId,
            'name' => 'Caller',
            'email' => "let-caller-{$suffix}@example.com",
            'username' => "let_caller_{$suffix}",
            'password' => 'Password123!',
            'is_active' => 1,
        ], true);
    }

    protected function tearDown(): void
    {
        $db = \Config\Database::connect();
        $customerIds = $db->table('customers')->select('id')->where('company_id', $this->companyId)->get()->getResultArray();
        // loyalty_cards' ON DELETE CASCADE back to customers is correct on
        // the live MySQL schema (confirmed directly against information_
        // schema) but got lost in the SQLite test DB's own copy somewhere
        // along an earlier migration's rebuild-aside dance — a known class
        // of SQLite-only gap this codebase already routes around elsewhere
        // (see UserDeleteTest's own explicit ordering), not a real
        // production issue. Deleted explicitly, children first.
        if ($customerIds !== []) {
            $ids = array_column($customerIds, 'id');
            $db->table('loyalty_point_transactions')->whereIn('customer_id', $ids)->delete();
            $db->table('loyalty_cards')->whereIn('customer_id', $ids)->delete();
        }
        $db->table('customers')->where('company_id', $this->companyId)->delete();
        $db->table('users')->where('company_id', $this->companyId)->delete();
        $db->table('roles')->where('company_id', $this->companyId)->delete();
        $db->table('companies')->where('id', $this->companyId)->delete();

        parent::tearDown();
    }

    private function token(array $permissions): string
    {
        return (new JwtService())->issueAccessToken($this->callerId, $this->companyId, $this->roleId, $permissions);
    }

    private function makeCustomerWithCard(): int
    {
        $customerId = (int) model(CustomerModel::class)->insert([
            'company_id' => $this->companyId,
            'first_name' => 'Card',
            'last_name' => 'Holder',
            'is_active' => 1,
        ], true);
        $card = model(LoyaltyCardModel::class)->firstOrCreateForCustomer($customerId);
        model(LoyaltyPointTransactionModel::class)->record($customerId, (int) $card->id, 50, 'test seed', null);

        return $customerId;
    }

    public function testLoginExposesLoyaltyEnabledAsTrueByDefault(): void
    {
        $response = $this->withBodyFormat('json')->post('/api/v1/auth/login', [
            'identifier' => model(UserModel::class)->find($this->callerId)->username,
            'password' => 'Password123!',
        ]);

        $response->assertStatus(200);
        $body = json_decode($response->getJSON(), true);
        $this->assertTrue($body['data']['user']['loyalty_enabled']);
    }

    public function testLoginExposesLoyaltyEnabledAsFalseOnceDisabled(): void
    {
        model(CompanyModel::class)->update($this->companyId, ['loyalty_enabled' => 0]);

        $response = $this->withBodyFormat('json')->post('/api/v1/auth/login', [
            'identifier' => model(UserModel::class)->find($this->callerId)->username,
            'password' => 'Password123!',
        ]);

        $response->assertStatus(200);
        $body = json_decode($response->getJSON(), true);
        $this->assertFalse($body['data']['user']['loyalty_enabled']);
    }

    public function testCustomerPointsAreVisibleToALoyaltyViewerWhenEnabled(): void
    {
        model(CompanyModel::class)->update($this->companyId, ['loyalty_enabled' => 1]);
        $customerId = $this->makeCustomerWithCard();

        $response = $this->withHeaders(['Authorization' => 'Bearer ' . $this->token(['customers.view', 'loyalty.view'])])
            ->get("/api/v1/customers/{$customerId}");

        $response->assertStatus(200);
        $body = json_decode($response->getJSON(), true);
        $this->assertSame(50, $body['data']['points']);
        $this->assertNotNull($body['data']['card_number']);
    }

    public function testCustomerPointsAreHiddenFromALoyaltyViewerOnceDisabledCompanyWide(): void
    {
        model(CompanyModel::class)->update($this->companyId, ['loyalty_enabled' => 0]);
        $customerId = $this->makeCustomerWithCard();

        $response = $this->withHeaders(['Authorization' => 'Bearer ' . $this->token(['customers.view', 'loyalty.view'])])
            ->get("/api/v1/customers/{$customerId}");

        $response->assertStatus(200);
        $body = json_decode($response->getJSON(), true);
        $this->assertArrayNotHasKey('points', $body['data']);
        $this->assertArrayNotHasKey('card_number', $body['data']);
    }
}
