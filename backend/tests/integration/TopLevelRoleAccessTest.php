<?php

use App\Libraries\JwtService;
use App\Models\CompanyModel;
use App\Models\RoleModel;
use App\Models\UserModel;
use CodeIgniter\Test\CIUnitTestCase;
use CodeIgniter\Test\DatabaseTestTrait;
use CodeIgniter\Test\FeatureTestTrait;

/**
 * UsersController::TOP_LEVEL_ROLE_NAMES treats Super Admin and Dev Admin
 * as equivalent everywhere the controller used to check for "is the
 * caller Super Admin" by literal role name — otherwise granting someone
 * Dev Admin (a Custom role built with Super Admin's exact permission set,
 * for dev/test administration the System Super Admin role can't be
 * edited or deleted to support) wouldn't actually have granted equivalent
 * access: they couldn't see other top-level accounts, and couldn't hand
 * out either restricted role themselves.
 *
 * @internal
 */
final class TopLevelRoleAccessTest extends CIUnitTestCase
{
    use DatabaseTestTrait;
    use FeatureTestTrait;

    protected $migrate = false;
    protected $refresh = false;
    protected $seed = '';

    private int $companyId;
    private int $superAdminRoleId;
    private int $devAdminRoleId;
    private int $storeAdminRoleId;
    private int $superAdminUserId;
    private int $devAdminUserId;
    private int $storeAdminUserId;

    protected function setUp(): void
    {
        parent::setUp();

        $suffix = bin2hex(random_bytes(4));
        $this->companyId = (int) model(CompanyModel::class)->insert(['trade_name' => "Top Level Role Test Co {$suffix}"], true);
        $this->superAdminRoleId = (int) model(RoleModel::class)->insert(['company_id' => $this->companyId, 'name' => 'Super Admin', 'is_system' => 1], true);
        $this->devAdminRoleId = (int) model(RoleModel::class)->insert(['company_id' => $this->companyId, 'name' => 'Dev Admin', 'is_system' => 0], true);
        $this->storeAdminRoleId = (int) model(RoleModel::class)->insert(['company_id' => $this->companyId, 'name' => 'Store Admin', 'is_system' => 0], true);

        $this->superAdminUserId = $this->makeUser($suffix, 'super', $this->superAdminRoleId);
        $this->devAdminUserId = $this->makeUser($suffix, 'devadmin', $this->devAdminRoleId);
        $this->storeAdminUserId = $this->makeUser($suffix, 'storeadmin', $this->storeAdminRoleId);
    }

    protected function tearDown(): void
    {
        $db = \Config\Database::connect();
        $db->table('audit_logs')->where('company_id', $this->companyId)->delete();
        $db->table('users')->where('company_id', $this->companyId)->delete();
        $db->table('roles')->where('company_id', $this->companyId)->delete();
        $db->table('companies')->where('id', $this->companyId)->delete();

        parent::tearDown();
    }

    private function makeUser(string $suffix, string $tag, int $roleId): int
    {
        return (int) model(UserModel::class)->insert([
            'company_id' => $this->companyId,
            'role_id' => $roleId,
            'name' => "TLR {$tag}",
            'email' => "tlr-{$tag}-{$suffix}@example.com",
            'username' => "tlr_{$tag}_{$suffix}",
            'password' => 'Password123!',
            'is_active' => 1,
        ], true);
    }

    private function tokenFor(int $userId, int $roleId, ?array $permissions = null): string
    {
        return (new JwtService())->issueAccessToken($userId, $this->companyId, $roleId, $permissions ?? ['users.view', 'users.create', 'users.update']);
    }

    private function auth(string $token)
    {
        return $this->withHeaders(['Authorization' => 'Bearer ' . $token])->withBodyFormat('json');
    }

    public function testADevAdminCallerCanAssignTheSuperAdminRole(): void
    {
        $suffix = bin2hex(random_bytes(4));
        $response = $this->auth($this->tokenFor($this->devAdminUserId, $this->devAdminRoleId))->post('/api/v1/users', [
            'name' => 'New Super Admin',
            'email' => "tlr-newsuper-{$suffix}@example.com",
            'username' => "tlr_newsuper_{$suffix}",
            'password' => 'Password123!',
            'role_id' => $this->superAdminRoleId,
        ]);

        $response->assertStatus(201);
    }

    public function testAnOrdinaryCallerCannotAssignTheSuperAdminRole(): void
    {
        $suffix = bin2hex(random_bytes(4));
        $response = $this->auth($this->tokenFor($this->storeAdminUserId, $this->storeAdminRoleId))->post('/api/v1/users', [
            'name' => 'Sneaky Super Admin',
            'email' => "tlr-sneaky1-{$suffix}@example.com",
            'username' => "tlr_sneaky1_{$suffix}",
            'password' => 'Password123!',
            'role_id' => $this->superAdminRoleId,
        ]);

        $response->assertStatus(403);
    }

    public function testAnOrdinaryCallerCannotAssignTheDevAdminRoleEither(): void
    {
        $suffix = bin2hex(random_bytes(4));
        $response = $this->auth($this->tokenFor($this->storeAdminUserId, $this->storeAdminRoleId))->post('/api/v1/users', [
            'name' => 'Sneaky Dev Admin',
            'email' => "tlr-sneaky2-{$suffix}@example.com",
            'username' => "tlr_sneaky2_{$suffix}",
            'password' => 'Password123!',
            'role_id' => $this->devAdminRoleId,
        ]);

        $response->assertStatus(403);
    }

    public function testAnOrdinaryCallerDoesNotSeeSuperAdminOrDevAdminAccountsInTheList(): void
    {
        $response = $this->auth($this->tokenFor($this->storeAdminUserId, $this->storeAdminRoleId))->get('/api/v1/users');

        $response->assertStatus(200);
        $ids = array_column(json_decode($response->getJSON(), true)['data'], 'id');
        $this->assertNotContains($this->superAdminUserId, $ids);
        $this->assertNotContains($this->devAdminUserId, $ids);
        $this->assertContains($this->storeAdminUserId, $ids);
    }

    public function testADevAdminCallerDoesSeeSuperAdminAccountsInTheList(): void
    {
        $response = $this->auth($this->tokenFor($this->devAdminUserId, $this->devAdminRoleId))->get('/api/v1/users');

        $response->assertStatus(200);
        $ids = array_column(json_decode($response->getJSON(), true)['data'], 'id');
        $this->assertContains($this->superAdminUserId, $ids);
        $this->assertContains($this->devAdminUserId, $ids);
    }

    public function testADevAdminCallerCanToggleLoyaltyEnabled(): void
    {
        $response = $this->auth($this->tokenFor($this->devAdminUserId, $this->devAdminRoleId, ['companies.manage']))
            ->put("/api/v1/companies/{$this->companyId}", ['loyalty_enabled' => 0]);

        $response->assertStatus(200);
        $this->assertSame(0, (int) json_decode($response->getJSON(), true)['data']['loyalty_enabled']);
    }

    public function testAnOrdinaryCallerWithCompaniesManageCannotToggleLoyaltyEnabled(): void
    {
        $response = $this->auth($this->tokenFor($this->storeAdminUserId, $this->storeAdminRoleId, ['companies.manage']))
            ->put("/api/v1/companies/{$this->companyId}", ['loyalty_enabled' => 0]);

        $response->assertStatus(403);
    }

    public function testASuperAdminCallerAlsoCannotToggleLoyaltyEnabled(): void
    {
        // Dev Admin only, deliberately — being top-level (able to see/
        // assign Dev Admin itself) doesn't extend to this specific switch.
        $response = $this->auth($this->tokenFor($this->superAdminUserId, $this->superAdminRoleId, ['companies.manage']))
            ->put("/api/v1/companies/{$this->companyId}", ['loyalty_enabled' => 0]);

        $response->assertStatus(403);
    }

    public function testAnOrdinaryCallerCanStillUpdateOtherCompanyFieldsInTheSameRequest(): void
    {
        // The loyalty_enabled gate must not block an otherwise-ordinary
        // update just because companies.manage is present — only a request
        // that actually touches loyalty_enabled is restricted.
        $response = $this->auth($this->tokenFor($this->storeAdminUserId, $this->storeAdminRoleId, ['companies.manage']))
            ->put("/api/v1/companies/{$this->companyId}", ['legal_name' => 'Renamed Co']);

        $response->assertStatus(200);
    }

    public function testAnOrdinaryCallerDoesNotSeeDevAdminInTheRolesList(): void
    {
        $response = $this->auth($this->tokenFor($this->storeAdminUserId, $this->storeAdminRoleId, ['roles.view']))
            ->get('/api/v1/roles');

        $response->assertStatus(200);
        $names = array_column(json_decode($response->getJSON(), true)['data'], 'name');
        $this->assertNotContains('Dev Admin', $names);
        $this->assertContains('Super Admin', $names);
    }

    public function testADevAdminCallerDoesSeeDevAdminInTheRolesList(): void
    {
        $response = $this->auth($this->tokenFor($this->devAdminUserId, $this->devAdminRoleId, ['roles.view']))
            ->get('/api/v1/roles');

        $response->assertStatus(200);
        $names = array_column(json_decode($response->getJSON(), true)['data'], 'name');
        $this->assertContains('Dev Admin', $names);
    }

    public function testAnOrdinaryCallerCannotFetchTheDevAdminRoleDirectlyById(): void
    {
        $response = $this->auth($this->tokenFor($this->storeAdminUserId, $this->storeAdminRoleId, ['roles.view']))
            ->get("/api/v1/roles/{$this->devAdminRoleId}");

        $response->assertStatus(404);
    }

    public function testASystemRoleCannotBeDeletedEvenViaADirectApiCall(): void
    {
        // The frontend already hides Delete for is_system rows, but
        // nothing previously stopped a direct DELETE call from removing
        // Super Admin outright — a real gap, not just a UI nicety.
        $response = $this->auth($this->tokenFor($this->superAdminUserId, $this->superAdminRoleId, ['roles.manage']))
            ->delete("/api/v1/roles/{$this->superAdminRoleId}");

        $response->assertStatus(422);
        $this->assertNotNull(model(RoleModel::class)->find($this->superAdminRoleId));
    }

    public function testDevAdminCannotBeDeletedEvenByADevAdminCaller(): void
    {
        // Unconditional — Dev Admin is this system's one guaranteed
        // dev/test way in, so not even a Dev Admin caller can remove it
        // through the API, despite it being a Custom (editable) role.
        $response = $this->auth($this->tokenFor($this->devAdminUserId, $this->devAdminRoleId, ['roles.manage']))
            ->delete("/api/v1/roles/{$this->devAdminRoleId}");

        $response->assertStatus(422);
        $this->assertNotNull(model(RoleModel::class)->find($this->devAdminRoleId));
    }

    public function testAnOrdinaryCustomRoleCanStillBeDeletedNormally(): void
    {
        // Sanity check the two carve-outs above didn't over-block deletion
        // in general — an ordinary Custom role is unaffected.
        $response = $this->auth($this->tokenFor($this->devAdminUserId, $this->devAdminRoleId, ['roles.manage']))
            ->delete("/api/v1/roles/{$this->storeAdminRoleId}");

        $response->assertStatus(200);
        $this->assertNull(model(RoleModel::class)->find($this->storeAdminRoleId));
    }

    public function testADevAdminCallerCanUpdateTransactionNumberingSettings(): void
    {
        $response = $this->auth($this->tokenFor($this->devAdminUserId, $this->devAdminRoleId, ['companies.manage']))
            ->put("/api/v1/companies/{$this->companyId}", ['transaction_no_prefix' => 'TX-']);

        $response->assertStatus(200);
        $this->assertSame('TX-', json_decode($response->getJSON(), true)['data']['transaction_no_prefix']);
    }

    public function testAnOrdinaryCallerWithCompaniesManageCannotUpdateTransactionNumberingSettings(): void
    {
        $response = $this->auth($this->tokenFor($this->storeAdminUserId, $this->storeAdminRoleId, ['companies.manage']))
            ->put("/api/v1/companies/{$this->companyId}", ['transaction_no_reset_rule' => 'per_register']);

        $response->assertStatus(403);
    }
}
