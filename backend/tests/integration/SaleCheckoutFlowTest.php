<?php

use App\Libraries\JwtService;
use App\Models\CompanyModel;
use App\Models\InventoryModel;
use App\Models\InventoryTransactionModel;
use App\Models\PaymentModel;
use App\Models\ProductModel;
use App\Models\RegisterModel;
use App\Models\RoleModel;
use App\Models\SaleModel;
use App\Models\StoreModel;
use App\Models\StoreProductPriceModel;
use App\Models\UnitModel;
use App\Models\UserModel;
use CodeIgniter\Test\CIUnitTestCase;
use CodeIgniter\Test\DatabaseTestTrait;
use CodeIgniter\Test\FeatureTestTrait;
use Config\Services;

/**
 * Full checkout pipeline, exercised end-to-end through the real HTTP
 * routes (JwtAuthFilter + PermissionFilter both run for real):
 *
 *   Create sale -> Payment -> Inventory update -> Inventory transaction -> Invoice
 *
 * Runs against CI4's built-in `tests` DB group (in-memory SQLite,
 * config already present in app/Config/Database.php — CI4 forces the
 * `tests` group whenever ENVIRONMENT=testing specifically so automated
 * tests can never touch the live MySQL data by accident). $namespace
 * is left at its default (null = migrate every namespace, including
 * this app's real app/Database/Migrations), so the schema under test
 * is the actual production schema, not a hand-rolled stand-in.
 *
 * @internal
 */
final class SaleCheckoutFlowTest extends CIUnitTestCase
{
    use DatabaseTestTrait;
    use FeatureTestTrait;

    // Schema is pre-built once by tests/_support/build-test-db.php, out
    // of process — see that file for why migrating inline here is unsafe.
    protected $migrate = false;
    protected $refresh = false;
    protected $seed = '';

    private int $companyId;
    private int $storeId;
    private int $registerId;
    private int $productId;
    private int $userId;
    private string $token;

    protected function setUp(): void
    {
        parent::setUp();

        $company = model(CompanyModel::class)->insert([
            'trade_name' => 'Integration Test Co ' . bin2hex(random_bytes(4)),
        ], true);
        $this->companyId = (int) $company;

        $role = model(RoleModel::class)->insert([
            'company_id' => $this->companyId,
            'name' => 'Integration Tester',
        ], true);

        $store = model(StoreModel::class)->insert([
            'company_id' => $this->companyId,
            'name' => 'Integration Test Store',
            'code' => 'ITS-1',
        ], true);
        $this->storeId = (int) $store;

        $register = model(RegisterModel::class)->insert([
            'store_id' => $this->storeId,
            'name' => 'Integration Register',
            'code' => 'IREG-1',
        ], true);
        $this->registerId = (int) $register;

        $unitId = (int) (model(UnitModel::class)->where('abbreviation', 'pcs')->first()->id ?? 0);

        $product = model(ProductModel::class)->insert([
            'company_id' => $this->companyId,
            'unit_id' => $unitId ?: null,
            'sku' => 'ITEST-SKU',
            'name' => 'Integration Test Widget',
            'track_inventory' => 1,
        ], true);
        $this->productId = (int) $product;

        model(StoreProductPriceModel::class)->insert([
            'product_id' => $this->productId,
            'store_id' => $this->storeId,
            'cost_price' => 40.00,
            'selling_price' => 65.00,
        ]);

        model(InventoryModel::class)->insert([
            'product_id' => $this->productId,
            'store_id' => $this->storeId,
            'quantity' => 20,
            'reorder_level' => 2,
        ]);

        $user = model(UserModel::class)->insert([
            'company_id' => $this->companyId,
            'role_id' => (int) $role,
            'name' => 'Integration Tester',
            'email' => 'integration-' . bin2hex(random_bytes(4)) . '@example.com',
            'username' => 'itest_' . bin2hex(random_bytes(4)),
            'password' => 'Password123!',
            'is_active' => 1,
        ], true);
        $this->userId = (int) $user;

        $this->token = (new JwtService())->issueAccessToken(
            $this->userId,
            $this->companyId,
            (int) $role,
            ['sales.create', 'sales.view']
        );
    }

    protected function tearDown(): void
    {
        // Deleted in FK-safe order; nothing here touches any other company's data.
        $db = \Config\Database::connect();
        $saleIds = model(SaleModel::class)->where('company_id', $this->companyId)->findColumn('id') ?: [];

        if ($saleIds !== []) {
            $db->table('payments')->whereIn('sale_id', $saleIds)->delete();
            $db->table('sale_items')->whereIn('sale_id', $saleIds)->delete();
            $db->table('sales')->whereIn('id', $saleIds)->delete();
        }

        $db->table('inventory_transactions')->where('store_id', $this->storeId)->delete();
        $db->table('inventory')->where('store_id', $this->storeId)->delete();
        $db->table('products')->where('company_id', $this->companyId)->delete();
        $db->table('registers')->where('store_id', $this->storeId)->delete();
        $db->table('stores')->where('company_id', $this->companyId)->delete();
        $db->table('users')->where('company_id', $this->companyId)->delete();
        $db->table('roles')->where('company_id', $this->companyId)->delete();
        $db->table('companies')->where('id', $this->companyId)->delete();

        parent::tearDown();
    }

    public function testFullCheckoutPipeline(): void
    {
        // --- Create sale (+ Payment, in the same request) ---
        $response = $this->withHeaders(['Authorization' => 'Bearer ' . $this->token])
            ->withBodyFormat('json')
            ->post('/api/v1/sales', [
                'company_id' => $this->companyId,
                'store_id' => $this->storeId,
                'register_id' => $this->registerId,
                'items' => [
                    ['product_id' => $this->productId, 'quantity' => 3, 'unit_price' => 65.00],
                ],
                'payments' => [
                    ['method' => 'cash', 'amount' => 200.00],
                ],
            ]);

        $response->assertStatus(201);
        $body = json_decode($response->getJSON(), true);
        $this->assertTrue($body['success']);

        $saleId = (int) $body['data']['id'];
        $this->assertSame('completed', $body['data']['status']);
        $this->assertEqualsWithDelta(195.00, (float) $body['data']['subtotal'], 0.001); // 3 x 65
        $this->assertEqualsWithDelta(195.00, (float) $body['data']['total'], 0.001);    // no tax rate attached
        $this->assertEqualsWithDelta(200.00, (float) $body['data']['amount_paid'], 0.001);
        $this->assertEqualsWithDelta(5.00, (float) $body['data']['change_due'], 0.001); // 200 - 195

        // --- Payment: a matching payments row exists, tied to this sale ---
        $payments = model(PaymentModel::class)->where('sale_id', $saleId)->findAll();
        $this->assertCount(1, $payments);
        $this->assertSame('cash', $payments[0]->method);
        $this->assertEqualsWithDelta(200.00, (float) $payments[0]->amount, 0.001);

        // --- Inventory update: 20 on hand - 3 sold = 17 ---
        $inventory = model(InventoryModel::class)->forProductAtStore($this->productId, $this->storeId);
        $this->assertEqualsWithDelta(17.0, (float) $inventory->quantity, 0.0001);

        // --- Inventory transaction: a SALE movement of -3, balance_after 17 ---
        $transactions = model(InventoryTransactionModel::class)
            ->where('reference_type', 'sale')
            ->where('reference_id', $saleId)
            ->findAll();
        $this->assertCount(1, $transactions);
        $this->assertSame(InventoryTransactionModel::TYPE_SALE, $transactions[0]->type);
        $this->assertEqualsWithDelta(-3.0, (float) $transactions[0]->quantity, 0.0001);
        $this->assertEqualsWithDelta(17.0, (float) $transactions[0]->balance_after, 0.0001);

        // --- Invoice: the receipt reflects the same sale, items, and payment ---
        $receiptResponse = $this->withHeaders(['Authorization' => 'Bearer ' . $this->token])
            ->get("/api/v1/sales/{$saleId}/receipt");

        $receiptResponse->assertStatus(200);
        $receipt = json_decode($receiptResponse->getJSON(), true)['data'];

        $this->assertNotEmpty($receipt['invoice_number']);
        $this->assertCount(1, $receipt['items']);
        $this->assertSame('Integration Test Widget', $receipt['items'][0]['name']);
        $this->assertEqualsWithDelta(3, (float) $receipt['items'][0]['quantity'], 0.0001);
        $this->assertEqualsWithDelta(195.00, (float) $receipt['total'], 0.001);
        $this->assertCount(1, $receipt['payments']);
        $this->assertEqualsWithDelta(200.00, (float) $receipt['amount_paid'], 0.001);
        $this->assertEqualsWithDelta(5.00, (float) $receipt['change_due'], 0.001);
    }

    public function testInsufficientPaymentIsRejectedBeforeTouchingInventoryOrPayments(): void
    {
        $response = $this->withHeaders(['Authorization' => 'Bearer ' . $this->token])
            ->withBodyFormat('json')
            ->post('/api/v1/sales', [
                'company_id' => $this->companyId,
                'store_id' => $this->storeId,
                'register_id' => $this->registerId,
                'items' => [
                    ['product_id' => $this->productId, 'quantity' => 1, 'unit_price' => 65.00],
                ],
                'payments' => [
                    ['method' => 'cash', 'amount' => 10.00],
                ],
            ]);

        $response->assertStatus(422);

        // Nothing should have moved: no sale row, inventory untouched.
        $this->assertSame(0, model(SaleModel::class)->where('company_id', $this->companyId)->countAllResults());
        $inventory = model(InventoryModel::class)->forProductAtStore($this->productId, $this->storeId);
        $this->assertEqualsWithDelta(20.0, (float) $inventory->quantity, 0.0001);
    }

    public function testInsufficientStockIsRejected(): void
    {
        $response = $this->withHeaders(['Authorization' => 'Bearer ' . $this->token])
            ->withBodyFormat('json')
            ->post('/api/v1/sales', [
                'company_id' => $this->companyId,
                'store_id' => $this->storeId,
                'register_id' => $this->registerId,
                'items' => [
                    ['product_id' => $this->productId, 'quantity' => 999, 'unit_price' => 65.00],
                ],
                'payments' => [
                    ['method' => 'cash', 'amount' => 100000.00],
                ],
            ]);

        $response->assertStatus(422);
        $this->assertSame(0, model(SaleModel::class)->where('company_id', $this->companyId)->countAllResults());
    }
}
