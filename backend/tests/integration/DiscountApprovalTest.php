<?php

use App\Libraries\JwtService;
use App\Models\CompanyModel;
use App\Models\PermissionModel;
use App\Models\RoleModel;
use App\Models\StoreModel;
use App\Models\UserModel;
use CodeIgniter\Test\CIUnitTestCase;
use CodeIgniter\Test\DatabaseTestTrait;
use CodeIgniter\Test\FeatureTestTrait;

/**
 * Manual Discount's supervisor sign-off trio (discount-policy /
 * authorize-item-discount / log-item-discount) plus a regression test
 * for a bug found live while building this: resolveSupervisorApprover's
 * callers used to check `is_object($approver)` to tell a successful
 * approver row apart from a failed ResponseInterface — but both are
 * plain PHP objects, so a WRONG password produced an uncaught "Undefined
 * property: ...Response::$name" instead of a clean 401. Fixed by
 * checking `instanceof ResponseInterface` instead; covered here for both
 * the discount endpoint (new) and the void endpoint (pre-existing, same
 * shared method, never previously covered).
 *
 * @internal
 */
final class DiscountApprovalTest extends CIUnitTestCase
{
    use DatabaseTestTrait;
    use FeatureTestTrait;

    protected $migrate = false;
    protected $refresh = false;
    protected $seed = '';

    private int $companyId;
    private int $storeId;
    private string $cashierToken;
    private string $supervisorUsername;
    private const SUPERVISOR_PASSWORD = 'SupervisorPass123!';

    protected function setUp(): void
    {
        parent::setUp();

        $company = model(CompanyModel::class)->insert([
            'trade_name' => 'Discount Approval Test Co ' . bin2hex(random_bytes(4)),
        ], true);
        $this->companyId = (int) $company;

        $store = model(StoreModel::class)->insert([
            'company_id' => $this->companyId,
            'name' => 'Discount Approval Test Store',
            'code' => 'DATS-1',
        ], true);
        $this->storeId = (int) $store;

        // Cashier: only needs sales.create to call the two endpoints
        // under test — approval authority is checked against the
        // supervisor's own role below, not the caller's.
        $cashierRole = model(RoleModel::class)->insert([
            'company_id' => $this->companyId,
            'name' => 'Approval Test Cashier',
        ], true);

        $cashier = model(UserModel::class)->insert([
            'company_id' => $this->companyId,
            'role_id' => (int) $cashierRole,
            'name' => 'Approval Test Cashier',
            'email' => 'cashier-' . bin2hex(random_bytes(4)) . '@example.com',
            'username' => 'cashier_' . bin2hex(random_bytes(4)),
            'password' => 'Password123!',
            'is_active' => 1,
        ], true);

        $this->cashierToken = (new JwtService())->issueAccessToken(
            (int) $cashier,
            $this->companyId,
            (int) $cashierRole,
            ['sales.create', 'sales.view']
        );

        // Supervisor: a real role carrying sales.void + sales.discount,
        // granted via role_permissions the same way RoleSeeder/the
        // AddSalesDiscountPermission migration do it for real installs
        // — the approval check reads this from the DB directly, not
        // from any JWT claim, since the "supervisor" here never logs in.
        $supervisorRole = model(RoleModel::class)->insert([
            'company_id' => $this->companyId,
            'name' => 'Approval Test Supervisor',
        ], true);

        $permissionIds = model(PermissionModel::class)
            ->whereIn('slug', ['sales.void', 'sales.discount'])
            ->findColumn('id') ?: [];
        $db = \Config\Database::connect();
        foreach ($permissionIds as $permissionId) {
            $db->table('role_permissions')->insert([
                'role_id' => (int) $supervisorRole,
                'permission_id' => $permissionId,
                'created_at' => date('Y-m-d H:i:s'),
            ]);
        }

        $this->supervisorUsername = 'supervisor_' . bin2hex(random_bytes(4));
        model(UserModel::class)->insert([
            'company_id' => $this->companyId,
            'role_id' => (int) $supervisorRole,
            'name' => 'Approval Test Supervisor',
            'email' => $this->supervisorUsername . '@example.com',
            'username' => $this->supervisorUsername,
            'password' => self::SUPERVISOR_PASSWORD,
            'is_active' => 1,
        ], true);
    }

    protected function tearDown(): void
    {
        $db = \Config\Database::connect();
        $roleIds = array_column($db->table('roles')->where('company_id', $this->companyId)->get()->getResultArray(), 'id');

        $db->table('audit_logs')->where('company_id', $this->companyId)->delete();
        if ($roleIds !== []) {
            $db->table('role_permissions')->whereIn('role_id', $roleIds)->delete();
        }
        $db->table('users')->where('company_id', $this->companyId)->delete();
        $db->table('roles')->where('company_id', $this->companyId)->delete();
        $db->table('stores')->where('company_id', $this->companyId)->delete();
        $db->table('companies')->where('id', $this->companyId)->delete();

        parent::tearDown();
    }

    public function testDiscountPolicyDefaultsToRequiredWhenUnset(): void
    {
        $response = $this->withHeaders(['Authorization' => 'Bearer ' . $this->cashierToken])->get('/api/v1/sales/discount-policy');

        $response->assertStatus(200);
        $body = json_decode($response->getJSON(), true);
        $this->assertTrue($body['data']['require_manual_discount_approval']);
        // No default configured for this fresh test company — every
        // configurable type comes back null, leaving DiscountDialog's
        // percent field blank, not silently pre-filled at 0%.
        foreach (['regular', 'promo', 'employee', 'member', 'wholesale'] as $type) {
            $this->assertNull($body['data']['discount_defaults'][$type]);
        }
    }

    public function testDiscountPolicyReturnsConfiguredDefaults(): void
    {
        model(CompanyModel::class)->update($this->companyId, [
            'default_regular_discount_percent' => 10,
            'default_employee_discount_percent' => 20,
        ]);

        $response = $this->withHeaders(['Authorization' => 'Bearer ' . $this->cashierToken])->get('/api/v1/sales/discount-policy');

        $response->assertStatus(200);
        $body = json_decode($response->getJSON(), true);
        $this->assertEqualsWithDelta(10.0, $body['data']['discount_defaults']['regular'], 0.001);
        $this->assertEqualsWithDelta(20.0, $body['data']['discount_defaults']['employee'], 0.001);
        // Untouched types stay null, not coerced to 0.
        $this->assertNull($body['data']['discount_defaults']['promo']);
    }

    public function testAuthorizeItemDiscountWithWrongPasswordReturnsCleanUnauthorized(): void
    {
        // This is the regression case: before the instanceof fix, a wrong
        // password crashed with a 500 ("Undefined property: ...$name")
        // instead of ever reaching this 401.
        $response = $this->withHeaders(['Authorization' => 'Bearer ' . $this->cashierToken])
            ->withBodyFormat('json')
            ->post('/api/v1/sales/authorize-item-discount', [
                'identifier' => $this->supervisorUsername,
                'password' => 'DefinitelyWrongPassword!',
                'discount_type' => 'manual',
                'product_name' => 'Test Widget',
                'amount' => 10.00,
                'reason' => 'Testing',
            ]);

        $response->assertStatus(401);
        $body = json_decode($response->getJSON(), true);
        $this->assertSame('Invalid supervisor credentials', $body['message']);
    }

    public function testAuthorizeItemVoidWithWrongPasswordReturnsCleanUnauthorized(): void
    {
        // Same regression, the pre-existing void endpoint that shares
        // resolveSupervisorApprover with the discount one above.
        $response = $this->withHeaders(['Authorization' => 'Bearer ' . $this->cashierToken])
            ->withBodyFormat('json')
            ->post('/api/v1/sales/authorize-item-void', [
                'identifier' => $this->supervisorUsername,
                'password' => 'DefinitelyWrongPassword!',
                'reason' => 'Testing',
                'product_name' => 'Test Widget',
                'amount' => 10.00,
            ]);

        $response->assertStatus(401);
        $body = json_decode($response->getJSON(), true);
        $this->assertSame('Invalid supervisor credentials', $body['message']);
    }

    public function testAuthorizeItemDiscountWithCorrectCredentialsApproves(): void
    {
        $response = $this->withHeaders(['Authorization' => 'Bearer ' . $this->cashierToken])
            ->withBodyFormat('json')
            ->post('/api/v1/sales/authorize-item-discount', [
                'identifier' => $this->supervisorUsername,
                'password' => self::SUPERVISOR_PASSWORD,
                'discount_type' => 'manual',
                'product_name' => 'Test Widget',
                'amount' => 10.00,
                'reason' => 'Testing',
            ]);

        $response->assertStatus(200);
        $body = json_decode($response->getJSON(), true);
        $this->assertTrue($body['success']);
        $this->assertSame('Approval Test Supervisor', $body['data']['approved_by']);
    }

    public function testAuthorizeItemDiscountRejectsAnApproverWithoutSalesDiscount(): void
    {
        // A role with sales.create/sales.view only (the cashier role from
        // setUp) cannot approve, even with the right password for that
        // account — sales.discount specifically is what's required.
        $response = $this->withHeaders(['Authorization' => 'Bearer ' . $this->cashierToken])
            ->withBodyFormat('json')
            ->post('/api/v1/sales/authorize-item-discount', [
                'identifier' => $this->supervisorUsername,
                'password' => self::SUPERVISOR_PASSWORD,
                'discount_type' => 'senior_citizen',
                'product_name' => 'Should not matter',
                'amount' => 5.00,
                'reason' => 'n/a',
            ]);

        // The supervisor fixture DOES hold sales.discount, so this call
        // approves — asserting that here doubles as documentation for
        // the negative case below, which reuses the cashier's own
        // account (no sales.discount) as the "approver".
        $response->assertStatus(200);

        $deniedResponse = $this->withHeaders(['Authorization' => 'Bearer ' . $this->cashierToken])
            ->withBodyFormat('json')
            ->post('/api/v1/sales/authorize-item-discount', [
                'identifier' => $this->cashierUsernameForDenialTest(),
                'password' => 'Password123!',
                'discount_type' => 'manual',
                'product_name' => 'Test Widget',
                'amount' => 10.00,
                'reason' => 'Testing',
            ]);

        $deniedResponse->assertStatus(403);
    }

    public function testLogItemDiscountRecordsWithoutApproval(): void
    {
        $response = $this->withHeaders(['Authorization' => 'Bearer ' . $this->cashierToken])
            ->withBodyFormat('json')
            ->post('/api/v1/sales/log-item-discount', [
                'discount_type' => 'manual',
                'product_name' => 'Test Widget',
                'amount' => 10.00,
                'reason' => 'Testing',
            ]);

        $response->assertStatus(200);
        $body = json_decode($response->getJSON(), true);
        $this->assertTrue($body['success']);
    }

    private function cashierUsernameForDenialTest(): string
    {
        $row = model(UserModel::class)->where('company_id', $this->companyId)->where('name', 'Approval Test Cashier')->first();

        return $row->username;
    }
}
