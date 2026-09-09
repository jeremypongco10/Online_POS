<?php

use App\Libraries\JwtService;
use App\Libraries\TaxService;
use App\Models\CategoryDiscountEligibilityModel;
use App\Models\CategoryModel;
use App\Models\CompanyModel;
use App\Models\PaymentMethodModel;
use App\Models\PaymentModel;
use App\Models\ProductDiscountEligibilityModel;
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

/**
 * Product/category discount eligibility — TaxService::
 * isProductEligibleForDiscount()'s resolution order (product override ->
 * category override -> eligible by default), its enforcement inside
 * SalesController::create() (a restricted line must 422, never silently
 * discount anyway), and the two read/write endpoint pairs
 * ProductsController::discountEligibility()/updateDiscountEligibility()
 * and CategoriesController::discountEligibility()/updateDiscountEligibility().
 *
 * @internal
 */
final class DiscountEligibilityTest extends CIUnitTestCase
{
    use DatabaseTestTrait;
    use FeatureTestTrait;

    protected $migrate = false;
    protected $refresh = false;
    protected $seed = '';

    private int $companyId;
    private int $storeId;
    private int $registerId;
    private int $categoryId;
    private int $productId; // in $categoryId, no product-level override
    private string $token;

    protected function setUp(): void
    {
        parent::setUp();

        $company = model(CompanyModel::class)->insert([
            'trade_name' => 'Eligibility Test Co ' . bin2hex(random_bytes(4)),
        ], true);
        $this->companyId = (int) $company;

        $role = model(RoleModel::class)->insert([
            'company_id' => $this->companyId,
            'name' => 'Eligibility Tester',
        ], true);

        $store = model(StoreModel::class)->insert([
            'company_id' => $this->companyId,
            'name' => 'Eligibility Test Store',
            'code' => 'ETS-1',
        ], true);
        $this->storeId = (int) $store;

        model(PaymentMethodModel::class)->insert([
            'company_id' => $this->companyId,
            'name' => 'Cash',
            'code' => PaymentModel::METHOD_CASH,
        ]);

        $register = model(RegisterModel::class)->insert([
            'store_id' => $this->storeId,
            'name' => 'Eligibility Register',
            'code' => 'EREG-1',
        ], true);
        $this->registerId = (int) $register;

        $category = model(CategoryModel::class)->insert([
            'company_id' => $this->companyId,
            'name' => 'Tobacco & Alcohol',
        ], true);
        $this->categoryId = (int) $category;

        $unitId = (int) (model(UnitModel::class)->where('abbreviation', 'pcs')->first()->id ?? 0);

        $product = model(ProductModel::class)->insert([
            'company_id' => $this->companyId,
            'category_id' => $this->categoryId,
            'unit_id' => $unitId ?: null,
            'sku' => 'ETEST-SKU',
            'name' => 'Eligibility Test Gin',
            'track_inventory' => 0,
        ], true);
        $this->productId = (int) $product;

        model(StoreProductPriceModel::class)->insert([
            'product_id' => $this->productId,
            'store_id' => $this->storeId,
            'cost_price' => 100.00,
            'selling_price' => 500.00,
        ]);

        $user = model(UserModel::class)->insert([
            'company_id' => $this->companyId,
            'role_id' => (int) $role,
            'name' => 'Eligibility Tester',
            'email' => 'eligibility-' . bin2hex(random_bytes(4)) . '@example.com',
            'username' => 'etest_' . bin2hex(random_bytes(4)),
            'password' => 'Password123!',
            'is_active' => 1,
        ], true);

        $this->token = (new JwtService())->issueAccessToken(
            (int) $user,
            $this->companyId,
            (int) $role,
            ['sales.create', 'sales.view', 'products.view', 'products.update', 'categories.view', 'categories.manage']
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

        $db->table('product_discount_eligibility')->where('product_id', $this->productId)->delete();
        $db->table('category_discount_eligibility')->where('category_id', $this->categoryId)->delete();
        $db->table('store_product_prices')->where('product_id', $this->productId)->delete();
        $db->table('products')->where('company_id', $this->companyId)->delete();
        $db->table('categories')->where('company_id', $this->companyId)->delete();
        $db->table('registers')->where('store_id', $this->storeId)->delete();
        $db->table('stores')->where('company_id', $this->companyId)->delete();
        $db->table('users')->where('company_id', $this->companyId)->delete();
        $db->table('roles')->where('company_id', $this->companyId)->delete();
        $db->table('companies')->where('id', $this->companyId)->delete();

        parent::tearDown();
    }

    // --- TaxService::isProductEligibleForDiscount() resolution order ---

    public function testNotEligibleByDefaultWithNoRulesConfigured(): void
    {
        $product = model(ProductModel::class)->find($this->productId);
        $tax = new TaxService();

        $this->assertFalse($tax->isProductEligibleForDiscount('senior_citizen', $product));
    }

    public function testCategoryRuleAppliesWhenNoProductRuleExists(): void
    {
        model(CategoryDiscountEligibilityModel::class)->insert([
            'category_id' => $this->categoryId,
            'discount_type' => 'senior_citizen',
            'eligible' => 1,
        ]);

        $product = model(ProductModel::class)->find($this->productId);
        $tax = new TaxService();

        $this->assertTrue($tax->isProductEligibleForDiscount('senior_citizen', $product));
        // A different, unconfigured type on the same product is untouched
        // — and stays at the not-eligible default.
        $this->assertFalse($tax->isProductEligibleForDiscount('pwd', $product));
    }

    public function testProductRuleOverridesCategoryRule(): void
    {
        model(CategoryDiscountEligibilityModel::class)->insert([
            'category_id' => $this->categoryId,
            'discount_type' => 'senior_citizen',
            'eligible' => 0,
        ]);
        model(ProductDiscountEligibilityModel::class)->insert([
            'product_id' => $this->productId,
            'discount_type' => 'senior_citizen',
            'eligible' => 1,
        ]);

        $product = model(ProductModel::class)->find($this->productId);
        $tax = new TaxService();

        $this->assertTrue($tax->isProductEligibleForDiscount('senior_citizen', $product));
    }

    public function testCustomItemWithNoProductIsAlwaysEligible(): void
    {
        $tax = new TaxService();
        $this->assertTrue($tax->isProductEligibleForDiscount('senior_citizen', null));
    }

    // --- Checkout enforcement (SalesController::create) ---

    public function testCheckoutRejectsRestrictedDiscountTypeForTheLine(): void
    {
        model(CategoryDiscountEligibilityModel::class)->insert([
            'category_id' => $this->categoryId,
            'discount_type' => 'senior_citizen',
            'eligible' => 0,
        ]);

        $response = $this->withHeaders(['Authorization' => 'Bearer ' . $this->token])
            ->withBodyFormat('json')
            ->post('/api/v1/sales', [
                'company_id' => $this->companyId,
                'store_id' => $this->storeId,
                'register_id' => $this->registerId,
                'items' => [
                    ['product_id' => $this->productId, 'quantity' => 1, 'unit_price' => 500.00, 'discount_type' => 'senior_citizen'],
                ],
                'payments' => [
                    ['method' => 'cash', 'amount' => 500.00],
                ],
                'discount_holder_name' => 'Juan Dela Cruz',
                'discount_id_number' => 'SC-1',
            ]);

        $response->assertStatus(422);
        $body = json_decode($response->getJSON(), true);
        $this->assertStringContainsString('not available', $body['message']);
        $this->assertSame(0, model(SaleModel::class)->where('company_id', $this->companyId)->countAllResults());
    }

    public function testCheckoutAllowsAnUnrestrictedDiscountTypeForTheSameLine(): void
    {
        model(CategoryDiscountEligibilityModel::class)->insert([
            'category_id' => $this->categoryId,
            'discount_type' => 'senior_citizen',
            'eligible' => 0,
        ]);
        // pwd is explicitly turned on for this category — every type
        // defaults to off, so this is what "unrestricted" means now.
        model(CategoryDiscountEligibilityModel::class)->insert([
            'category_id' => $this->categoryId,
            'discount_type' => 'pwd',
            'eligible' => 1,
        ]);

        $response = $this->withHeaders(['Authorization' => 'Bearer ' . $this->token])
            ->withBodyFormat('json')
            ->post('/api/v1/sales', [
                'company_id' => $this->companyId,
                'store_id' => $this->storeId,
                'register_id' => $this->registerId,
                'items' => [
                    ['product_id' => $this->productId, 'quantity' => 1, 'unit_price' => 500.00, 'discount_type' => 'pwd'],
                ],
                'payments' => [
                    ['method' => 'cash', 'amount' => 500.00],
                ],
                'discount_holder_name' => 'Juan Dela Cruz',
                'discount_id_number' => 'PWD-1',
            ]);

        $response->assertStatus(201);
    }

    // --- Endpoints ---

    public function testProductDiscountEligibilityEndpointReflectsCategoryOverride(): void
    {
        model(CategoryDiscountEligibilityModel::class)->insert([
            'category_id' => $this->categoryId,
            'discount_type' => 'senior_citizen',
            'eligible' => 1,
        ]);

        $response = $this->withHeaders(['Authorization' => 'Bearer ' . $this->token])
            ->get("/api/v1/products/{$this->productId}/discount-eligibility");

        $response->assertStatus(200);
        $body = json_decode($response->getJSON(), true);
        $this->assertTrue($body['data']['senior_citizen']);
        // Neither was ever turned on for this category/product — both
        // stay at the not-eligible default.
        $this->assertFalse($body['data']['pwd']);
        $this->assertFalse($body['data']['regular']);
    }

    public function testUpdateCategoryDiscountEligibilityWritesASparseRow(): void
    {
        $response = $this->withHeaders(['Authorization' => 'Bearer ' . $this->token])
            ->withBodyFormat('json')
            ->put("/api/v1/categories/{$this->categoryId}/discount-eligibility", [
                'rules' => ['senior_citizen' => true, 'pwd' => true],
            ]);

        $response->assertStatus(200);

        $rows = model(CategoryDiscountEligibilityModel::class)->where('category_id', $this->categoryId)->findAll();
        $this->assertCount(2, $rows);

        // Setting one back to false (the default) deletes the row rather
        // than storing a redundant "eligible: false" one.
        $this->withHeaders(['Authorization' => 'Bearer ' . $this->token])
            ->withBodyFormat('json')
            ->put("/api/v1/categories/{$this->categoryId}/discount-eligibility", [
                'rules' => ['senior_citizen' => false],
            ]);

        $rows = model(CategoryDiscountEligibilityModel::class)->where('category_id', $this->categoryId)->findAll();
        $this->assertCount(1, $rows);
        $this->assertSame('pwd', $rows[0]->discount_type);
    }

    public function testUpdateProductDiscountEligibilityOverridesCategoryForOneProduct(): void
    {
        model(CategoryDiscountEligibilityModel::class)->insert([
            'category_id' => $this->categoryId,
            'discount_type' => 'senior_citizen',
            'eligible' => 0,
        ]);

        $response = $this->withHeaders(['Authorization' => 'Bearer ' . $this->token])
            ->withBodyFormat('json')
            ->put("/api/v1/products/{$this->productId}/discount-eligibility", [
                'rules' => ['senior_citizen' => true],
            ]);

        $response->assertStatus(200);
        $body = json_decode($response->getJSON(), true);
        $this->assertTrue($body['data']['senior_citizen']);
    }

    public function testBulkDiscountEligibilityAnswersForAWholeBasket(): void
    {
        // Stays at the not-eligible default for this product/type.
        // A second product, explicitly turned on directly (no category
        // at all, so only a product-level override could do it) — the
        // response has to distinguish the two.
        $otherProductId = (int) model(ProductModel::class)->insert([
            'company_id' => $this->companyId,
            'sku' => 'ETEST-SKU-2',
            'name' => 'Eligibility Test Rice',
            'track_inventory' => 0,
        ], true);
        model(ProductDiscountEligibilityModel::class)->insert([
            'product_id' => $otherProductId,
            'discount_type' => 'senior_citizen',
            'eligible' => 1,
        ]);

        $response = $this->withHeaders(['Authorization' => 'Bearer ' . $this->token])
            ->get("/api/v1/products/discount-eligibility?product_ids={$this->productId},{$otherProductId},999999");

        $response->assertStatus(200);
        $data = json_decode($response->getJSON(), true)['data'];

        $this->assertFalse($data[(string) $this->productId]['senior_citizen']);
        $this->assertTrue($data[(string) $otherProductId]['senior_citizen']);
        // An id the caller can't see is simply absent, never guessed at.
        $this->assertArrayNotHasKey('999999', $data);

        \Config\Database::connect()->table('product_discount_eligibility')->where('product_id', $otherProductId)->delete();
        \Config\Database::connect()->table('products')->where('id', $otherProductId)->delete();
    }

    public function testUpdateDiscountEligibilityRejectsUnknownType(): void
    {
        $response = $this->withHeaders(['Authorization' => 'Bearer ' . $this->token])
            ->withBodyFormat('json')
            ->put("/api/v1/categories/{$this->categoryId}/discount-eligibility", [
                'rules' => ['bogus' => false],
            ]);

        $response->assertStatus(422);
    }
}
