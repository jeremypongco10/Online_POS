<?php

use App\Libraries\JwtService;
use App\Models\CompanyModel;
use App\Models\InvoiceSeriesModel;
use App\Models\PaymentMethodModel;
use App\Models\PaymentModel;
use App\Models\ProductDiscountEligibilityModel;
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
 * The three discount reports, run against sales rung up through the real
 * checkout endpoint rather than hand-inserted rows — so what these
 * aggregate is exactly what SalesController::create() actually persists,
 * including the server-computed Senior Citizen amount.
 *
 * @internal
 */
final class DiscountReportsTest extends CIUnitTestCase
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
    private int $vatRateId;
    private string $token;

    protected function setUp(): void
    {
        parent::setUp();

        $this->companyId = (int) model(CompanyModel::class)->insert([
            'trade_name' => 'Discount Reports Test Co ' . bin2hex(random_bytes(4)),
        ], true);

        $role = (int) model(RoleModel::class)->insert([
            'company_id' => $this->companyId,
            'name' => 'Discount Reports Tester',
        ], true);

        $this->storeId = (int) model(StoreModel::class)->insert([
            'company_id' => $this->companyId,
            'name' => 'Discount Reports Store',
            'code' => 'DRS-1',
        ], true);

        model(PaymentMethodModel::class)->insert([
            'company_id' => $this->companyId,
            'name' => 'Cash',
            'code' => PaymentModel::METHOD_CASH,
        ]);

        // SalesController::create() now draws its invoice number from the
        // one active invoice_series row for (company, store, 'Sales
        // Invoice') — see InvoiceSeriesModel::nextNumber() — instead of
        // the old bare InvoiceSequenceModel counter. Without this, this
        // test's own checkout calls would 422 with
        // INVOICE_SERIES_UNAVAILABLE.
        model(InvoiceSeriesModel::class)->insert([
            'company_id' => $this->companyId,
            'store_id' => $this->storeId,
            'invoice_type' => 'Sales Invoice',
            'series_code' => 'TEST',
            'prefix' => 'INV-',
            'starting_number' => 1,
            'current_number' => 0,
            'maximum_number' => 99999999,
            'number_length' => 8,
            'effective_from' => date('Y-m-d'),
            'status' => 'active',
        ]);

        $this->registerId = (int) model(RegisterModel::class)->insert([
            'store_id' => $this->storeId,
            'name' => 'Discount Reports Register',
            'code' => 'DRREG-1',
        ], true);

        $this->vatRateId = (int) model(TaxRateModel::class)->insert([
            'company_id' => $this->companyId,
            'name' => 'VAT',
            'rate' => 12.0,
        ], true);

        $unitId = (int) (model(UnitModel::class)->where('abbreviation', 'pcs')->first()->id ?? 0);

        $this->productId = (int) model(ProductModel::class)->insert([
            'company_id' => $this->companyId,
            'unit_id' => $unitId ?: null,
            'tax_rate_id' => $this->vatRateId,
            'sku' => 'DRTEST-SKU',
            'name' => 'Discount Reports Widget',
            'track_inventory' => 0,
        ], true);

        model(StoreProductPriceModel::class)->insert([
            'product_id' => $this->productId,
            'store_id' => $this->storeId,
            'cost_price' => 50.00,
            'selling_price' => 112.00,
        ]);

        // Every discount type defaults to not-eligible now — this fixture
        // rings up senior_citizen/regular/manual lines below, so all three
        // need an explicit grant first, same as a real store's admin would
        // do via the Discount Eligibility screen.
        foreach (['senior_citizen', 'regular', 'manual'] as $type) {
            model(ProductDiscountEligibilityModel::class)->insert([
                'product_id' => $this->productId,
                'discount_type' => $type,
                'eligible' => 1,
            ]);
        }

        $userId = (int) model(UserModel::class)->insert([
            'company_id' => $this->companyId,
            'role_id' => $role,
            'name' => 'Discount Reports Cashier',
            'email' => 'dreports-' . bin2hex(random_bytes(4)) . '@example.com',
            'username' => 'dreports_' . bin2hex(random_bytes(4)),
            'password' => 'Password123!',
            'is_active' => 1,
        ], true);

        $this->token = (new JwtService())->issueAccessToken(
            $userId,
            $this->companyId,
            $role,
            ['sales.create', 'sales.view', 'reports.view']
        );

        $this->ringUpFixtureSales();
    }

    /**
     * Two sales: one carrying a Senior Citizen line (amount computed
     * server-side — 112.00 inc. 12% VAT is 100.00 net, so 20.00) and a
     * Regular line at a flat 5.00; a second carrying one Manual line at
     * 10.00. Totals every assertion below is measured against.
     */
    private function ringUpFixtureSales(): void
    {
        $first = $this->withHeaders(['Authorization' => 'Bearer ' . $this->token])
            ->withBodyFormat('json')
            ->post('/api/v1/sales', [
                'company_id' => $this->companyId,
                'store_id' => $this->storeId,
                'register_id' => $this->registerId,
                'prices_include_tax' => true,
                'items' => [
                    ['product_id' => $this->productId, 'quantity' => 1, 'unit_price' => 112.00, 'discount_type' => 'senior_citizen', 'tax_rate_id' => $this->vatRateId],
                    ['product_id' => $this->productId, 'quantity' => 1, 'unit_price' => 112.00, 'discount' => 5.00, 'discount_type' => 'regular', 'tax_rate_id' => $this->vatRateId],
                ],
                'payments' => [['method' => 'cash', 'amount' => 500.00]],
                'discount_holder_name' => 'Juan Dela Cruz',
                'discount_id_number' => 'SC-998877',
            ]);
        $first->assertStatus(201);

        $second = $this->withHeaders(['Authorization' => 'Bearer ' . $this->token])
            ->withBodyFormat('json')
            ->post('/api/v1/sales', [
                'company_id' => $this->companyId,
                'store_id' => $this->storeId,
                'register_id' => $this->registerId,
                'prices_include_tax' => true,
                'items' => [
                    ['product_id' => $this->productId, 'quantity' => 1, 'unit_price' => 112.00, 'discount' => 10.00, 'discount_type' => 'manual', 'tax_rate_id' => $this->vatRateId],
                ],
                'payments' => [['method' => 'cash', 'amount' => 500.00]],
            ]);
        $second->assertStatus(201);
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

        $db->table('product_discount_eligibility')->where('product_id', $this->productId)->delete();
        $db->table('store_product_prices')->where('product_id', $this->productId)->delete();
        $db->table('products')->where('company_id', $this->companyId)->delete();
        $db->table('tax_rates')->where('company_id', $this->companyId)->delete();
        $db->table('registers')->where('store_id', $this->storeId)->delete();
        $db->table('stores')->where('company_id', $this->companyId)->delete();
        $db->table('users')->where('company_id', $this->companyId)->delete();
        $db->table('roles')->where('company_id', $this->companyId)->delete();
        $db->table('companies')->where('id', $this->companyId)->delete();

        parent::tearDown();
    }

    private function fetchReport(string $path): array
    {
        $response = $this->withHeaders(['Authorization' => 'Bearer ' . $this->token])->get($path);
        $response->assertStatus(200);

        return json_decode($response->getJSON(), true)['data'];
    }

    public function testDiscountSummaryGroupsByType(): void
    {
        $rows = $this->fetchReport("/api/v1/reports/discount-summary?store_id={$this->storeId}");

        $byType = [];
        foreach ($rows as $row) {
            $byType[$row['discount_type']] = $row;
        }

        $this->assertArrayHasKey('senior_citizen', $byType);
        $this->assertArrayHasKey('regular', $byType);
        $this->assertArrayHasKey('manual', $byType);

        // 112.00 VAT-inclusive is 100.00 net; the statutory 20% of that is
        // 20.00, computed by the server, not by the request.
        $this->assertEqualsWithDelta(20.00, (float) $byType['senior_citizen']['discount_total'], 0.001);
        $this->assertEqualsWithDelta(5.00, (float) $byType['regular']['discount_total'], 0.001);
        $this->assertEqualsWithDelta(10.00, (float) $byType['manual']['discount_total'], 0.001);
        $this->assertSame(1, (int) $byType['senior_citizen']['line_count']);
    }

    public function testDiscountsByCashierTotalsEveryType(): void
    {
        $rows = $this->fetchReport("/api/v1/reports/discounts-by-cashier?store_id={$this->storeId}");

        $this->assertCount(1, $rows);
        $this->assertSame('Discount Reports Cashier', $rows[0]['cashier_name']);
        // 20 + 5 + 10 across three lines in two sales.
        $this->assertEqualsWithDelta(35.00, (float) $rows[0]['discount_total'], 0.001);
        $this->assertSame(3, (int) $rows[0]['line_count']);
        $this->assertSame(2, (int) $rows[0]['sale_count']);
    }

    public function testScPwdRegisterCarriesTheHolderDocumentation(): void
    {
        $rows = $this->fetchReport("/api/v1/reports/discount-details?store_id={$this->storeId}&discount_type=senior_citizen,pwd,sc_pwd_5_bnpc");

        $this->assertCount(1, $rows);
        $this->assertSame('senior_citizen', $rows[0]['discount_type']);
        $this->assertSame('Juan Dela Cruz', $rows[0]['discount_holder_name']);
        $this->assertSame('SC-998877', $rows[0]['discount_id_number']);
        $this->assertNotEmpty($rows[0]['invoice_number']);
        $this->assertEqualsWithDelta(20.00, (float) $rows[0]['discount'], 0.001);
    }

    public function testDiscountDetailsFiltersToOneType(): void
    {
        $rows = $this->fetchReport("/api/v1/reports/discount-details?store_id={$this->storeId}&discount_type=manual");

        $this->assertCount(1, $rows);
        $this->assertSame('manual', $rows[0]['discount_type']);
        $this->assertEqualsWithDelta(10.00, (float) $rows[0]['discount'], 0.001);
        // Only the government types carry holder documentation.
        $this->assertNull($rows[0]['discount_holder_name']);
    }

    public function testDiscountDetailsWithoutAFilterReturnsEveryDiscountedLine(): void
    {
        $rows = $this->fetchReport("/api/v1/reports/discount-details?store_id={$this->storeId}");

        $this->assertCount(3, $rows);
    }

    public function testReportsExcludeAnotherCompanysSales(): void
    {
        // A second company's token must never see this company's rows —
        // every report goes through applyCompletedSalesFilters, but the
        // discount ones join sale_items in, so the scoping is worth
        // asserting rather than assuming.
        $otherCompanyId = (int) model(CompanyModel::class)->insert([
            'trade_name' => 'Other Co ' . bin2hex(random_bytes(4)),
        ], true);
        $otherRole = (int) model(RoleModel::class)->insert(['company_id' => $otherCompanyId, 'name' => 'Other Tester'], true);
        $otherUser = (int) model(UserModel::class)->insert([
            'company_id' => $otherCompanyId,
            'role_id' => $otherRole,
            'name' => 'Other Cashier',
            'email' => 'other-' . bin2hex(random_bytes(4)) . '@example.com',
            'username' => 'other_' . bin2hex(random_bytes(4)),
            'password' => 'Password123!',
            'is_active' => 1,
        ], true);
        $otherToken = (new JwtService())->issueAccessToken($otherUser, $otherCompanyId, $otherRole, ['reports.view']);

        $response = $this->withHeaders(['Authorization' => 'Bearer ' . $otherToken])->get('/api/v1/reports/discount-summary');
        $response->assertStatus(200);
        $this->assertSame([], json_decode($response->getJSON(), true)['data']);

        $db = \Config\Database::connect();
        $db->table('users')->where('company_id', $otherCompanyId)->delete();
        $db->table('roles')->where('company_id', $otherCompanyId)->delete();
        $db->table('companies')->where('id', $otherCompanyId)->delete();
    }
}
