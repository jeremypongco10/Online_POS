<?php

use App\Libraries\JwtService;
use App\Models\CompanyModel;
use App\Models\InvoiceSeriesModel;
use App\Models\PaymentMethodModel;
use App\Models\ProductModel;
use App\Models\RegisterModel;
use App\Models\RoleModel;
use App\Models\StoreModel;
use App\Models\StoreProductPriceModel;
use App\Models\UnitModel;
use App\Models\UserModel;
use CodeIgniter\Test\CIUnitTestCase;
use CodeIgniter\Test\DatabaseTestTrait;
use CodeIgniter\Test\FeatureTestTrait;

/**
 * The Sales Invoice Configuration module: /api/v1/invoice-series CRUD and
 * permission gating, the business-rule validations from spec §13
 * (starting/current/maximum ordering, number_length, effective dates, no
 * overlapping active series), the exhaustion flip and atomic numbering in
 * InvoiceSeriesModel::nextNumber() (called directly here — it has no HTTP
 * endpoint of its own, see SalesController::create()), and the end-to-end
 * checkout failure when a branch has no active series at all.
 *
 * @internal
 */
final class InvoiceSeriesTest extends CIUnitTestCase
{
    use DatabaseTestTrait;
    use FeatureTestTrait;

    protected $migrate = false;
    protected $refresh = false;
    protected $seed = '';

    private int $companyId;
    private int $storeId;
    /** Holds both invoice-series.view and invoice-series.manage. */
    private string $manageToken;
    /** Holds only invoice-series.view. */
    private string $viewOnlyToken;

    protected function setUp(): void
    {
        parent::setUp();

        $suffix = bin2hex(random_bytes(4));
        $this->companyId = (int) model(CompanyModel::class)->insert(['trade_name' => "Invoice Series Co {$suffix}"], true);
        $this->storeId = (int) model(StoreModel::class)->insert([
            'company_id' => $this->companyId,
            'name' => 'Invoice Series Store',
            'code' => "ISS-{$suffix}",
        ], true);

        $roleId = (int) model(RoleModel::class)->insert(['company_id' => $this->companyId, 'name' => 'Admin'], true);
        $userId = (int) model(UserModel::class)->insert([
            'company_id' => $this->companyId,
            'role_id' => $roleId,
            'name' => 'Invoice Series Tester',
            'email' => "istester-{$suffix}@example.com",
            'username' => "istester_{$suffix}",
            'password' => 'Password123!',
            'is_active' => 1,
        ], true);

        $jwt = new JwtService();
        $this->manageToken = $jwt->issueAccessToken($userId, $this->companyId, $roleId, [
            'invoice-series.view', 'invoice-series.manage', 'sales.create',
        ]);
        $this->viewOnlyToken = $jwt->issueAccessToken($userId, $this->companyId, $roleId, [
            'invoice-series.view',
        ]);
    }

    protected function tearDown(): void
    {
        $db = \Config\Database::connect();
        $saleIds = $db->table('sales')->where('company_id', $this->companyId)->get()->getResultArray();
        $saleIds = array_column($saleIds, 'id');
        if ($saleIds !== []) {
            $db->table('payments')->whereIn('sale_id', $saleIds)->delete();
            $db->table('sale_items')->whereIn('sale_id', $saleIds)->delete();
            $db->table('sales')->whereIn('id', $saleIds)->delete();
        }
        $db->table('invoice_series')->where('company_id', $this->companyId)->delete();
        $db->table('registers')->where('store_id', $this->storeId)->delete();
        $db->table('payment_methods')->where('company_id', $this->companyId)->delete();
        $db->table('products')->where('company_id', $this->companyId)->delete();
        $db->table('stores')->where('id', $this->storeId)->delete();
        $db->table('users')->where('company_id', $this->companyId)->delete();
        $db->table('roles')->where('company_id', $this->companyId)->delete();
        $db->table('companies')->where('id', $this->companyId)->delete();

        parent::tearDown();
    }

    private function authAs(string $token)
    {
        return $this->withHeaders(['Authorization' => "Bearer {$token}"]);
    }

    private function validPayload(array $overrides = []): array
    {
        return array_merge([
            'store_id' => $this->storeId,
            'invoice_type' => 'Sales Invoice',
            'series_code' => '2026',
            'prefix' => 'SI-',
            'starting_number' => 1,
            'current_number' => 0,
            'maximum_number' => 99999999,
            'number_length' => 8,
            'effective_from' => date('Y-m-d'),
            'status' => 'active',
        ], $overrides);
    }

    // --- CRUD + permission gating -------------------------------------

    public function testManageTokenCanCreateASeries(): void
    {
        $response = $this->authAs($this->manageToken)->withBodyFormat('json')->post('/api/v1/invoice-series', $this->validPayload());

        $response->assertStatus(201);
        $row = json_decode($response->getJSON(), true)['data'];
        $this->assertSame('2026', $row['series_code']);
        $this->assertSame('SI-', $row['prefix']);
        $this->assertSame('1', (string) $row['starting_number']);
        $this->assertSame('active', $row['status']);
        // Not yet issued — current_number is exactly what was submitted
        // (0) until the first real nextNumber() call, proven separately
        // in testNextNumberIncrementsAndNeverReuses to produce
        // SI-2026-00000001.
        $this->assertSame('0', (string) $row['current_number']);
    }

    public function testViewOnlyTokenCannotCreateASeries(): void
    {
        $response = $this->authAs($this->viewOnlyToken)->withBodyFormat('json')->post('/api/v1/invoice-series', $this->validPayload());

        $response->assertStatus(403);
    }

    public function testViewOnlyTokenCanListSeries(): void
    {
        model(InvoiceSeriesModel::class)->insert(array_merge($this->validPayload(), ['company_id' => $this->companyId]));

        $response = $this->authAs($this->viewOnlyToken)->get('/api/v1/invoice-series');

        $response->assertStatus(200);
    }

    public function testDeleteIsAlwaysRejected(): void
    {
        $id = (int) model(InvoiceSeriesModel::class)->insert(array_merge($this->validPayload(), ['company_id' => $this->companyId]), true);

        $response = $this->authAs($this->manageToken)->delete("/api/v1/invoice-series/{$id}");

        $response->assertStatus(405);
        $this->assertNotNull(model(InvoiceSeriesModel::class)->find($id));
    }

    // --- Business-rule validation (spec §13) --------------------------

    public function testStartingNumberCannotExceedMaximum(): void
    {
        $response = $this->authAs($this->manageToken)->withBodyFormat('json')->post(
            '/api/v1/invoice-series',
            $this->validPayload(['starting_number' => 100, 'maximum_number' => 50])
        );

        $response->assertStatus(422);
        $this->assertStringContainsString('Starting number must not exceed', $response->getJSON());
    }

    public function testCurrentNumberCannotExceedMaximum(): void
    {
        $response = $this->authAs($this->manageToken)->withBodyFormat('json')->post(
            '/api/v1/invoice-series',
            $this->validPayload(['current_number' => 100, 'maximum_number' => 50])
        );

        $response->assertStatus(422);
        $this->assertStringContainsString('Current number must not exceed', $response->getJSON());
    }

    public function testNumberLengthMustFitTheMaximum(): void
    {
        $response = $this->authAs($this->manageToken)->withBodyFormat('json')->post(
            '/api/v1/invoice-series',
            $this->validPayload(['maximum_number' => 99999999, 'number_length' => 4])
        );

        $response->assertStatus(422);
        $this->assertStringContainsString('Number length must be long enough', $response->getJSON());
    }

    public function testEffectiveToCannotPrecedeEffectiveFrom(): void
    {
        $response = $this->authAs($this->manageToken)->withBodyFormat('json')->post(
            '/api/v1/invoice-series',
            $this->validPayload(['effective_from' => '2026-06-01', 'effective_to' => '2026-01-01'])
        );

        $response->assertStatus(422);
        $this->assertStringContainsString('Effective To cannot be earlier', $response->getJSON());
    }

    public function testCreatingASecondActiveSeriesForTheSameStoreAndTypeIsRejected(): void
    {
        $this->authAs($this->manageToken)->withBodyFormat('json')->post('/api/v1/invoice-series', $this->validPayload(['series_code' => '2026']))
            ->assertStatus(201);

        $response = $this->authAs($this->manageToken)->withBodyFormat('json')->post(
            '/api/v1/invoice-series',
            $this->validPayload(['series_code' => '2026-B'])
        );

        $response->assertStatus(422);
        $this->assertStringContainsString('Another series is already active', $response->getJSON());
    }

    public function testActivatingASeriesRejectsOverlapWithAnAlreadyActiveOne(): void
    {
        $this->authAs($this->manageToken)->withBodyFormat('json')->post('/api/v1/invoice-series', $this->validPayload(['series_code' => '2026']))
            ->assertStatus(201);

        $second = json_decode(
            $this->authAs($this->manageToken)->withBodyFormat('json')->post(
                '/api/v1/invoice-series',
                $this->validPayload(['series_code' => '2027', 'status' => 'inactive'])
            )->getJSON(),
            true
        )['data'];

        $response = $this->authAs($this->manageToken)->post("/api/v1/invoice-series/{$second['id']}/activate");

        $response->assertStatus(422);
        $this->assertStringContainsString('Another series is already active', $response->getJSON());
    }

    public function testDeactivateThenActivateASecondSeriesSucceeds(): void
    {
        $first = json_decode(
            $this->authAs($this->manageToken)->withBodyFormat('json')->post('/api/v1/invoice-series', $this->validPayload(['series_code' => '2026']))
                ->getJSON(),
            true
        )['data'];

        $second = json_decode(
            $this->authAs($this->manageToken)->withBodyFormat('json')->post(
                '/api/v1/invoice-series',
                $this->validPayload(['series_code' => '2027', 'status' => 'inactive'])
            )->getJSON(),
            true
        )['data'];

        $this->authAs($this->manageToken)->post("/api/v1/invoice-series/{$first['id']}/deactivate")->assertStatus(200);
        $this->authAs($this->manageToken)->post("/api/v1/invoice-series/{$second['id']}/activate")->assertStatus(200);

        $this->assertSame('inactive', model(InvoiceSeriesModel::class)->find($first['id'])->status);
        $this->assertSame('active', model(InvoiceSeriesModel::class)->find($second['id'])->status);
    }

    // --- nextNumber(): exhaustion, effective dates, no-series-available ---

    public function testNextNumberIncrementsAndNeverReuses(): void
    {
        model(InvoiceSeriesModel::class)->insert(array_merge($this->validPayload(), ['company_id' => $this->companyId]));

        $model = model(InvoiceSeriesModel::class);
        $first = $model->nextNumber($this->companyId, $this->storeId, 'Sales Invoice');
        $second = $model->nextNumber($this->companyId, $this->storeId, 'Sales Invoice');
        $third = $model->nextNumber($this->companyId, $this->storeId, 'Sales Invoice');

        $this->assertSame(['SI-2026-00000001', 'SI-2026-00000002', 'SI-2026-00000003'], [$first['formatted'], $second['formatted'], $third['formatted']]);
        $this->assertSame([1, 2, 3], [$first['number'], $second['number'], $third['number']]);
    }

    public function testSeriesFlipsToExhaustedOnceMaximumIsReached(): void
    {
        $id = (int) model(InvoiceSeriesModel::class)->insert(array_merge(
            $this->validPayload(['starting_number' => 1, 'current_number' => 0, 'maximum_number' => 2, 'number_length' => 1]),
            ['company_id' => $this->companyId]
        ), true);

        $model = model(InvoiceSeriesModel::class);
        $model->nextNumber($this->companyId, $this->storeId, 'Sales Invoice');
        $this->assertSame('active', $model->find($id)->status);

        // The second call reaches the maximum — the row must flip to
        // exhausted in that same update, never left readable as "active"
        // with nothing left (spec §4).
        $model->nextNumber($this->companyId, $this->storeId, 'Sales Invoice');
        $this->assertSame('exhausted', $model->find($id)->status);
        $this->assertSame(2, (int) $model->find($id)->current_number);

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('No active invoice series is available for this branch. Please contact an authorized administrator.');
        $model->nextNumber($this->companyId, $this->storeId, 'Sales Invoice');
    }

    public function testASeriesNotYetEffectiveIsNeverSelected(): void
    {
        model(InvoiceSeriesModel::class)->insert(array_merge(
            $this->validPayload(['effective_from' => date('Y-m-d', strtotime('+1 year'))]),
            ['company_id' => $this->companyId]
        ));

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('No active invoice series is available for this branch. Please contact an authorized administrator.');
        model(InvoiceSeriesModel::class)->nextNumber($this->companyId, $this->storeId, 'Sales Invoice');
    }

    public function testNoSeriesAtAllThrowsTheExactSpecMessage(): void
    {
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('No active invoice series is available for this branch. Please contact an authorized administrator.');
        model(InvoiceSeriesModel::class)->nextNumber($this->companyId, $this->storeId, 'Sales Invoice');
    }

    /**
     * End to end through the real checkout endpoint: a branch with zero
     * invoice_series rows must refuse to complete a sale (spec §15) rather
     * than falling back to some default numbering, and the transaction
     * must roll back cleanly — no sale row left behind, no inventory or
     * payment rows orphaned.
     */
    public function testCheckoutFailsCleanlyWithNoActiveSeries(): void
    {
        model(PaymentMethodModel::class)->insert(['company_id' => $this->companyId, 'name' => 'Cash', 'code' => 'cash']);
        $registerId = (int) model(RegisterModel::class)->insert(['store_id' => $this->storeId, 'name' => 'Register 1', 'code' => 'ISR-1'], true);
        $unitId = (int) (model(UnitModel::class)->where('abbreviation', 'pcs')->first()->id ?? 0);
        $productId = (int) model(ProductModel::class)->insert([
            'company_id' => $this->companyId,
            'unit_id' => $unitId ?: null,
            'sku' => 'IS-SKU-1',
            'name' => 'No Series Widget',
            'track_inventory' => 0,
        ], true);
        model(StoreProductPriceModel::class)->insert(['product_id' => $productId, 'store_id' => $this->storeId, 'cost_price' => 20, 'selling_price' => 50]);

        $response = $this->authAs($this->manageToken)->withBodyFormat('json')->post('/api/v1/sales', [
            'company_id' => $this->companyId,
            'store_id' => $this->storeId,
            'register_id' => $registerId,
            'items' => [['product_id' => $productId, 'quantity' => 1, 'unit_price' => 50]],
            'payments' => [['method' => 'cash', 'amount' => 50]],
        ]);

        $response->assertStatus(422);
        $this->assertStringContainsString('No active invoice series is available for this branch', $response->getJSON());
        $this->assertSame(0, \Config\Database::connect()->table('sales')->where('company_id', $this->companyId)->countAllResults());
    }
}
