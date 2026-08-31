<?php

use App\Libraries\JwtService;
use App\Models\CompanyModel;
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
 * /api/v1/payment-methods, exercised through the real HTTP routes.
 *
 * Locks in the behavior this feature is built around: `code` is
 * server-derived from `name` and immutable afterward (the checkout flow
 * and CashSessionsController's drawer math both key off it directly), the
 * seeded 'cash' method can't be deleted or deactivated, and checkout
 * (SalesController) actually enforces the per-company active list rather
 * than a fixed set.
 *
 * @internal
 */
final class PaymentMethodsTest extends CIUnitTestCase
{
    use DatabaseTestTrait;
    use FeatureTestTrait;

    protected $migrate = false;
    protected $refresh = false;
    protected $seed = '';

    private int $companyId;
    private string $token;

    protected function setUp(): void
    {
        parent::setUp();

        $suffix = bin2hex(random_bytes(4));
        $this->companyId = (int) model(CompanyModel::class)->insert(['trade_name' => "Payment Methods Co {$suffix}"], true);

        $roleId = (int) model(RoleModel::class)->insert(['company_id' => $this->companyId, 'name' => 'Admin'], true);
        $userId = (int) model(UserModel::class)->insert([
            'company_id' => $this->companyId,
            'role_id' => $roleId,
            'name' => 'PM Tester',
            'email' => "pmtester-{$suffix}@example.com",
            'username' => "pmtester_{$suffix}",
            'password' => 'Password123!',
            'is_active' => 1,
        ], true);

        $jwt = new JwtService();
        $this->token = $jwt->issueAccessToken($userId, $this->companyId, $roleId, [
            'payment-methods.view', 'payment-methods.manage', 'sales.create',
        ]);

        model(PaymentMethodModel::class)->insert([
            'company_id' => $this->companyId,
            'name' => 'Cash',
            'code' => 'cash',
        ]);
    }

    protected function tearDown(): void
    {
        // products.company_id's cascade doesn't reliably fire under the
        // SQLite test DB (see ProductBulkCreateTest / SaleCheckoutFlowTest
        // for the same explicit-delete-before-companies workaround, and
        // build-test-db.php for the underlying Forge rename-dance issue
        // this stems from) — deleted explicitly here rather than relying
        // on it, same as every other integration test that creates one.
        $db = \Config\Database::connect();
        $storeIds = model(StoreModel::class)->where('company_id', $this->companyId)->findColumn('id') ?: [];
        $saleIds = $db->table('sales')->where('company_id', $this->companyId)->get()->getResultArray();
        $saleIds = array_column($saleIds, 'id');
        if ($saleIds !== []) {
            $db->table('payments')->whereIn('sale_id', $saleIds)->delete();
            $db->table('sale_items')->whereIn('sale_id', $saleIds)->delete();
            $db->table('sales')->whereIn('id', $saleIds)->delete();
        }
        if ($storeIds !== []) {
            $db->table('inventory_transactions')->whereIn('store_id', $storeIds)->delete();
            $db->table('inventory')->whereIn('store_id', $storeIds)->delete();
            $db->table('registers')->whereIn('store_id', $storeIds)->delete();
        }
        $db->table('store_product_prices')->whereIn('product_id', model(ProductModel::class)->where('company_id', $this->companyId)->findColumn('id') ?: [0])->delete();
        $db->table('products')->where('company_id', $this->companyId)->delete();
        $db->table('stores')->where('company_id', $this->companyId)->delete();
        $db->table('users')->where('company_id', $this->companyId)->delete();
        $db->table('roles')->where('company_id', $this->companyId)->delete();
        $db->table('companies')->where('id', $this->companyId)->delete();

        parent::tearDown();
    }

    private function auth()
    {
        return $this->withHeaders(['Authorization' => "Bearer {$this->token}"]);
    }

    public function testCreateDerivesCodeFromName(): void
    {
        $response = $this->auth()->withBodyFormat('json')->post('/api/v1/payment-methods', ['name' => 'PayMaya QR']);

        $response->assertStatus(201);
        $body = json_decode($response->getJSON(), true)['data'];
        $this->assertSame('paymaya_qr', $body['code']);
        $this->assertSame('PayMaya QR', $body['name']);
    }

    public function testDuplicateNameGetsADedupedCode(): void
    {
        $this->auth()->withBodyFormat('json')->post('/api/v1/payment-methods', ['name' => 'Store Credit']);
        $response = $this->auth()->withBodyFormat('json')->post('/api/v1/payment-methods', ['name' => 'Store Credit']);

        $response->assertStatus(201);
        $body = json_decode($response->getJSON(), true)['data'];
        $this->assertSame('store_credit_2', $body['code']);
    }

    public function testUpdateIgnoresAnAttemptToChangeCode(): void
    {
        $created = json_decode(
            $this->auth()->withBodyFormat('json')->post('/api/v1/payment-methods', ['name' => 'Wallet'])->getJSON(),
            true
        )['data'];

        $response = $this->auth()->withBodyFormat('json')->put("/api/v1/payment-methods/{$created['id']}", [
            'name' => 'Digital Wallet',
            'code' => 'something_else',
        ]);

        $response->assertStatus(200);
        $body = json_decode($response->getJSON(), true)['data'];
        $this->assertSame('Digital Wallet', $body['name']);
        $this->assertSame('wallet', $body['code']);
    }

    public function testCashCannotBeDeactivated(): void
    {
        $cash = model(PaymentMethodModel::class)->where('company_id', $this->companyId)->where('code', 'cash')->first();

        $response = $this->auth()->withBodyFormat('json')->put("/api/v1/payment-methods/{$cash->id}", ['is_active' => 0]);

        $response->assertStatus(422);
        $this->assertSame(1, (int) model(PaymentMethodModel::class)->find($cash->id)->is_active);
    }

    public function testCashCannotBeDeleted(): void
    {
        $cash = model(PaymentMethodModel::class)->where('company_id', $this->companyId)->where('code', 'cash')->first();

        $response = $this->auth()->delete("/api/v1/payment-methods/{$cash->id}");

        $response->assertStatus(422);
        $this->assertNotNull(model(PaymentMethodModel::class)->find($cash->id));
    }

    public function testNonCashMethodCanBeDeactivatedAndDeleted(): void
    {
        $created = json_decode(
            $this->auth()->withBodyFormat('json')->post('/api/v1/payment-methods', ['name' => 'Temp Method'])->getJSON(),
            true
        )['data'];

        $deactivate = $this->auth()->withBodyFormat('json')->put("/api/v1/payment-methods/{$created['id']}", ['is_active' => 0]);
        $deactivate->assertStatus(200);

        $delete = $this->auth()->delete("/api/v1/payment-methods/{$created['id']}");
        $delete->assertStatus(200);
        $this->assertNull(model(PaymentMethodModel::class)->find($created['id']));
    }

    public function testCheckoutRejectsAnInactivePaymentMethod(): void
    {
        model(PaymentMethodModel::class)->insert(['company_id' => $this->companyId, 'name' => 'Disabled Rail', 'code' => 'disabled_rail', 'is_active' => 0]);

        [$storeId, $registerId, $productId] = $this->makeSellableProduct();

        $response = $this->auth()->withBodyFormat('json')->post('/api/v1/sales', [
            'company_id' => $this->companyId,
            'store_id' => $storeId,
            'register_id' => $registerId,
            'items' => [['product_id' => $productId, 'quantity' => 1, 'unit_price' => 50]],
            'payments' => [['method' => 'disabled_rail', 'amount' => 50]],
        ]);

        $response->assertStatus(422);
        $this->assertStringContainsString('Invalid payment method', $response->getJSON());
    }

    public function testCheckoutAcceptsANewlyCreatedActiveMethod(): void
    {
        // 'mobile' rather than a freely slugified name: the SQLite test
        // DB's payments.method column still carries its original CHECK
        // constraint (cash/card/mobile/store_credit/other — see
        // 2026-08-30-000057's up() for why that's deliberately left
        // alone), so a genuinely arbitrary new code would be rejected at
        // the database layer even though SalesController's own validation
        // now allows it. 'mobile' isn't one of this feature's seeded
        // defaults, so it still exercises "a method this company defined
        // itself, not one of the original six" — just constrained to a
        // legacy-allowed string so the assertion is testing this feature's
        // logic and not incidentally re-litigating the SQLite CHECK gap.
        model(PaymentMethodModel::class)->insert(['company_id' => $this->companyId, 'name' => 'Mobile Wallet', 'code' => 'mobile']);

        [$storeId, $registerId, $productId] = $this->makeSellableProduct();

        $response = $this->auth()->withBodyFormat('json')->post('/api/v1/sales', [
            'company_id' => $this->companyId,
            'store_id' => $storeId,
            'register_id' => $registerId,
            'items' => [['product_id' => $productId, 'quantity' => 1, 'unit_price' => 50]],
            'payments' => [['method' => 'mobile', 'amount' => 50]],
        ]);

        $response->assertStatus(201);
    }

    /** @return array{0: int, 1: int, 2: int} [storeId, registerId, productId] */
    private function makeSellableProduct(): array
    {
        $suffix = bin2hex(random_bytes(4));

        $storeId = (int) model(StoreModel::class)->insert(['company_id' => $this->companyId, 'name' => 'PM Store', 'code' => "PMS-{$suffix}"], true);
        $registerId = (int) model(RegisterModel::class)->insert(['store_id' => $storeId, 'name' => 'PM Register', 'code' => "PMR-{$suffix}"], true);
        $unitId = (int) (model(UnitModel::class)->where('abbreviation', 'pcs')->first()->id ?? 0);
        $productId = (int) model(ProductModel::class)->insert([
            'company_id' => $this->companyId,
            'unit_id' => $unitId ?: null,
            'sku' => "PM-SKU-{$suffix}",
            'name' => 'PM Test Widget',
            'track_inventory' => 0,
        ], true);
        model(StoreProductPriceModel::class)->insert(['product_id' => $productId, 'store_id' => $storeId, 'cost_price' => 20, 'selling_price' => 50]);

        return [$storeId, $registerId, $productId];
    }
}
