<?php

use App\Libraries\JwtService;
use App\Models\CompanyModel;
use App\Models\RegisterModel;
use App\Models\RoleModel;
use App\Models\StoreModel;
use App\Models\UserModel;
use App\Models\UserStoreModel;
use CodeIgniter\Test\CIUnitTestCase;
use CodeIgniter\Test\DatabaseTestTrait;
use CodeIgniter\Test\FeatureTestTrait;

/**
 * Step 42 — store reach per role, exercised through the real HTTP routes
 * (JwtAuthFilter + PermissionFilter + StoresController/RegistersController
 * all run for real).
 *
 * Store reach in this schema comes down to one mechanism regardless of
 * role name: AuthContext::$allowedStoreIds, populated from user_stores
 * at login (see JwtAuthFilter). A user with no rows there is
 * unrestricted within their own company; a user with rows there is
 * locked to exactly those stores. Super Admin and Company Admin differ
 * from Store Manager/Cashier/Bagger only in whether anyone ever assigns
 * them to specific stores — this suite sets each role up the way a real
 * company would (admins left unassigned; Manager/Cashier/Bagger given
 * explicit assignments) and asserts the resulting reach.
 *
 * @internal
 */
final class MultiStoreAccessTest extends CIUnitTestCase
{
    use DatabaseTestTrait;
    use FeatureTestTrait;

    protected $migrate = false;
    protected $refresh = false;
    protected $seed = '';

    private int $companyId;
    private int $storeAId;
    private int $storeBId;
    private int $storeCId;
    private int $registerCId;

    private string $superAdminToken;
    private string $companyAdminToken;
    private string $managerToken;
    private string $cashierToken;
    private string $baggerToken;

    protected function setUp(): void
    {
        parent::setUp();

        $suffix = bin2hex(random_bytes(4));
        $this->companyId = (int) model(CompanyModel::class)->insert(['trade_name' => "MultiStore Co {$suffix}"], true);

        $this->storeAId = (int) model(StoreModel::class)->insert(['company_id' => $this->companyId, 'name' => 'Store A', 'code' => 'A'], true);
        $this->storeBId = (int) model(StoreModel::class)->insert(['company_id' => $this->companyId, 'name' => 'Store B', 'code' => 'B'], true);
        $this->storeCId = (int) model(StoreModel::class)->insert(['company_id' => $this->companyId, 'name' => 'Store C', 'code' => 'C'], true);

        $this->registerCId = (int) model(RegisterModel::class)->insert([
            'store_id' => $this->storeCId, 'name' => 'Register C1', 'code' => 'C1',
        ], true);

        $superAdminRole = $this->makeRole('Super Admin');
        $companyAdminRole = $this->makeRole('Company Admin');
        $managerRole = $this->makeRole('Store Manager');
        $cashierRole = $this->makeRole('Cashier');
        $baggerRole = $this->makeRole('Bagger');

        $superAdminId = $this->makeUser($superAdminRole, 'superadmin');
        $companyAdminId = $this->makeUser($companyAdminRole, 'companyadmin');
        $managerId = $this->makeUser($managerRole, 'manager');
        $cashierId = $this->makeUser($cashierRole, 'cashier');
        $baggerId = $this->makeUser($baggerRole, 'bagger');

        // Super Admin / Company Admin: never assigned to specific stores —
        // unrestricted within the company, exactly as an owner/admin
        // account would be left in a real deployment.
        // Manager: assigned to two of the three stores.
        model(UserStoreModel::class)->syncForUser($managerId, [$this->storeAId, $this->storeBId]);
        // Cashier / Bagger: assigned to a single store each.
        model(UserStoreModel::class)->syncForUser($cashierId, [$this->storeAId]);
        model(UserStoreModel::class)->syncForUser($baggerId, [$this->storeAId]);

        $permissions = ['stores.view', 'registers.view'];
        $jwt = new JwtService();
        $this->superAdminToken = $jwt->issueAccessToken($superAdminId, $this->companyId, $superAdminRole, $permissions);
        $this->companyAdminToken = $jwt->issueAccessToken($companyAdminId, $this->companyId, $companyAdminRole, $permissions);
        $this->managerToken = $jwt->issueAccessToken($managerId, $this->companyId, $managerRole, $permissions);
        $this->cashierToken = $jwt->issueAccessToken($cashierId, $this->companyId, $cashierRole, $permissions);
        $this->baggerToken = $jwt->issueAccessToken($baggerId, $this->companyId, $baggerRole, $permissions);
    }

    private function makeRole(string $name): int
    {
        return (int) model(RoleModel::class)->insert(['company_id' => $this->companyId, 'name' => $name], true);
    }

    private function makeUser(int $roleId, string $label): int
    {
        $suffix = bin2hex(random_bytes(4));

        return (int) model(UserModel::class)->insert([
            'company_id' => $this->companyId,
            'role_id' => $roleId,
            'name' => ucfirst($label),
            'email' => "{$label}-{$suffix}@example.com",
            'username' => "{$label}_{$suffix}",
            'password' => 'Password123!',
            'is_active' => 1,
        ], true);
    }

    protected function tearDown(): void
    {
        $db = \Config\Database::connect();
        $db->table('registers')->where('store_id', $this->storeAId)
            ->orWhere('store_id', $this->storeBId)
            ->orWhere('store_id', $this->storeCId)
            ->delete();
        $db->table('user_stores')->whereIn('user_id', model(UserModel::class)->where('company_id', $this->companyId)->findColumn('id') ?: [0])->delete();
        $db->table('users')->where('company_id', $this->companyId)->delete();
        $db->table('roles')->where('company_id', $this->companyId)->delete();
        $db->table('stores')->where('company_id', $this->companyId)->delete();
        $db->table('companies')->where('id', $this->companyId)->delete();

        parent::tearDown();
    }

    private function storeNames(string $token): array
    {
        $response = $this->withHeaders(['Authorization' => "Bearer {$token}"])->get('/api/v1/stores?per_page=50');
        $response->assertStatus(200);
        $body = json_decode($response->getJSON(), true);

        return array_map(static fn ($row) => $row['name'], $body['data']);
    }

    public function testSuperAdminSeesAllCompanyStores(): void
    {
        $this->assertEqualsCanonicalizing(['Store A', 'Store B', 'Store C'], $this->storeNames($this->superAdminToken));
    }

    public function testCompanyAdminSeesAllCompanyStores(): void
    {
        $this->assertEqualsCanonicalizing(['Store A', 'Store B', 'Store C'], $this->storeNames($this->companyAdminToken));
    }

    public function testManagerSeesOnlyAssignedStores(): void
    {
        $this->assertEqualsCanonicalizing(['Store A', 'Store B'], $this->storeNames($this->managerToken));
    }

    public function testCashierSeesOnlyAssignedStore(): void
    {
        $this->assertSame(['Store A'], $this->storeNames($this->cashierToken));
    }

    public function testBaggerSeesOnlyAssignedStore(): void
    {
        $this->assertSame(['Store A'], $this->storeNames($this->baggerToken));
    }

    public function testCashierCannotReachRegisterAtUnassignedStore(): void
    {
        $response = $this->withHeaders(['Authorization' => "Bearer {$this->cashierToken}"])
            ->get("/api/v1/registers/{$this->registerCId}");

        $response->assertStatus(404);
    }

    public function testBaggerCannotReachStoreCDirectly(): void
    {
        $response = $this->withHeaders(['Authorization' => "Bearer {$this->baggerToken}"])
            ->get("/api/v1/stores/{$this->storeCId}");

        $response->assertStatus(404);
    }

    public function testManagerCannotReachRegisterAtUnassignedStoreC(): void
    {
        // Manager is assigned to A and B, but not C.
        $response = $this->withHeaders(['Authorization' => "Bearer {$this->managerToken}"])
            ->get("/api/v1/registers/{$this->registerCId}");

        $response->assertStatus(404);
    }

    public function testSuperAdminCanReachAnyStoreDirectly(): void
    {
        $response = $this->withHeaders(['Authorization' => "Bearer {$this->superAdminToken}"])
            ->get("/api/v1/registers/{$this->registerCId}");

        $response->assertStatus(200);
    }
}
