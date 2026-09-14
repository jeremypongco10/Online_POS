<?php

use App\Libraries\TaxService;
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
use App\Models\ZReadingModel;
use CodeIgniter\Test\CIUnitTestCase;
use CodeIgniter\Test\DatabaseTestTrait;
use CodeIgniter\Test\FeatureTestTrait;

/**
 * The BIR accreditation layer: the accumulated grand total a terminal
 * carries, and the X/Z readings taken against it.
 *
 * @internal
 */
final class BirReadingTest extends CIUnitTestCase
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
    private int $userId;
    private string $token;

    protected function setUp(): void
    {
        parent::setUp();

        $this->companyId = (int) model(CompanyModel::class)->insert(['trade_name' => 'Reading Test Co ' . bin2hex(random_bytes(4))], true);
        $role = (int) model(RoleModel::class)->insert(['company_id' => $this->companyId, 'name' => 'Reading Tester'], true);
        $this->storeId = (int) model(StoreModel::class)->insert([
            'company_id' => $this->companyId,
            'name' => 'Reading Test Store',
            'code' => 'RTS-1',
            'min_no' => 'MIN-TEST-0001',
            'pos_serial_no' => 'SN-TEST-0001',
            'ptu_number' => 'PTU-TEST-0001',
        ], true);

        model(PaymentMethodModel::class)->insert(['company_id' => $this->companyId, 'name' => 'Cash', 'code' => PaymentModel::METHOD_CASH]);
        model(InvoiceSeriesModel::class)->insert([
            'company_id' => $this->companyId,
            'store_id' => $this->storeId,
            'invoice_type' => 'Sales Invoice',
            'series_code' => 'RT',
            'prefix' => 'SI-',
            'starting_number' => 1,
            'current_number' => 0,
            'maximum_number' => 99999999,
            'number_length' => 8,
            'effective_from' => date('Y-m-d'),
            'status' => 'active',
        ]);

        $this->registerId = (int) model(RegisterModel::class)->insert([
            'store_id' => $this->storeId,
            'name' => 'Reading Register',
            'code' => 'RREG-1',
        ], true);

        // A real 12% VAT rate, so the reading's VATable/VAT split is
        // exercised rather than everything landing in non-VAT.
        $taxRateId = (int) model(TaxRateModel::class)->insert([
            'company_id' => $this->companyId,
            'name' => 'VAT',
            'tax_system' => 'vat',
            'rate' => 12,
            'is_default' => 1,
            'is_active' => 1,
        ], true);
        $this->taxRateId = $taxRateId;

        $unitId = (int) (model(UnitModel::class)->where('abbreviation', 'pcs')->first()->id ?? 0);
        $this->productId = (int) model(ProductModel::class)->insert([
            'company_id' => $this->companyId,
            'unit_id' => $unitId ?: null,
            'sku' => 'RTEST-SKU',
            'name' => 'Reading Test Widget',
            'track_inventory' => 1,
        ], true);
        model(StoreProductPriceModel::class)->insert([
            'product_id' => $this->productId,
            'store_id' => $this->storeId,
            'cost_price' => 50.00,
            'selling_price' => 112.00,
        ]);
        model(InventoryModel::class)->insert([
            'product_id' => $this->productId,
            'store_id' => $this->storeId,
            'quantity' => 500,
            'reorder_level' => 2,
        ]);

        $this->userId = (int) model(UserModel::class)->insert([
            'company_id' => $this->companyId,
            'role_id' => $role,
            'name' => 'Reading Tester',
            'email' => 'reading-' . bin2hex(random_bytes(4)) . '@example.com',
            'username' => 'rtest_' . bin2hex(random_bytes(4)),
            'password' => 'Password123!',
            'is_active' => 1,
        ], true);

        $this->token = (new JwtService())->issueAccessToken(
            $this->userId,
            $this->companyId,
            $role,
            ['sales.create', 'sales.view', 'readings.view', 'readings.manage']
        );
    }

    private int $taxRateId = 0;

    protected function tearDown(): void
    {
        $db = \Config\Database::connect();
        $saleIds = model(SaleModel::class)->where('company_id', $this->companyId)->findColumn('id') ?: [];

        if ($saleIds !== []) {
            $db->table('payments')->whereIn('sale_id', $saleIds)->delete();
            $db->table('sale_items')->whereIn('sale_id', $saleIds)->delete();
            $db->table('sales')->whereIn('id', $saleIds)->delete();
        }

        $db->table('z_readings')->where('company_id', $this->companyId)->delete();
        $db->table('transaction_counters')->where('register_id', $this->registerId)->delete();
        $db->table('inventory_transactions')->where('store_id', $this->storeId)->delete();
        $db->table('inventory')->where('store_id', $this->storeId)->delete();
        $db->table('tax_rates')->where('company_id', $this->companyId)->delete();
        $db->table('products')->where('company_id', $this->companyId)->delete();
        $db->table('cash_sessions')->where('register_id', $this->registerId)->delete();
        $db->table('invoice_series')->where('company_id', $this->companyId)->delete();
        $db->table('registers')->where('store_id', $this->storeId)->delete();
        $db->table('payment_methods')->where('company_id', $this->companyId)->delete();
        $db->table('stores')->where('company_id', $this->companyId)->delete();
        $db->table('users')->where('company_id', $this->companyId)->delete();
        $db->table('roles')->where('company_id', $this->companyId)->delete();
        $db->table('companies')->where('id', $this->companyId)->delete();

        parent::tearDown();
    }

    private function sell(float $unitPrice = 112.00, int $qty = 1)
    {
        return $this->withHeaders(['Authorization' => 'Bearer ' . $this->token])
            ->withBodyFormat('json')
            ->post('/api/v1/sales', [
                'company_id' => $this->companyId,
                'store_id' => $this->storeId,
                'register_id' => $this->registerId,
                'prices_include_tax' => true,
                'items' => [
                    ['product_id' => $this->productId, 'quantity' => $qty, 'unit_price' => $unitPrice, 'tax_rate_id' => $this->taxRateId],
                ],
                'payments' => [['method' => 'cash', 'amount' => $unitPrice * $qty]],
            ]);
    }

    private function xReading(): array
    {
        $res = $this->withHeaders(['Authorization' => 'Bearer ' . $this->token])
            ->get("/api/v1/readings/x?register_id={$this->registerId}");

        return json_decode($res->getJSON(), true)['data'];
    }

    public function testGrandTotalAccumulatesAndNeverDecreases(): void
    {
        $this->sell();
        $this->sell();

        $register = model(RegisterModel::class)->find($this->registerId);
        $this->assertEqualsWithDelta(224.00, (float) $register->grand_total, 0.01);
    }

    public function testXReadingReportsVatSplitWithoutClosingAnything(): void
    {
        $this->sell();

        $x = $this->xReading();

        $this->assertSame('X', $x['type']);
        $this->assertSame(1, $x['transaction_count']);
        // 112.00 VAT-inclusive at 12% = 100.00 net + 12.00 VAT
        $this->assertEqualsWithDelta(100.00, $x['vatable_sales'], 0.01);
        $this->assertEqualsWithDelta(12.00, $x['vat_amount'], 0.01);
        $this->assertEqualsWithDelta(112.00, $x['net_sales'], 0.01);
        $this->assertSame('MIN-TEST-0001', $x['min_no']);
        $this->assertSame('PTU-TEST-0001', $x['ptu_number']);

        // An X changes nothing — no Z was written and the counter is untouched.
        $this->assertSame(0, (int) model(RegisterModel::class)->find($this->registerId)->z_counter);
        $this->assertSame(0, model(ZReadingModel::class)->where('register_id', $this->registerId)->countAllResults());

        // ...and taking it twice reports the same figures.
        $this->assertSame($x['net_sales'], $this->xReading()['net_sales']);
    }

    public function testZReadingClosesThePeriodAndAdvancesTheCounter(): void
    {
        $this->sell();
        $this->sell();

        $res = $this->withHeaders(['Authorization' => 'Bearer ' . $this->token])
            ->withBodyFormat('json')
            ->post('/api/v1/readings/z', ['register_id' => $this->registerId]);

        $res->assertStatus(201);
        $z = json_decode($res->getJSON(), true)['data'];

        $this->assertSame(1, (int) $z['z_counter']);
        $this->assertSame(2, (int) $z['transaction_count']);
        $this->assertEqualsWithDelta(224.00, (float) $z['net_sales'], 0.01);
        // Brackets the machine's lifetime total: started at 0, ended at 224.
        $this->assertEqualsWithDelta(0.00, (float) $z['beginning_grand_total'], 0.01);
        $this->assertEqualsWithDelta(224.00, (float) $z['ending_grand_total'], 0.01);
        $this->assertSame(1, (int) model(RegisterModel::class)->find($this->registerId)->z_counter);
    }

    public function testASecondZCoversOnlySalesSinceTheFirst(): void
    {
        $this->sell();
        $this->withHeaders(['Authorization' => 'Bearer ' . $this->token])
            ->withBodyFormat('json')
            ->post('/api/v1/readings/z', ['register_id' => $this->registerId]);

        // A sale strictly after the first Z's covers_to.
        sleep(1);
        $this->sell(224.00);

        $res = $this->withHeaders(['Authorization' => 'Bearer ' . $this->token])
            ->withBodyFormat('json')
            ->post('/api/v1/readings/z', ['register_id' => $this->registerId]);
        $second = json_decode($res->getJSON(), true)['data'];

        $this->assertSame(2, (int) $second['z_counter']);
        // The first sale is on Z #1 and must not appear again here.
        $this->assertSame(1, (int) $second['transaction_count']);
        $this->assertEqualsWithDelta(224.00, (float) $second['net_sales'], 0.01);
        // Picks up exactly where Z #1 left the accumulated total.
        $this->assertEqualsWithDelta(112.00, (float) $second['beginning_grand_total'], 0.01);
        $this->assertEqualsWithDelta(336.00, (float) $second['ending_grand_total'], 0.01);
    }

    public function testTrainingSalesAreExcludedFromReadingsAndTheGrandTotal(): void
    {
        model(RegisterModel::class)->update($this->registerId, ['is_training_mode' => 1]);

        $res = $this->sell();
        $res->assertStatus(201);
        $sale = json_decode($res->getJSON(), true)['data'];

        // Marked, and given a number that is obviously not a BIR invoice.
        $this->assertSame('1', (string) $sale['is_training']);
        $this->assertStringStartsWith('TRN-', $sale['invoice_number']);
        // The real series was not consumed by a practice transaction.
        $series = model(InvoiceSeriesModel::class)->where('store_id', $this->storeId)->first();
        $this->assertSame(0, (int) $series->current_number);

        $this->assertEqualsWithDelta(0.00, (float) model(RegisterModel::class)->find($this->registerId)->grand_total, 0.01);
        $x = $this->xReading();
        $this->assertSame(0, $x['transaction_count']);
        $this->assertEqualsWithDelta(0.00, $x['net_sales'], 0.01);
    }

    public function testSeniorCitizenDiscountIsReportedOnItsOwnReadingLine(): void
    {
        // Senior Citizen is only offered on products flagged eligible —
        // the register refuses it otherwise (see DiscountEligibility).
        db_connect()->table('product_discount_eligibility')->insert([
            'product_id' => $this->productId,
            'discount_type' => TaxService::DISCOUNT_SENIOR_CITIZEN,
            'eligible' => 1,
            'created_at' => date('Y-m-d H:i:s'),
            'updated_at' => date('Y-m-d H:i:s'),
        ]);

        $this->withHeaders(['Authorization' => 'Bearer ' . $this->token])
            ->withBodyFormat('json')
            ->post('/api/v1/sales', [
                'company_id' => $this->companyId,
                'store_id' => $this->storeId,
                'register_id' => $this->registerId,
                'prices_include_tax' => true,
                'discount_holder_name' => 'Juan dela Cruz',
                'discount_id_number' => 'SC-12345',
                'items' => [[
                    'product_id' => $this->productId,
                    'quantity' => 1,
                    'unit_price' => 112.00,
                    'tax_rate_id' => $this->taxRateId,
                    'discount_type' => TaxService::DISCOUNT_SENIOR_CITIZEN,
                ]],
                'payments' => [['method' => 'cash', 'amount' => 100.00]],
            ]);

        $x = $this->xReading();

        // VAT out first, then 20% of the exclusive base: 112 -> 100 net,
        // 20 discount, 80 due and VAT-exempt (RA 9994).
        $this->assertEqualsWithDelta(20.00, $x['sc_discount_total'], 0.01);
        $this->assertEqualsWithDelta(0.00, $x['pwd_discount_total'], 0.01);
        $this->assertEqualsWithDelta(0.00, $x['vat_amount'], 0.01);
        $this->assertEqualsWithDelta(80.00, $x['vat_exempt_sales'], 0.01);
    }
}
