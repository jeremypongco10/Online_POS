<?php

use App\Libraries\JwtService;
use App\Models\CompanyModel;
use App\Models\InvoiceSeriesModel;
use App\Models\PaymentMethodModel;
use App\Models\PaymentModel;
use App\Models\ProductModel;
use App\Models\RegisterModel;
use App\Models\RoleModel;
use App\Models\StoreModel;
use App\Models\StoreProductPriceModel;
use App\Models\UserModel;
use CodeIgniter\Test\CIUnitTestCase;
use CodeIgniter\Test\DatabaseTestTrait;
use CodeIgniter\Test\FeatureTestTrait;

/**
 * The business logo: uploaded via POST /companies/{id}/logo, shown on the
 * Business Information card, and carried on every receipt as both
 * `logo_path` (the browser/window.print() path) and pre-converted
 * `logo_escpos` raster bytes (the Bluetooth thermal-printer path — see
 * EscPosImageService, unit-tested on its own for the actual byte math).
 *
 * The upload endpoint's own success path (a real multipart POST) isn't
 * exercised here — this test suite has no existing convention for
 * simulating a file upload through FeatureTestTrait, the same gap
 * ProductsController::uploadImage already has zero coverage for. What's
 * tested instead: the endpoint's validation/permission guards (which need
 * no real file), and the receipt wiring once a logo already exists — set
 * directly via the model with a real fixture image on disk, the same way
 * `image_path`-style fixtures are already set up elsewhere in this suite.
 *
 * @internal
 */
final class CompanyLogoTest extends CIUnitTestCase
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
    private ?string $logoAbsolutePath = null;

    protected function setUp(): void
    {
        parent::setUp();

        $suffix = bin2hex(random_bytes(4));
        $this->companyId = (int) model(CompanyModel::class)->insert(['trade_name' => "Logo Co {$suffix}"], true);
        $role = (int) model(RoleModel::class)->insert(['company_id' => $this->companyId, 'name' => 'Logo Tester'], true);

        $this->storeId = (int) model(StoreModel::class)->insert([
            'company_id' => $this->companyId, 'name' => 'Logo Store', 'code' => "LG-{$suffix}",
        ], true);
        $this->registerId = (int) model(RegisterModel::class)->insert([
            'store_id' => $this->storeId, 'name' => 'Logo Register', 'code' => "LGREG-{$suffix}",
        ], true);

        model(PaymentMethodModel::class)->insert(['company_id' => $this->companyId, 'name' => 'Cash', 'code' => PaymentModel::METHOD_CASH]);
        model(InvoiceSeriesModel::class)->insert([
            'company_id' => $this->companyId,
            'store_id' => $this->storeId,
            'invoice_type' => 'Sales Invoice',
            'series_code' => 'LG',
            'prefix' => 'SI-',
            'starting_number' => 1,
            'current_number' => 0,
            'maximum_number' => 99999999,
            'number_length' => 8,
            'effective_from' => date('Y-m-d'),
            'status' => 'active',
        ]);

        $this->productId = (int) model(ProductModel::class)->insert([
            'company_id' => $this->companyId, 'sku' => "LG-{$suffix}", 'name' => 'Logo Test Widget', 'track_inventory' => 0,
        ], true);
        model(StoreProductPriceModel::class)->insert([
            'product_id' => $this->productId, 'store_id' => $this->storeId, 'cost_price' => 5.00, 'selling_price' => 10.00,
        ]);

        $this->userId = (int) model(UserModel::class)->insert([
            'company_id' => $this->companyId,
            'role_id' => $role,
            'name' => 'Logo Tester',
            'email' => "logo-{$suffix}@example.com",
            'username' => "logo_{$suffix}",
            'password' => 'Password123!',
            'is_active' => 1,
        ], true);

        $this->token = (new JwtService())->issueAccessToken($this->userId, $this->companyId, $role, [
            'companies.manage', 'companies.view', 'sales.create', 'sales.view',
        ]);
    }

    protected function tearDown(): void
    {
        if ($this->logoAbsolutePath && is_file($this->logoAbsolutePath)) {
            unlink($this->logoAbsolutePath);
        }

        $db = \Config\Database::connect();
        $saleIds = $db->table('sales')->where('company_id', $this->companyId)->get()->getResultArray();
        $saleIds = array_column($saleIds, 'id');
        if ($saleIds !== []) {
            $db->table('payments')->whereIn('sale_id', $saleIds)->delete();
            $db->table('sale_items')->whereIn('sale_id', $saleIds)->delete();
            $db->table('sales')->whereIn('id', $saleIds)->delete();
        }
        $db->table('transaction_counters')->where('register_id', $this->registerId)->delete();
        $db->table('cash_sessions')->where('register_id', $this->registerId)->delete();
        $db->table('store_product_prices')->where('store_id', $this->storeId)->delete();
        $db->table('invoice_series')->where('company_id', $this->companyId)->delete();
        $db->table('registers')->where('store_id', $this->storeId)->delete();
        $db->table('products')->where('company_id', $this->companyId)->delete();
        $db->table('stores')->where('company_id', $this->companyId)->delete();
        $db->table('payment_methods')->where('company_id', $this->companyId)->delete();
        $db->table('users')->where('company_id', $this->companyId)->delete();
        $db->table('roles')->where('company_id', $this->companyId)->delete();
        $db->table('companies')->where('id', $this->companyId)->delete();

        parent::tearDown();
    }

    private function auth()
    {
        return $this->withHeaders(['Authorization' => 'Bearer ' . $this->token]);
    }

    /** Gives this company a real logo file on disk and points logo_path at it, without going through the HTTP upload endpoint (see class docblock). */
    private function giveCompanyALogo(): void
    {
        $dir = FCPATH . 'uploads/companies/';
        if (! is_dir($dir)) {
            mkdir($dir, 0755, true);
        }
        $name = $this->companyId . '_test' . bin2hex(random_bytes(4)) . '.png';
        $this->logoAbsolutePath = $dir . $name;

        $img = imagecreatetruecolor(8, 8);
        imagefill($img, 0, 0, imagecolorallocate($img, 0, 0, 0));
        imagepng($img, $this->logoAbsolutePath);
        imagedestroy($img);

        model(CompanyModel::class)->update($this->companyId, ['logo_path' => 'uploads/companies/' . $name]);
    }

    private function ringUpASale(): int
    {
        $response = $this->auth()->withBodyFormat('json')->post('/api/v1/sales', [
            'company_id' => $this->companyId,
            'store_id' => $this->storeId,
            'register_id' => $this->registerId,
            'items' => [['product_id' => $this->productId, 'quantity' => 1, 'unit_price' => 10.00]],
            'payments' => [['method' => 'cash', 'amount' => 10.00]],
        ]);
        $response->assertStatus(201);

        return (int) json_decode($response->getJSON(), true)['data']['id'];
    }

    public function testReceiptCarriesNoLogoFieldsWhenNoneIsSet(): void
    {
        $saleId = $this->ringUpASale();

        $response = $this->auth()->get("/api/v1/sales/{$saleId}/receipt");
        $response->assertStatus(200);
        $company = json_decode($response->getJSON(), true)['data']['company'];

        $this->assertNull($company['logo_path']);
        $this->assertNull($company['logo_escpos']);
    }

    public function testReceiptCarriesTheLogoPathAndPreConvertedRasterBytes(): void
    {
        $this->giveCompanyALogo();
        $saleId = $this->ringUpASale();

        $response = $this->auth()->get("/api/v1/sales/{$saleId}/receipt");
        $response->assertStatus(200);
        $company = json_decode($response->getJSON(), true)['data']['company'];

        $this->assertSame('uploads/companies/' . basename($this->logoAbsolutePath), $company['logo_path']);
        $this->assertNotNull($company['logo_escpos']);
        // Always the full printer width (384) — see EscPosImageService's
        // own docblock and test suite for why (centering a narrower logo
        // has to be baked into the pixels, not left to the printer) and
        // for the exact byte-level math this class's own tests cover in
        // detail. This test's job is only the wiring: the field is
        // present, non-empty, and internally consistent.
        $this->assertSame(384, $company['logo_escpos']['width']);
        $this->assertSame(8, $company['logo_escpos']['height']);

        $bytes = base64_decode($company['logo_escpos']['bytes_base64']);
        $bytesPerRow = (int) ceil(384 / 8);
        $this->assertSame($bytesPerRow * 8, strlen($bytes));
        $this->assertNotSame(str_repeat("\x00", strlen($bytes)), $bytes, 'A solid black logo must draw at least some black pixels somewhere on the canvas.');
    }

    public function testLogoIsReadLiveNotFrozenAtCheckoutTime(): void
    {
        $saleId = $this->ringUpASale();
        // No logo yet at checkout — added to the company AFTER the sale.
        $this->giveCompanyALogo();

        $response = $this->auth()->get("/api/v1/sales/{$saleId}/receipt");
        $company = json_decode($response->getJSON(), true)['data']['company'];

        $this->assertNotNull($company['logo_path'], 'A reprint should show the logo the business has NOW, not the one (or lack of one) at checkout.');
    }

    public function testUploadRefusesWithNoFile(): void
    {
        $this->auth()->withBodyFormat('json')->post("/api/v1/companies/{$this->companyId}/logo", [])
            ->assertStatus(422);
    }

    public function testUploadAndDeleteAreGatedOnCompaniesManage(): void
    {
        $viewOnly = (new JwtService())->issueAccessToken($this->userId, $this->companyId, 0, ['companies.view']);
        $this->withHeaders(['Authorization' => 'Bearer ' . $viewOnly])
            ->withBodyFormat('json')->post("/api/v1/companies/{$this->companyId}/logo", [])
            ->assertStatus(403);
        $this->withHeaders(['Authorization' => 'Bearer ' . $viewOnly])
            ->delete("/api/v1/companies/{$this->companyId}/logo")
            ->assertStatus(403);
    }

    public function testDeleteRemovesTheFileAndClearsThePath(): void
    {
        $this->giveCompanyALogo();
        $this->assertTrue(is_file($this->logoAbsolutePath));

        $response = $this->auth()->delete("/api/v1/companies/{$this->companyId}/logo");
        $response->assertStatus(200);

        $this->assertFalse(is_file($this->logoAbsolutePath));
        $this->assertNull(model(CompanyModel::class)->find($this->companyId)->logo_path);

        // The receipt endpoint immediately reflects it — no leftover
        // reference to a file that's now gone.
        $saleId = $this->ringUpASale();
        $company = json_decode($this->auth()->get("/api/v1/sales/{$saleId}/receipt")->getJSON(), true)['data']['company'];
        $this->assertNull($company['logo_path']);
        $this->assertNull($company['logo_escpos']);
    }

    public function testDeleteWithNoLogoSetIsAHarmlessNoOp(): void
    {
        $this->auth()->delete("/api/v1/companies/{$this->companyId}/logo")->assertStatus(200);
    }
}
