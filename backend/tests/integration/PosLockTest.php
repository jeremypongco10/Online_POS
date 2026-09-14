<?php

use App\Libraries\JwtService;
use App\Models\CompanyModel;
use App\Models\RoleModel;
use App\Models\UserModel;
use CodeIgniter\Test\CIUnitTestCase;
use CodeIgniter\Test\DatabaseTestTrait;
use CodeIgniter\Test\FeatureTestTrait;

/**
 * The POS idle/manual lock screen's unlock endpoint — POST
 * /api/v1/auth/verify-password (see AuthController::verifyPassword).
 *
 * The one thing worth a whole test suite here, not just a happy-path
 * check: this deliberately is NOT a second call to login(), because
 * login() issues fresh tokens and, for a single-session role, stamps
 * session_valid_from to the moment of the call — which would invalidate
 * the very session an unlock is running on. testOriginalTokenStaysValid
 * below is the regression test for exactly that, using a role named
 * 'Cashier' (UserModel::SINGLE_SESSION_ROLES) so the scenario is the
 * tightest one that exists in this schema.
 *
 * @internal
 */
final class PosLockTest extends CIUnitTestCase
{
    use DatabaseTestTrait;
    use FeatureTestTrait;

    protected $migrate = false;
    protected $refresh = false;
    protected $seed = '';

    private const PASSWORD = 'CashierPass123!';

    private int $companyId;
    private int $userId;
    private string $token;

    protected function setUp(): void
    {
        parent::setUp();

        $company = model(CompanyModel::class)->insert([
            'trade_name' => 'POS Lock Test Co ' . bin2hex(random_bytes(4)),
        ], true);
        $this->companyId = (int) $company;

        // Named exactly 'Cashier' — the one role UserModel::isSingleSessionRole
        // recognizes — so the token-survives-unlock test below exercises the
        // tightest case that exists in this schema, not just an unrestricted one.
        $role = model(RoleModel::class)->insert([
            'company_id' => $this->companyId,
            'name' => 'Cashier',
        ], true);

        $this->userId = (int) model(UserModel::class)->insert([
            'company_id' => $this->companyId,
            'role_id' => (int) $role,
            'name' => 'POS Lock Test Cashier',
            'email' => 'poslock-' . bin2hex(random_bytes(4)) . '@example.com',
            'username' => 'poslock_' . bin2hex(random_bytes(4)),
            'password' => self::PASSWORD,
            'is_active' => 1,
        ], true);

        $this->token = (new JwtService())->issueAccessToken($this->userId, $this->companyId, (int) $role, ['sales.create']);
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
        $db->table('companies')->where('id', $this->companyId)->delete();

        parent::tearDown();
    }

    private function verify(string $password)
    {
        return $this->withHeaders(['Authorization' => 'Bearer ' . $this->token])
            ->withBodyFormat('json')
            ->post('/api/v1/auth/verify-password', ['password' => $password]);
    }

    public function testCorrectPasswordUnlocksSuccessfully(): void
    {
        $response = $this->verify(self::PASSWORD);

        $response->assertStatus(200);
        $body = json_decode($response->getJSON(), true);
        $this->assertTrue($body['success']);
    }

    public function testMissingPasswordIsAValidationError(): void
    {
        $response = $this->withHeaders(['Authorization' => 'Bearer ' . $this->token])
            ->withBodyFormat('json')
            ->post('/api/v1/auth/verify-password', []);

        $response->assertStatus(422);
    }

    /**
     * The security property this whole endpoint exists to preserve: a
     * lock screen sitting on a public counter is exactly the surface a
     * brute-force attempt targets, so wrong attempts here have to count
     * toward the same per-account lockout a normal login does — not get
     * unlimited free guesses just because a valid session is already
     * open.
     *
     * Checked with a direct DB read after exactly AuthConfig::$maxLoginAttempts
     * calls, rather than one more HTTP call to confirm a correct password
     * is now rejected too — this whole file already sits close to
     * verify-password's own 10-per-300s rate limit (unlock-auth), and a
     * request that only re-proves what registerFailedLogin's own
     * unit-level behaviour already guarantees isn't worth spending
     * against that budget.
     */
    public function testRepeatedWrongPasswordsLockTheAccount(): void
    {
        $maxAttempts = config(\Config\Auth::class)->maxLoginAttempts;
        for ($i = 0; $i < $maxAttempts; $i++) {
            $this->verify('DefinitelyWrongPassword!')->assertStatus(401);
        }

        $user = model(UserModel::class)->find($this->userId);
        $this->assertNotNull($user->locked_until);
        $this->assertGreaterThan(time(), strtotime($user->locked_until));
    }

    /**
     * The whole reason this isn't just a second call to login(). A
     * single-session role's token would normally be invalidated by
     * anything that stamps session_valid_from — proving the ORIGINAL
     * token, unchanged since setUp(), still authenticates a completely
     * unrelated request right after a successful unlock is the only way
     * to actually prove that stamp never happened.
     */
    public function testOriginalTokenStaysValidAfterSuccessfulUnlock(): void
    {
        $this->verify(self::PASSWORD)->assertStatus(200);

        $me = $this->withHeaders(['Authorization' => 'Bearer ' . $this->token])->get('/api/v1/auth/me');

        $me->assertStatus(200);
        $body = json_decode($me->getJSON(), true);
        $this->assertSame($this->userId, $body['data']['id']);
    }

    /**
     * The mirror image of the test above, for a failed attempt — an
     * incorrect guess shouldn't touch session validity either. Also
     * covers the wrong-password response itself (message, status),
     * rather than spending a separate request on that alone.
     */
    public function testOriginalTokenStaysValidAfterFailedUnlockAttempt(): void
    {
        $response = $this->verify('DefinitelyWrongPassword!');
        $response->assertStatus(401);
        $body = json_decode($response->getJSON(), true);
        $this->assertSame('Incorrect password', $body['message']);

        $me = $this->withHeaders(['Authorization' => 'Bearer ' . $this->token])->get('/api/v1/auth/me');

        $me->assertStatus(200);
    }
}
