<?php

use App\Libraries\JwtService;
use App\Models\CompanyModel;
use App\Models\InventoryModel;
use App\Models\InvoiceSeriesModel;
use App\Models\PaymentMethodModel;
use App\Models\PaymentModel;
use App\Models\ProductModel;
use App\Models\RegisterModel;
use App\Models\RoleModel;
use App\Models\SaleModel;
use App\Models\StoreModel;
use App\Models\StoreProductPriceModel;
use App\Models\TaxRateModel;
use App\Models\UnitModel;
use App\Models\UserModel;
use CodeIgniter\Test\CIUnitTestCase;
use CodeIgniter\Test\DatabaseTestTrait;
use CodeIgniter\Test\FeatureTestTrait;

/**
 * Resetting the configuration back to a new-setup state, and the two
 * things that must survive it: the catalogue, and any system that has
 * already traded.
 *
 * @internal
 */
final class SystemResetTest extends CIUnitTestCase
{
    use DatabaseTestTrait;
    use FeatureTestTrait;

    protected $migrate = false;
    protected $refresh = false;
    protected $seed = '';

    private int $companyId;
    private int $storeId;
    private int $registerId;
    private int $productId;
    private int $taxRateId;
    private int $userId;
    private string $token;

    protected function setUp(): void
    {
        parent::setUp();

        $this->companyId = (int) model(CompanyModel::class)->insert([
            'trade_name' => 'Reset Test Co ' . bin2hex(random_bytes(4)),
            'legal_name' => 'Reset Test Corporation',
            'tax_id' => '111-222-333-000',
            'loyalty_points_per_100' => 5,
            'pos_lock_idle_minutes' => 15,
        ], true);
        $role = (int) model(RoleModel::class)->insert(['company_id' => $this->companyId, 'name' => 'Reset Tester'], true);

        $this->storeId = (int) model(StoreModel::class)->insert([
            'company_id' => $this->companyId,
            'name' => 'Reset Store',
            'code' => 'RST-1',
            'min_no' => 'MIN-RESET',
        ], true);

        $this->registerId = (int) model(RegisterModel::class)->insert([
            'store_id' => $this->storeId,
            'name' => 'Reset Register',
            'code' => 'RSTREG-1',
        ], true);

        model(PaymentMethodModel::class)->insert(['company_id' => $this->companyId, 'name' => 'Cash', 'code' => PaymentModel::METHOD_CASH]);
        model(PaymentMethodModel::class)->insert(['company_id' => $this->companyId, 'name' => 'GCash', 'code' => 'gcash']);

        $this->taxRateId = (int) model(TaxRateModel::class)->insert([
            'company_id' => $this->companyId,
            'name' => 'VAT',
            'tax_system' => 'vat',
            'rate' => 12,
            'is_default' => 1,
            'is_active' => 1,
        ], true);

        model(InvoiceSeriesModel::class)->insert([
            'company_id' => $this->companyId,
            'store_id' => $this->storeId,
            'invoice_type' => 'Sales Invoice',
            'series_code' => 'RST',
            'prefix' => 'SI-',
            'starting_number' => 1,
            'current_number' => 0,
            'maximum_number' => 99999999,
            'number_length' => 8,
            'effective_from' => date('Y-m-d'),
            'status' => 'active',
        ]);

        $unitId = (int) (model(UnitModel::class)->where('abbreviation', 'pcs')->first()->id ?? 0);
        $this->productId = (int) model(ProductModel::class)->insert([
            'company_id' => $this->companyId,
            'unit_id' => $unitId ?: null,
            // The field that makes this test worth having: products point
            // at a tax rate with ON DELETE CASCADE, so a careless reset
            // deletes the catalogue along with the rates.
            'tax_rate_id' => $this->taxRateId,
            'sku' => 'RESET-SKU',
            'name' => 'Reset Test Widget',
            'track_inventory' => 1,
        ], true);
        model(StoreProductPriceModel::class)->insert([
            'product_id' => $this->productId,
            'store_id' => $this->storeId,
            'cost_price' => 40.00,
            'selling_price' => 112.00,
        ]);
        model(InventoryModel::class)->insert([
            'product_id' => $this->productId,
            'store_id' => $this->storeId,
            'quantity' => 50,
            'reorder_level' => 2,
        ]);

        $this->userId = (int) model(UserModel::class)->insert([
            'company_id' => $this->companyId,
            'role_id' => $role,
            'name' => 'Reset Tester',
            'email' => 'reset-' . bin2hex(random_bytes(4)) . '@example.com',
            'username' => 'reset_' . bin2hex(random_bytes(4)),
            'password' => 'Password123!',
            'is_active' => 1,
        ], true);

        $this->token = (new JwtService())->issueAccessToken(
            $this->userId,
            $this->companyId,
            $role,
            ['companies.manage', 'sales.create', 'sales.view']
        );
    }

    protected function tearDown(): void
    {
        $db = \Config\Database::connect();
        $saleIds = model(SaleModel::class)->where('company_id', $this->companyId)->findColumn('id') ?: [];

        if ($saleIds !== []) {
            $db->table('payments')->whereIn('sale_id', $saleIds)->delete();
            $db->table('sale_items')->whereIn('sale_id', $saleIds)->delete();
            $db->table('sales')->whereIn('id', $saleIds)->delete();
        }

        $db->table('transaction_counters')->where('register_id', $this->registerId)->delete();
        $db->table('cash_sessions')->where('register_id', $this->registerId)->delete();
        $db->table('inventory_transactions')->where('store_id', $this->storeId)->delete();
        $db->table('inventory')->where('store_id', $this->storeId)->delete();
        $db->table('store_product_prices')->where('store_id', $this->storeId)->delete();
        $db->table('invoice_series')->where('company_id', $this->companyId)->delete();
        $db->table('registers')->where('store_id', $this->storeId)->delete();
        $db->table('stores')->where('company_id', $this->companyId)->delete();
        $db->table('products')->where('company_id', $this->companyId)->delete();
        $db->table('tax_rates')->where('company_id', $this->companyId)->delete();
        $db->table('payment_methods')->where('company_id', $this->companyId)->delete();
        $db->table('users')->where('company_id', $this->companyId)->delete();
        $db->table('roles')->where('company_id', $this->companyId)->delete();
        $db->table('companies')->where('id', $this->companyId)->delete();

        parent::tearDown();
    }

    private function reset(array $body = ['confirm' => 'RESET'])
    {
        return $this->withHeaders(['Authorization' => 'Bearer ' . $this->token])
            ->withBodyFormat('json')
            ->post('/api/v1/system/reset', $body);
    }

    public function testResetClearsConfigurationAndRestoresCompanyDefaults(): void
    {
        $this->reset()->assertStatus(200);

        $db = \Config\Database::connect();
        $this->assertSame(0, $db->table('stores')->where('company_id', $this->companyId)->countAllResults());
        $this->assertSame(0, $db->table('registers')->where('store_id', $this->storeId)->countAllResults());
        $this->assertSame(0, $db->table('tax_rates')->where('company_id', $this->companyId)->countAllResults());
        $this->assertSame(0, $db->table('invoice_series')->where('company_id', $this->companyId)->countAllResults());

        $company = model(CompanyModel::class)->find($this->companyId);
        $this->assertNull($company->tax_id);
        $this->assertNull($company->legal_name);
        $this->assertSame('PHP', $company->currency);
        $this->assertSame(0, (int) $company->loyalty_points_per_100);
        $this->assertSame(0, (int) $company->pos_lock_idle_minutes);
        // The tenant's own identity is not a setting and survives.
        $this->assertNotEmpty($company->trade_name);
    }

    public function testResetKeepsTheCatalogueAndDetachesItFromDeletedTaxRates(): void
    {
        $this->reset()->assertStatus(200);

        // products.tax_rate_id CASCADEs from tax_rates — without the
        // detach this product would have been deleted with the rate.
        $product = model(ProductModel::class)->find($this->productId);
        $this->assertNotNull($product, 'The product must survive a configuration reset.');
        $this->assertSame('Reset Test Widget', $product->name);
        $this->assertNull($product->tax_rate_id);
    }

    public function testResetLeavesCashAsTheOnePaymentMethod(): void
    {
        $this->reset()->assertStatus(200);

        $methods = model(PaymentMethodModel::class)->where('company_id', $this->companyId)->findAll();
        $this->assertCount(1, $methods);
        $this->assertSame(PaymentModel::METHOD_CASH, $methods[0]->code);
    }

    public function testResetIsRefusedOnceTheSystemHasSold(): void
    {
        $this->withHeaders(['Authorization' => 'Bearer ' . $this->token])
            ->withBodyFormat('json')
            ->post('/api/v1/sales', [
                'company_id' => $this->companyId,
                'store_id' => $this->storeId,
                'register_id' => $this->registerId,
                'items' => [['product_id' => $this->productId, 'quantity' => 1, 'unit_price' => 112.00]],
                'payments' => [['method' => 'cash', 'amount' => 112.00]],
            ])->assertStatus(201);

        $response = $this->reset();
        $response->assertStatus(409);

        // Nothing was touched: the branch that issued the invoice, and the
        // invoice itself, are both still there.
        $db = \Config\Database::connect();
        $this->assertSame(1, $db->table('stores')->where('id', $this->storeId)->countAllResults());
        $this->assertSame(1, $db->table('sales')->where('company_id', $this->companyId)->countAllResults());
    }

    public function testResetNeedsTheTypedConfirmation(): void
    {
        $this->reset(['confirm' => 'yes'])->assertStatus(422);
        $this->reset([])->assertStatus(422);

        // ...and refusing it changed nothing.
        $db = \Config\Database::connect();
        $this->assertSame(1, $db->table('stores')->where('id', $this->storeId)->countAllResults());
    }

    public function testEligibilityReportsWhyAResetIsBlocked(): void
    {
        $before = json_decode(
            $this->withHeaders(['Authorization' => 'Bearer ' . $this->token])->get('/api/v1/system/reset-eligibility')->getJSON(),
            true
        )['data'];
        $this->assertTrue($before['can_reset']);
        $this->assertSame([], $before['blockers']);

        $this->withHeaders(['Authorization' => 'Bearer ' . $this->token])
            ->withBodyFormat('json')
            ->post('/api/v1/sales', [
                'company_id' => $this->companyId,
                'store_id' => $this->storeId,
                'register_id' => $this->registerId,
                'items' => [['product_id' => $this->productId, 'quantity' => 1, 'unit_price' => 112.00]],
                'payments' => [['method' => 'cash', 'amount' => 112.00]],
            ]);

        $after = json_decode(
            $this->withHeaders(['Authorization' => 'Bearer ' . $this->token])->get('/api/v1/system/reset-eligibility')->getJSON(),
            true
        )['data'];
        $this->assertFalse($after['can_reset']);
        $this->assertSame(['1 sale'], $after['blockers']);
    }

    /**
     * The other half of this pair of features: a business that hasn't
     * registered with the BIR charges nothing, whatever rate the product
     * carries and whatever the client sends.
     */
    public function testUnregisteredBusinessChargesNoTaxAtAll(): void
    {
        model(CompanyModel::class)->update($this->companyId, ['is_bir_registered' => 0]);

        $response = $this->withHeaders(['Authorization' => 'Bearer ' . $this->token])
            ->withBodyFormat('json')
            ->post('/api/v1/sales', [
                'company_id' => $this->companyId,
                'store_id' => $this->storeId,
                'register_id' => $this->registerId,
                'prices_include_tax' => true,
                'items' => [[
                    'product_id' => $this->productId,
                    'quantity' => 1,
                    'unit_price' => 112.00,
                    // Explicitly asking for the 12% rate — the server must
                    // still refuse to charge it.
                    'tax_rate_id' => $this->taxRateId,
                ]],
                'payments' => [['method' => 'cash', 'amount' => 112.00]],
            ]);

        $response->assertStatus(201);
        $sale = json_decode($response->getJSON(), true)['data'];

        $this->assertEqualsWithDelta(0.00, (float) $sale['tax_total'], 0.001);
        $this->assertEqualsWithDelta(112.00, (float) $sale['total'], 0.001);
        // The BIR block is suppressed on the receipt with it.
        $this->assertSame(0, (int) $sale['show_bir_details']);
    }

    public function testRegisteredBusinessStillChargesTaxNormally(): void
    {
        $response = $this->withHeaders(['Authorization' => 'Bearer ' . $this->token])
            ->withBodyFormat('json')
            ->post('/api/v1/sales', [
                'company_id' => $this->companyId,
                'store_id' => $this->storeId,
                'register_id' => $this->registerId,
                'prices_include_tax' => true,
                'items' => [[
                    'product_id' => $this->productId,
                    'quantity' => 1,
                    'unit_price' => 112.00,
                    'tax_rate_id' => $this->taxRateId,
                ]],
                'payments' => [['method' => 'cash', 'amount' => 112.00]],
            ]);

        $sale = json_decode($response->getJSON(), true)['data'];
        $this->assertEqualsWithDelta(12.00, (float) $sale['tax_total'], 0.01);
    }
}
