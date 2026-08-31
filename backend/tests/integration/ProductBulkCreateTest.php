<?php

use App\Libraries\JwtService;
use App\Models\CompanyModel;
use App\Models\ProductModel;
use App\Models\RoleModel;
use App\Models\TaxRateModel;
use App\Models\UserModel;
use CodeIgniter\Test\CIUnitTestCase;
use CodeIgniter\Test\DatabaseTestTrait;
use CodeIgniter\Test\FeatureTestTrait;

/**
 * POST /api/v1/products/bulk, exercised through the real HTTP route
 * (JwtAuthFilter + PermissionFilter both run for real).
 *
 * Locks in the behavior manually verified during the Add New Products
 * (Bulk Add / CSV Import) session work:
 *  - a duplicate barcode within the same request fails only that row,
 *    the rest of the batch still lands (best-effort, not all-or-nothing);
 *  - two blank barcodes in the same batch don't collide (NULL barcodes
 *    aren't unique-constrained against each other);
 *  - the same barcode reused by a different company is allowed (barcode
 *    uniqueness is scoped to company_id, not global);
 *  - track_inventory and tax_rate_id are persisted per row exactly as
 *    sent, not silently defaulted server-side — the UI is what decides
 *    the default, the API just stores what it's given.
 *
 * @internal
 */
final class ProductBulkCreateTest extends CIUnitTestCase
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
        $this->companyId = (int) model(CompanyModel::class)->insert(['trade_name' => "Bulk Create Co {$suffix}"], true);

        $roleId = (int) model(RoleModel::class)->insert(['company_id' => $this->companyId, 'name' => 'Company Admin'], true);
        $userId = (int) model(UserModel::class)->insert([
            'company_id' => $this->companyId,
            'role_id' => $roleId,
            'name' => 'Bulk Tester',
            'email' => "bulktester-{$suffix}@example.com",
            'username' => "bulktester_{$suffix}",
            'password' => 'Password123!',
            'is_active' => 1,
        ], true);

        $jwt = new JwtService();
        $this->token = $jwt->issueAccessToken($userId, $this->companyId, $roleId, ['products.create']);
    }

    protected function tearDown(): void
    {
        $db = \Config\Database::connect();
        $db->table('products')->where('company_id', $this->companyId)->delete();
        $db->table('tax_rates')->where('company_id', $this->companyId)->delete();
        $db->table('users')->where('company_id', $this->companyId)->delete();
        $db->table('roles')->where('company_id', $this->companyId)->delete();
        $db->table('companies')->where('id', $this->companyId)->delete();

        parent::tearDown();
    }

    private function bulkCreate(array $rows)
    {
        return $this->withHeaders(['Authorization' => "Bearer {$this->token}"])
            ->withBodyFormat('json')
            ->post('/api/v1/products/bulk', ['products' => $rows]);
    }

    public function testDuplicateBarcodeWithinSameBatchFailsOnlyThatRow(): void
    {
        $suffix = bin2hex(random_bytes(4));
        $sharedBarcode = "DUPBAR-{$suffix}";

        $response = $this->bulkCreate([
            ['sku' => "SKU-A-{$suffix}", 'name' => 'Product A', 'barcode' => $sharedBarcode],
            ['sku' => "SKU-B-{$suffix}", 'name' => 'Product B', 'barcode' => $sharedBarcode],
        ]);

        $response->assertStatus(200);
        $body = json_decode($response->getJSON(), true)['data'];

        $this->assertSame(1, $body['created']);
        $this->assertSame(1, $body['failed']);
        $this->assertTrue($body['results'][0]['success']);
        $this->assertFalse($body['results'][1]['success']);
        $this->assertStringContainsString('barcode', strtolower($body['results'][1]['error']));

        $this->assertSame(1, model(ProductModel::class)->where('company_id', $this->companyId)->where('barcode', $sharedBarcode)->countAllResults());
    }

    public function testBlankBarcodesInSameBatchDoNotCollide(): void
    {
        $suffix = bin2hex(random_bytes(4));

        // The Bulk Add grid / CSV import always convert an empty barcode
        // field to `null` before sending (AddProductsScreen.tsx: `r.barcode
        // || null`), never an empty string — a NULL is exempt from the
        // (company_id, barcode) unique index, an empty string is NOT (it's
        // just another value, and two rows with barcode: '' would collide
        // the same as two rows sharing a real barcode). This test mirrors
        // the payload shape the real client actually sends.
        $response = $this->bulkCreate([
            ['sku' => "SKU-C-{$suffix}", 'name' => 'Product C', 'barcode' => null],
            ['sku' => "SKU-D-{$suffix}", 'name' => 'Product D', 'barcode' => null],
        ]);

        $response->assertStatus(200);
        $body = json_decode($response->getJSON(), true)['data'];

        $this->assertSame(2, $body['created']);
        $this->assertSame(0, $body['failed']);
    }

    public function testSameBarcodeAllowedAcrossDifferentCompanies(): void
    {
        $suffix = bin2hex(random_bytes(4));
        $barcode = "CROSSCO-{$suffix}";

        $otherCompanyId = (int) model(CompanyModel::class)->insert(['trade_name' => "Other Co {$suffix}"], true);
        model(ProductModel::class)->insert([
            'company_id' => $otherCompanyId,
            'sku' => "OTHER-SKU-{$suffix}",
            'name' => 'Other Co Product',
            'barcode' => $barcode,
        ]);

        $response = $this->bulkCreate([
            ['sku' => "SKU-E-{$suffix}", 'name' => 'Product E', 'barcode' => $barcode],
        ]);

        $response->assertStatus(200);
        $body = json_decode($response->getJSON(), true)['data'];
        $this->assertSame(1, $body['created']);

        \Config\Database::connect()->table('products')->where('company_id', $otherCompanyId)->delete();
        \Config\Database::connect()->table('companies')->where('id', $otherCompanyId)->delete();
    }

    public function testTrackInventoryPersistedPerRowExactlyAsSent(): void
    {
        $suffix = bin2hex(random_bytes(4));

        $response = $this->bulkCreate([
            ['sku' => "SKU-F-{$suffix}", 'name' => 'Tracked Product', 'track_inventory' => 1],
            ['sku' => "SKU-G-{$suffix}", 'name' => 'Untracked Product', 'track_inventory' => 0],
        ]);

        $response->assertStatus(200);
        $body = json_decode($response->getJSON(), true)['data'];
        $this->assertSame(2, $body['created']);

        $tracked = model(ProductModel::class)->where('company_id', $this->companyId)->where('sku', "SKU-F-{$suffix}")->first();
        $untracked = model(ProductModel::class)->where('company_id', $this->companyId)->where('sku', "SKU-G-{$suffix}")->first();

        $this->assertSame(1, (int) $tracked->track_inventory);
        $this->assertSame(0, (int) $untracked->track_inventory);
    }

    public function testTrackInventoryDefaultsToOnWhenOmitted(): void
    {
        $suffix = bin2hex(random_bytes(4));

        $response = $this->bulkCreate([
            ['sku' => "SKU-H-{$suffix}", 'name' => 'No Flag Sent'],
        ]);

        $response->assertStatus(200);
        $product = model(ProductModel::class)->where('company_id', $this->companyId)->where('sku', "SKU-H-{$suffix}")->first();
        $this->assertSame(1, (int) $product->track_inventory);
    }

    public function testTaxRateIdPersistedPerRowWhenProvided(): void
    {
        $suffix = bin2hex(random_bytes(4));
        $taxRateId = (int) model(TaxRateModel::class)->insert([
            'company_id' => $this->companyId,
            'name' => "VAT {$suffix}",
            'rate' => 12,
            'is_default' => 1,
            'is_active' => 1,
        ], true);

        $response = $this->bulkCreate([
            ['sku' => "SKU-I-{$suffix}", 'name' => 'Taxed Product', 'tax_rate_id' => $taxRateId],
        ]);

        $response->assertStatus(200);
        $product = model(ProductModel::class)->where('company_id', $this->companyId)->where('sku', "SKU-I-{$suffix}")->first();
        $this->assertSame($taxRateId, (int) $product->tax_rate_id);
    }

    public function testDuplicateSkuWithinSameBatchFailsOnlyThatRow(): void
    {
        $suffix = bin2hex(random_bytes(4));
        $sharedSku = "DUPSKU-{$suffix}";

        $response = $this->bulkCreate([
            ['sku' => $sharedSku, 'name' => 'First'],
            ['sku' => $sharedSku, 'name' => 'Second'],
        ]);

        $response->assertStatus(200);
        $body = json_decode($response->getJSON(), true)['data'];

        $this->assertSame(1, $body['created']);
        $this->assertSame(1, $body['failed']);
        $this->assertFalse($body['results'][1]['success']);
        $this->assertStringContainsString('sku', strtolower($body['results'][1]['error']));
    }
}
