<?php

use App\Libraries\JwtService;
use App\Models\CompanyModel;
use App\Models\RoleModel;
use App\Models\TaxRateModel;
use App\Models\UnitModel;
use App\Models\UserModel;
use CodeIgniter\Test\CIUnitTestCase;
use CodeIgniter\Test\DatabaseTestTrait;
use CodeIgniter\Test\FeatureTestTrait;

/**
 * Two validation holes found by firing deliberately malformed bodies at the
 * live API, both fixed and locked in here.
 *
 * 1. An empty (or entirely non-allowed) request body reached
 *    CodeIgniter's Model::insert()/update(), which throws DataException
 *    *before* it ever runs the model's own rules — so instead of the 422
 *    every other bad request gets, the caller got an uncaught 500 with a
 *    stack trace and server file paths in the body. Units is the resource
 *    that exposed it: BaseCrudController::create() injects company_id for
 *    every tenant-scoped model, which leaves the array non-empty by
 *    accident, and Units is the one resource with $companyColumn = null.
 *    The fix lives in BaseCrudController so it covers any future
 *    tenant-less resource too, hence the update-side cases below, which
 *    reach the same exception on *every* resource (the `id` stamped by
 *    update() is itself stripped by $allowedFields).
 *
 * 2. tax_rates.rate was validated as `decimal` only, which accepts both
 *    -5 and 150. Neither is a percentage, and either silently corrupts
 *    the VAT on every sale computed against it — and, through the
 *    sale_items snapshot, every receipt and BIR reading built from those
 *    sales afterwards.
 *
 * @internal
 */
final class EmptyPayloadValidationTest extends CIUnitTestCase
{
    use DatabaseTestTrait;
    use FeatureTestTrait;

    protected $migrate = false;
    protected $refresh = false;
    protected $seed = '';

    private int $companyId;
    private string $token;
    private int $unitId;

    protected function setUp(): void
    {
        parent::setUp();

        $suffix          = bin2hex(random_bytes(4));
        $this->companyId = (int) model(CompanyModel::class)->insert(['trade_name' => "Validation Co {$suffix}"], true);

        $roleId = (int) model(RoleModel::class)->insert(['company_id' => $this->companyId, 'name' => 'Admin'], true);
        $userId = (int) model(UserModel::class)->insert([
            'company_id' => $this->companyId,
            'role_id'    => $roleId,
            'name'       => 'Validation Tester',
            'email'      => "valtester-{$suffix}@example.com",
            'username'   => "valtester_{$suffix}",
            'password'   => 'Password123!',
            'is_active'  => 1,
        ], true);

        $this->token = (new JwtService())->issueAccessToken($userId, $this->companyId, $roleId, [
            'units.view', 'units.manage', 'taxes.view', 'taxes.manage',
        ]);

        // Units is a global reference table, so this row is not scoped to
        // the company above and has to be cleaned up by id in tearDown().
        $this->unitId = (int) model(UnitModel::class)->insert([
            'name'         => "Validation Unit {$suffix}",
            'abbreviation' => 'VU' . substr($suffix, 0, 4),
        ], true);
    }

    protected function tearDown(): void
    {
        $db = \Config\Database::connect();
        $db->table('tax_rates')->where('company_id', $this->companyId)->delete();
        $db->table('units')->where('id', $this->unitId)->delete();
        $db->table('users')->where('company_id', $this->companyId)->delete();
        $db->table('roles')->where('company_id', $this->companyId)->delete();
        $db->table('companies')->where('id', $this->companyId)->delete();

        parent::tearDown();
    }

    private function auth()
    {
        return $this->withHeaders(['Authorization' => "Bearer {$this->token}"]);
    }

    public function testEmptyCreateBodyReturnsValidationErrorsNotServerError(): void
    {
        $response = $this->auth()->withBodyFormat('json')->post('/api/v1/units', []);

        $response->assertStatus(422);

        // Not merely "not a 500": the caller is told which fields are
        // missing, exactly as a create that omitted them one at a time
        // would, so the frontend's field-level error rendering works with
        // no special casing.
        $errors = json_decode($response->getJSON(), true)['errors'];
        $this->assertArrayHasKey('name', $errors);
        $this->assertArrayHasKey('abbreviation', $errors);
    }

    public function testCreateBodyOfOnlyDisallowedFieldsReturnsValidationErrors(): void
    {
        $response = $this->auth()->withBodyFormat('json')->post('/api/v1/units', ['not_a_field' => 'x']);

        $response->assertStatus(422);
        $this->assertArrayHasKey('name', json_decode($response->getJSON(), true)['errors']);
    }

    public function testEmptyUpdateBodyReturnsValidationErrorNotServerError(): void
    {
        $response = $this->auth()->withBodyFormat('json')->put("/api/v1/units/{$this->unitId}", []);

        $response->assertStatus(422);

        // An update says what actually happened rather than claiming the
        // required fields are missing — the row it targets already has
        // every one of them filled in.
        $this->assertSame(
            'No changes were provided to update this record.',
            json_decode($response->getJSON(), true)['message']
        );
    }

    public function testUpdateBodyOfOnlyDisallowedFieldsReturnsValidationError(): void
    {
        $response = $this->auth()->withBodyFormat('json')->put(
            "/api/v1/units/{$this->unitId}",
            ['not_a_field' => 'x']
        );

        $response->assertStatus(422);
    }

    public function testValidCreateStillSucceeds(): void
    {
        $suffix   = bin2hex(random_bytes(3));
        $response = $this->auth()->withBodyFormat('json')->post('/api/v1/units', [
            'name'         => "Regression Unit {$suffix}",
            'abbreviation' => 'RU' . $suffix,
        ]);

        $response->assertStatus(201);

        \Config\Database::connect()
            ->table('units')
            ->where('id', json_decode($response->getJSON(), true)['data']['id'])
            ->delete();
    }

    /** @dataProvider provideOutOfRangeRates */
    public function testTaxRateOutsideZeroToOneHundredIsRejected(float $rate): void
    {
        $response = $this->auth()->withBodyFormat('json')->post('/api/v1/taxes', [
            'name' => 'Out Of Range',
            'rate' => $rate,
        ]);

        $response->assertStatus(422);
        $this->assertSame(
            'Rate must be a percentage between 0 and 100.',
            json_decode($response->getJSON(), true)['errors']['rate']
        );
    }

    public static function provideOutOfRangeRates(): array
    {
        return [
            'negative'      => [-5.0],
            'above hundred' => [150.0],
            'just above'    => [100.01],
        ];
    }

    /** @dataProvider provideInRangeRates */
    public function testTaxRateWithinZeroToOneHundredIsAccepted(float $rate): void
    {
        $response = $this->auth()->withBodyFormat('json')->post('/api/v1/taxes', [
            'name' => "In Range {$rate}",
            'rate' => $rate,
        ]);

        $response->assertStatus(201);
    }

    public static function provideInRangeRates(): array
    {
        // Both ends inclusive: 0 is a legitimate zero-rated/exempt line,
        // and 100 has to stay reachable so the bound isn't off by one.
        return [
            'zero'        => [0.0],
            'typical vat' => [12.0],
            'hundred'     => [100.0],
        ];
    }
}
