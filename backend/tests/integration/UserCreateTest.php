<?php

use App\Libraries\JwtService;
use App\Models\CompanyModel;
use App\Models\RoleModel;
use App\Models\StoreModel;
use App\Models\UserModel;
use CodeIgniter\Test\CIUnitTestCase;
use CodeIgniter\Test\DatabaseTestTrait;
use CodeIgniter\Test\FeatureTestTrait;

/**
 * POST /api/v1/users — role_id is now mandatory on every create (unlike
 * update, where clearing it is a valid way to suspend access without
 * deactivating), and password is mandatory on every role except Bagger,
 * which never signs itself in (it's only ever picked from a list by an
 * already-logged-in cashier — see BaggerPanel and UsersController::
 * create()'s roleIsBagger() check).
 *
 * @internal
 */
final class UserCreateTest extends CIUnitTestCase
{
    use DatabaseTestTrait;
    use FeatureTestTrait;

    protected $migrate = false;
    protected $refresh = false;
    protected $seed = '';

    private int $companyId;
    private int $storeId;
    private int $cashierRoleId;
    private int $baggerRoleId;
    private string $callerToken;

    protected function setUp(): void
    {
        parent::setUp();

        $suffix = bin2hex(random_bytes(4));
        $this->companyId = (int) model(CompanyModel::class)->insert(['trade_name' => "User Create Test Co {$suffix}"], true);
        $this->storeId = (int) model(StoreModel::class)->insert(['company_id' => $this->companyId, 'name' => 'UCT Store', 'code' => "UCT-{$suffix}"], true);
        $this->cashierRoleId = (int) model(RoleModel::class)->insert(['company_id' => $this->companyId, 'name' => 'Cashier', 'is_system' => 0], true);
        $this->baggerRoleId = (int) model(RoleModel::class)->insert(['company_id' => $this->companyId, 'name' => 'Bagger', 'is_system' => 0], true);

        $callerRoleId = (int) model(RoleModel::class)->insert(['company_id' => $this->companyId, 'name' => 'Test Admin', 'is_system' => 0], true);
        // email is spelled out explicitly here (rather than relying on the
        // now-nullable column) because that nullability only applies to
        // MySQL — see MakeUsersEmailNullable — and the SQLite test DB
        // still has it NOT NULL, same accepted limitation as every other
        // MySQL-only ALTER in this codebase (e.g. FixUsersForeignKeyDeleteRules).
        $callerId = (int) model(UserModel::class)->insert([
            'company_id' => $this->companyId,
            'role_id' => $callerRoleId,
            'name' => 'Caller',
            'email' => "uct-caller-{$suffix}@example.com",
            'username' => "uct_caller_{$suffix}",
            'password' => 'Password123!',
            'is_active' => 1,
        ], true);
        $this->callerToken = (new JwtService())->issueAccessToken($callerId, $this->companyId, $callerRoleId, ['users.view', 'users.create']);
    }

    protected function tearDown(): void
    {
        $db = \Config\Database::connect();
        $db->table('user_stores')->where('store_id', $this->storeId)->delete();
        $db->table('audit_logs')->where('company_id', $this->companyId)->delete();
        $db->table('users')->where('company_id', $this->companyId)->delete();
        $db->table('roles')->where('company_id', $this->companyId)->delete();
        $db->table('stores')->where('company_id', $this->companyId)->delete();
        $db->table('companies')->where('id', $this->companyId)->delete();

        parent::tearDown();
    }

    private function auth(string $token)
    {
        return $this->withHeaders(['Authorization' => 'Bearer ' . $token])->withBodyFormat('json');
    }

    public function testCreatingWithoutARoleIsRejected(): void
    {
        $suffix = bin2hex(random_bytes(4));
        $response = $this->auth($this->callerToken)->post('/api/v1/users', [
            'name' => 'No Role',
            'email' => "uct-norole-{$suffix}@example.com",
            'username' => "uct_norole_{$suffix}",
            'password' => 'Password123!',
        ]);

        $response->assertStatus(422);
        $body = json_decode($response->getJSON(), true);
        $this->assertArrayHasKey('role_id', $body['errors']);
    }

    public function testCreatingACashierWithoutAPasswordIsRejected(): void
    {
        $suffix = bin2hex(random_bytes(4));
        $response = $this->auth($this->callerToken)->post('/api/v1/users', [
            'name' => 'Cashier No Pass',
            'email' => "uct-cashier-nopass-{$suffix}@example.com",
            'username' => "uct_cashier_nopass_{$suffix}",
            'role_id' => $this->cashierRoleId,
            'store_id' => $this->storeId,
        ]);

        $response->assertStatus(422);
        $body = json_decode($response->getJSON(), true);
        $this->assertArrayHasKey('password', $body['errors']);
    }

    public function testCreatingABaggerWithoutAPasswordSucceedsAndLeavesPasswordHashNull(): void
    {
        // password_hash is only nullable on MySQL (see
        // MakeUsersPasswordHashNullable's own docblock — modifyColumn()
        // rebuilding the table on SQLite risks the same FK-corruption
        // issue EnforceCustomerNameFieldsNotNull already avoids), so an
        // actual insert with no password can only be exercised here
        // against a MySQL test run.
        if (\Config\Database::connect()->DBDriver !== 'MySQLi') {
            $this->markTestSkipped('password_hash is NOT NULL on the SQLite test DB — MySQL only.');
        }

        $suffix = bin2hex(random_bytes(4));
        $response = $this->auth($this->callerToken)->post('/api/v1/users', [
            'name' => 'Bagger No Pass',
            'email' => "uct-bagger-nopass-{$suffix}@example.com",
            'username' => "uct_bagger_nopass_{$suffix}",
            'role_id' => $this->baggerRoleId,
            'store_id' => $this->storeId,
        ]);

        $response->assertStatus(201);
        $body = json_decode($response->getJSON(), true);
        $newId = $body['data']['id'];

        $raw = \Config\Database::connect()->table('users')->select('password_hash')->where('id', $newId)->get()->getFirstRow();
        $this->assertNull($raw->password_hash, 'A passwordless Bagger must store an explicit NULL, not an empty-string hash.');
    }

    public function testABaggerWithNoPasswordCannotLogIn(): void
    {
        // Same SQLite limitation as the test above — creating the
        // passwordless fixture this test needs requires MySQL.
        if (\Config\Database::connect()->DBDriver !== 'MySQLi') {
            $this->markTestSkipped('password_hash is NOT NULL on the SQLite test DB — MySQL only.');
        }

        $suffix = bin2hex(random_bytes(4));
        $username = "uct_bagger_login_{$suffix}";
        $this->auth($this->callerToken)->post('/api/v1/users', [
            'name' => 'Bagger Login Attempt',
            'email' => "uct-bagger-login-{$suffix}@example.com",
            'username' => $username,
            'role_id' => $this->baggerRoleId,
            'store_id' => $this->storeId,
        ])->assertStatus(201);

        // Must fail cleanly (401), not error out on password_verify()
        // receiving a null hash.
        $response = $this->withBodyFormat('json')->post('/api/v1/auth/login', ['identifier' => $username, 'password' => 'anything-at-all']);
        $response->assertStatus(401);
    }

    public function testABaggerCanStillBeGivenAPasswordIfAnAdminSetsOne(): void
    {
        $suffix = bin2hex(random_bytes(4));
        $response = $this->auth($this->callerToken)->post('/api/v1/users', [
            'name' => 'Bagger With Pass',
            'email' => "uct-bagger-pass-{$suffix}@example.com",
            'username' => "uct_bagger_pass_{$suffix}",
            'role_id' => $this->baggerRoleId,
            'store_id' => $this->storeId,
            'password' => 'Password123!',
        ]);

        $response->assertStatus(201);
        $newId = json_decode($response->getJSON(), true)['data']['id'];

        $raw = \Config\Database::connect()->table('users')->select('password_hash')->where('id', $newId)->get()->getFirstRow();
        $this->assertNotNull($raw->password_hash);
    }

    public function testABaggersOptionalPasswordStillHasToMeetTheMinimumLength(): void
    {
        $suffix = bin2hex(random_bytes(4));
        $response = $this->auth($this->callerToken)->post('/api/v1/users', [
            'name' => 'Bagger Short Pass',
            'email' => "uct-bagger-shortpass-{$suffix}@example.com",
            'username' => "uct_bagger_shortpass_{$suffix}",
            'role_id' => $this->baggerRoleId,
            'store_id' => $this->storeId,
            'password' => 'short',
        ]);

        $response->assertStatus(422);
        $body = json_decode($response->getJSON(), true);
        $this->assertArrayHasKey('password', $body['errors']);
    }
}
