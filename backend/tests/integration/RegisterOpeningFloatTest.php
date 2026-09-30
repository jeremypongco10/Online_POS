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
 * A configured default opening cash, so a cashier isn't required to type
 * one in at every login — see AddOpeningFloatToStores and StoreModel's own
 * notes on the three modes. Lives entirely on the STORE: a register
 * carries none of this configuration itself (see
 * DropOpeningFloatFromRegisters) and always uses its own store's setting
 * unconditionally — one place to configure it for every register in a
 * store, no per-register override to keep in sync.
 *
 * Covers both halves of the feature: StoresController rejecting a
 * 'fixed'/'fixed_confirm' store with no configured float (the rule a
 * single-column DB constraint can't express), and
 * CashSessionsController::open() actually resolving the opening balance
 * from the register's store server-side rather than trusting whatever
 * `opening_balance` a client happens to send — the whole point of a fixed
 * float being that it can't be talked into a different one.
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
            ['registers.view', 'registers.manage', 'cash-sessions.view', 'cash-sessions.manage', 'stores.view', 'stores.manage']
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
        ], $overrides), true);
    }

    private function setStoreOpeningFloat(?string $mode, $float): void
    {
        \Config\Database::connect()->table('stores')
            ->where('id', $this->storeId)
            ->update(['opening_float_mode' => $mode, 'default_opening_float' => $float]);
    }

    // -- Store-level opening float ---------------------------------------

    public function testCreatingStoreWithFixedModeAndNoFloatIsRejected(): void
    {
        $response = $this->withHeaders(['Authorization' => 'Bearer ' . $this->token])
            ->withBodyFormat('json')
            ->post('/api/v1/stores', [
                'name' => 'No Float Store',
                'code' => 'NFS-1',
                'opening_float_mode' => 'fixed',
            ]);

        $response->assertStatus(422);
    }

    public function testUpdatingStoreToFixedModeWithoutFloatIsRejected(): void
    {
        $response = $this->withHeaders(['Authorization' => 'Bearer ' . $this->token])
            ->withBodyFormat('json')
            ->put('/api/v1/stores/' . $this->storeId, ['opening_float_mode' => 'fixed']);

        $response->assertStatus(422);
    }

    public function testUpdatingStoreOpeningFloatSucceeds(): void
    {
        $response = $this->withHeaders(['Authorization' => 'Bearer ' . $this->token])
            ->withBodyFormat('json')
            ->put('/api/v1/stores/' . $this->storeId, ['opening_float_mode' => 'fixed', 'default_opening_float' => 3000]);

        $response->assertStatus(200);
        $body = json_decode($response->getJSON(), true);
        $this->assertSame('fixed', $body['data']['opening_float_mode']);
        $this->assertEqualsWithDelta(3000.00, (float) $body['data']['default_opening_float'], 0.001);
    }

    public function testUpdatingUnrelatedFieldOnAFixedStoreSucceeds(): void
    {
        $this->setStoreOpeningFloat('fixed', 3000);

        $response = $this->withHeaders(['Authorization' => 'Bearer ' . $this->token])
            ->withBodyFormat('json')
            ->put('/api/v1/stores/' . $this->storeId, ['is_active' => 0]);

        $response->assertStatus(200);
    }

    // -- A register always follows its own store's opening float --------

    public function testOpeningARegisterWhoseStoreIsManualStillRequiresOpeningBalance(): void
    {
        // Store's own mode is 'manual' by default — untouched here.
        $id = $this->createRegister();

        $response = $this->withHeaders(['Authorization' => 'Bearer ' . $this->token])
            ->withBodyFormat('json')
            ->post('/api/v1/cash-sessions/open', ['register_id' => $id]);

        $response->assertStatus(422);
    }

    public function testOpeningARegisterWhoseStoreIsManualUsesTheSuppliedOpeningBalance(): void
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
     * The core of the feature: a cashier opening a register whose STORE
     * has a fixed float configured, with no opening_balance in the
     * request at all — exactly what the frontend now sends for this
     * mode — gets the store's configured float, not a validation error.
     */
    public function testOpeningARegisterUsesItsStoresConfiguredFixedFloat(): void
    {
        $this->setStoreOpeningFloat('fixed', 5000);
        $id = $this->createRegister();

        $response = $this->withHeaders(['Authorization' => 'Bearer ' . $this->token])
            ->withBodyFormat('json')
            ->post('/api/v1/cash-sessions/open', ['register_id' => $id]);

        $response->assertStatus(201);
        $body = json_decode($response->getJSON(), true);
        $this->assertEqualsWithDelta(5000.00, (float) $body['data']['opening_balance'], 0.001);
    }

    /** Same as above, for 'fixed_confirm' — the two fixed modes resolve identically server-side; only the cashier-facing tap differs. */
    public function testOpeningARegisterWhoseStoreIsFixedConfirmUsesConfiguredFloat(): void
    {
        $this->setStoreOpeningFloat('fixed_confirm', 2500);
        $id = $this->createRegister();

        $response = $this->withHeaders(['Authorization' => 'Bearer ' . $this->token])
            ->withBodyFormat('json')
            ->post('/api/v1/cash-sessions/open', ['register_id' => $id]);

        $response->assertStatus(201);
        $body = json_decode($response->getJSON(), true);
        $this->assertEqualsWithDelta(2500.00, (float) $body['data']['opening_balance'], 0.001);
    }

    /**
     * The security property this whole design hinges on: a client
     * sending a DIFFERENT opening_balance for a register whose store has
     * a fixed float is ignored, not honoured — the server is the source
     * of truth, exactly as if nothing had been sent.
     */
    public function testOpeningARegisterIgnoresAMismatchedClientSuppliedBalanceWhenItsStoreIsFixed(): void
    {
        $this->setStoreOpeningFloat('fixed', 5000);
        $id = $this->createRegister();

        $response = $this->withHeaders(['Authorization' => 'Bearer ' . $this->token])
            ->withBodyFormat('json')
            ->post('/api/v1/cash-sessions/open', ['register_id' => $id, 'opening_balance' => 1]);

        $response->assertStatus(201);
        $body = json_decode($response->getJSON(), true);
        $this->assertEqualsWithDelta(5000.00, (float) $body['data']['opening_balance'], 0.001);
    }

    /** Two registers in the same store both follow it — the whole point of centralizing this on the store instead of each register. */
    public function testEveryRegisterInAStoreSharesItsConfiguredFloat(): void
    {
        $this->setStoreOpeningFloat('fixed', 4000);
        $idA = $this->createRegister();
        $idB = $this->createRegister();

        foreach ([$idA, $idB] as $id) {
            $response = $this->withHeaders(['Authorization' => 'Bearer ' . $this->token])
                ->withBodyFormat('json')
                ->post('/api/v1/cash-sessions/open', ['register_id' => $id]);

            $response->assertStatus(201);
            $body = json_decode($response->getJSON(), true);
            $this->assertEqualsWithDelta(4000.00, (float) $body['data']['opening_balance'], 0.001);
        }
    }

    // -- effective_opening_float_mode / effective_opening_float ----------

    public function testRegistersListIncludesEffectiveOpeningFloatFieldsMatchingItsStore(): void
    {
        $this->setStoreOpeningFloat('fixed', 3000);
        $this->createRegister();

        $response = $this->withHeaders(['Authorization' => 'Bearer ' . $this->token])
            ->get('/api/v1/registers?store_id=' . $this->storeId);

        $response->assertStatus(200);
        $row = json_decode($response->getJSON(), true)['data'][0];
        $this->assertSame('fixed', $row['effective_opening_float_mode']);
        $this->assertEqualsWithDelta(3000.00, (float) $row['effective_opening_float'], 0.001);
    }

    public function testRegisterShowIncludesTheSameEffectiveFields(): void
    {
        $this->setStoreOpeningFloat('fixed_confirm', 1500);
        $id = $this->createRegister();

        $response = $this->withHeaders(['Authorization' => 'Bearer ' . $this->token])
            ->get('/api/v1/registers/' . $id);

        $response->assertStatus(200);
        $row = json_decode($response->getJSON(), true)['data'];
        $this->assertSame('fixed_confirm', $row['effective_opening_float_mode']);
        $this->assertEqualsWithDelta(1500.00, (float) $row['effective_opening_float'], 0.001);
    }

    public function testEffectiveFieldsReflectAManualStoreToo(): void
    {
        // Store's own mode is 'manual' by default — untouched here.
        $this->createRegister();

        $response = $this->withHeaders(['Authorization' => 'Bearer ' . $this->token])
            ->get('/api/v1/registers?store_id=' . $this->storeId);

        $row = json_decode($response->getJSON(), true)['data'][0];
        $this->assertSame('manual', $row['effective_opening_float_mode']);
        $this->assertNull($row['effective_opening_float']);
    }
}
