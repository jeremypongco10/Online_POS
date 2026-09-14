<?php

use App\Libraries\JwtService;
use App\Models\CompanyModel;
use App\Models\RegisterModel;
use App\Models\StoreModel;
use App\Models\UserModel;
use CodeIgniter\Test\CIUnitTestCase;
use CodeIgniter\Test\DatabaseTestTrait;
use CodeIgniter\Test\FeatureTestTrait;

/**
 * A configured default opening cash for a register, so a cashier isn't
 * required to type one in at every login — see
 * AddOpeningFloatToRegisters and RegisterModel's own notes on the three
 * modes.
 *
 * Covers both halves of the feature: RegistersController rejecting a
 * 'fixed'/'fixed_confirm' register with no configured float (the rule a
 * single-column DB constraint can't express), and
 * CashSessionsController::open() actually resolving the opening balance
 * from that configuration server-side rather than trusting whatever
 * `opening_balance` a client happens to send — the whole point of a
 * fixed float being that it can't be talked into a different one.
 *
 * @internal
 */
final class RegisterOpeningFloatTest extends CIUnitTestCase
{
    use DatabaseTestTrait;
    use FeatureTestTrait;

    protected $migrate = false;
    protected $refresh = false;
    protected $seed = '';

    private int $companyId;
    private int $storeId;
    private string $token;

    protected function setUp(): void
    {
        parent::setUp();

        $company = model(CompanyModel::class)->insert([
            'trade_name' => 'Opening Float Test Co ' . bin2hex(random_bytes(4)),
        ], true);
        $this->companyId = (int) $company;

        $store = model(StoreModel::class)->insert([
            'company_id' => $this->companyId,
            'name' => 'Opening Float Test Store',
            'code' => 'OFTS-1',
        ], true);
        $this->storeId = (int) $store;

        $user = model(UserModel::class)->insert([
            'company_id' => $this->companyId,
            'role_id' => null,
            'name' => 'Opening Float Test User',
            'email' => 'ofts-' . bin2hex(random_bytes(4)) . '@example.com',
            'username' => 'ofts_' . bin2hex(random_bytes(4)),
            'password' => 'Password123!',
            'is_active' => 1,
        ], true);

        $this->token = (new JwtService())->issueAccessToken(
            (int) $user,
            $this->companyId,
            null,
            ['registers.view', 'registers.manage', 'cash-sessions.view', 'cash-sessions.manage']
        );
    }

    protected function tearDown(): void
    {
        $db = \Config\Database::connect();
        $registerIds = array_column($db->table('registers')->where('store_id', $this->storeId)->get()->getResultArray(), 'id');
        if ($registerIds !== []) {
            $db->table('cash_sessions')->whereIn('register_id', $registerIds)->delete();
        }
        $db->table('audit_logs')->where('company_id', $this->companyId)->delete();
        $db->table('registers')->where('store_id', $this->storeId)->delete();
        $db->table('users')->where('company_id', $this->companyId)->delete();
        $db->table('stores')->where('company_id', $this->companyId)->delete();
        $db->table('companies')->where('id', $this->companyId)->delete();

        parent::tearDown();
    }

    private function createRegister(array $overrides = []): int
    {
        return (int) model(RegisterModel::class)->insert(array_merge([
            'store_id' => $this->storeId,
            'name' => 'Register ' . bin2hex(random_bytes(4)),
            'code' => 'R-' . bin2hex(random_bytes(4)),
            'opening_float_mode' => 'manual',
            'default_opening_float' => null,
        ], $overrides), true);
    }

    public function testCreatingFixedRegisterWithoutFloatIsRejected(): void
    {
        $response = $this->withHeaders(['Authorization' => 'Bearer ' . $this->token])
            ->withBodyFormat('json')
            ->post('/api/v1/registers', [
                'store_id' => $this->storeId,
                'name' => 'No Float Register',
                'code' => 'NFR-1',
                'opening_float_mode' => 'fixed',
            ]);

        $response->assertStatus(422);
    }

    public function testCreatingFixedRegisterWithZeroFloatIsRejected(): void
    {
        $response = $this->withHeaders(['Authorization' => 'Bearer ' . $this->token])
            ->withBodyFormat('json')
            ->post('/api/v1/registers', [
                'store_id' => $this->storeId,
                'name' => 'Zero Float Register',
                'code' => 'ZFR-1',
                'opening_float_mode' => 'fixed',
                'default_opening_float' => 0,
            ]);

        $response->assertStatus(422);
    }

    public function testCreatingFixedRegisterWithFloatSucceeds(): void
    {
        $response = $this->withHeaders(['Authorization' => 'Bearer ' . $this->token])
            ->withBodyFormat('json')
            ->post('/api/v1/registers', [
                'store_id' => $this->storeId,
                'name' => 'Fixed Float Register',
                'code' => 'FFR-1',
                'opening_float_mode' => 'fixed',
                'default_opening_float' => 5000,
            ]);

        $response->assertStatus(201);
        $body = json_decode($response->getJSON(), true);
        $this->assertSame('fixed', $body['data']['opening_float_mode']);
        $this->assertEqualsWithDelta(5000.00, (float) $body['data']['default_opening_float'], 0.001);
    }

    /**
     * The reverse of the create-time check — turning an existing manual
     * register into 'fixed' without ever supplying a float has to be
     * rejected the same way, not just the create path. Also proves the
     * merged-state check: a PUT that touches only opening_float_mode
     * still has to see the (missing) float on the row itself.
     */
    public function testUpdatingRegisterToFixedModeWithoutFloatIsRejected(): void
    {
        $id = $this->createRegister();

        $response = $this->withHeaders(['Authorization' => 'Bearer ' . $this->token])
            ->withBodyFormat('json')
            ->put('/api/v1/registers/' . $id, ['opening_float_mode' => 'fixed']);

        $response->assertStatus(422);
    }

    /**
     * The other half of that same merged-state check: a PUT touching
     * only an unrelated field (Active/Inactive, the common case) on an
     * already-fixed register must NOT fail against its own existing
     * configuration just because this particular request never mentions
     * opening_float_mode or default_opening_float.
     */
    public function testUpdatingUnrelatedFieldOnFixedRegisterSucceeds(): void
    {
        $id = $this->createRegister(['opening_float_mode' => 'fixed', 'default_opening_float' => 3000]);

        $response = $this->withHeaders(['Authorization' => 'Bearer ' . $this->token])
            ->withBodyFormat('json')
            ->put('/api/v1/registers/' . $id, ['is_active' => 0]);

        $response->assertStatus(200);
    }

    public function testOpeningManualRegisterStillRequiresOpeningBalance(): void
    {
        $id = $this->createRegister();

        $response = $this->withHeaders(['Authorization' => 'Bearer ' . $this->token])
            ->withBodyFormat('json')
            ->post('/api/v1/cash-sessions/open', ['register_id' => $id]);

        $response->assertStatus(422);
    }

    public function testOpeningManualRegisterUsesTheSuppliedOpeningBalance(): void
    {
        $id = $this->createRegister();

        $response = $this->withHeaders(['Authorization' => 'Bearer ' . $this->token])
            ->withBodyFormat('json')
            ->post('/api/v1/cash-sessions/open', ['register_id' => $id, 'opening_balance' => 1234.56]);

        $response->assertStatus(201);
        $body = json_decode($response->getJSON(), true);
        $this->assertEqualsWithDelta(1234.56, (float) $body['data']['opening_balance'], 0.001);
    }

    /**
     * The core of the feature: a cashier opening a fixed-float register
     * with no opening_balance in the request at all — exactly what the
     * frontend now sends for this mode — gets the register's configured
     * float, not a validation error.
     */
    public function testOpeningFixedRegisterWithNoBalanceInRequestUsesConfiguredFloat(): void
    {
        $id = $this->createRegister(['opening_float_mode' => 'fixed', 'default_opening_float' => 5000]);

        $response = $this->withHeaders(['Authorization' => 'Bearer ' . $this->token])
            ->withBodyFormat('json')
            ->post('/api/v1/cash-sessions/open', ['register_id' => $id]);

        $response->assertStatus(201);
        $body = json_decode($response->getJSON(), true);
        $this->assertEqualsWithDelta(5000.00, (float) $body['data']['opening_balance'], 0.001);
    }

    /** Same as above, for 'fixed_confirm' — the two fixed modes resolve identically server-side; only the cashier-facing tap differs. */
    public function testOpeningFixedConfirmRegisterUsesConfiguredFloat(): void
    {
        $id = $this->createRegister(['opening_float_mode' => 'fixed_confirm', 'default_opening_float' => 2500]);

        $response = $this->withHeaders(['Authorization' => 'Bearer ' . $this->token])
            ->withBodyFormat('json')
            ->post('/api/v1/cash-sessions/open', ['register_id' => $id]);

        $response->assertStatus(201);
        $body = json_decode($response->getJSON(), true);
        $this->assertEqualsWithDelta(2500.00, (float) $body['data']['opening_balance'], 0.001);
    }

    /**
     * The security property this whole design hinges on: a client
     * sending a DIFFERENT opening_balance for a fixed-float register is
     * ignored, not honoured — the server is the source of truth for what
     * a fixed register opens at, exactly as if nothing had been sent.
     */
    public function testOpeningFixedRegisterIgnoresAMismatchedClientSuppliedBalance(): void
    {
        $id = $this->createRegister(['opening_float_mode' => 'fixed', 'default_opening_float' => 5000]);

        $response = $this->withHeaders(['Authorization' => 'Bearer ' . $this->token])
            ->withBodyFormat('json')
            ->post('/api/v1/cash-sessions/open', ['register_id' => $id, 'opening_balance' => 1]);

        $response->assertStatus(201);
        $body = json_decode($response->getJSON(), true);
        $this->assertEqualsWithDelta(5000.00, (float) $body['data']['opening_balance'], 0.001);
    }
}
