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
 * The POS's "Top Sellers" shortcut: GET /products?store_id=..&popular=1.
 *
 * Ranked by how many separate SALES included a product — not by units — and
 * limited to what genuinely counts as a sale at this store recently. Each
 * exclusion below is a way a naive "count everything in sale_items" would
 * quietly put the wrong products on the till's front page.
 *
 * @internal
 */
final class TopSellersTest extends CIUnitTestCase
{
    use DatabaseTestTrait;
    use FeatureTestTrait;

    protected $migrate = false;
    protected $refresh = false;
    protected $seed = '';

    private int $companyId;
    private int $storeId;
    private int $otherStoreId;
    private int $registerId;
    private int $userId;
    private string $token;

    /** @var array<string,int> product name => id */
    private array $products = [];

    protected function setUp(): void
    {
        parent::setUp();

        $suffix = bin2hex(random_bytes(4));
        $this->companyId = (int) model(CompanyModel::class)->insert(['trade_name' => "Top Sellers Co {$suffix}"], true);
        $role = (int) model(RoleModel::class)->insert(['company_id' => $this->companyId, 'name' => 'Top Sellers Tester'], true);

        $this->storeId = (int) model(StoreModel::class)->insert([
            'company_id' => $this->companyId, 'name' => 'Main Store', 'code' => "TS-{$suffix}-1",
        ], true);
        $this->otherStoreId = (int) model(StoreModel::class)->insert([
            'company_id' => $this->companyId, 'name' => 'Other Store', 'code' => "TS-{$suffix}-2",
        ], true);
        $this->registerId = (int) model(RegisterModel::class)->insert([
            'store_id' => $this->storeId, 'name' => 'Top Sellers Register', 'code' => "TSREG-{$suffix}",
        ], true);

        model(PaymentMethodModel::class)->insert(['company_id' => $this->companyId, 'name' => 'Cash', 'code' => PaymentModel::METHOD_CASH]);
        model(InvoiceSeriesModel::class)->insert([
            'company_id' => $this->companyId,
            'store_id' => $this->storeId,
            'invoice_type' => 'Sales Invoice',
            'series_code' => 'TS',
            'prefix' => 'SI-',
            'starting_number' => 1,
            'current_number' => 0,
            'maximum_number' => 99999999,
            'number_length' => 8,
            'effective_from' => date('Y-m-d'),
            'status' => 'active',
        ]);

        foreach (['Popular A', 'Popular B', 'Only Voided C', 'Never Sold D'] as $i => $name) {
            $id = (int) model(ProductModel::class)->insert([
                'company_id' => $this->companyId,
                'sku' => "TS-{$suffix}-{$i}",
                'name' => $name,
                'track_inventory' => 0,
            ], true);
            model(StoreProductPriceModel::class)->insert([
                'product_id' => $id, 'store_id' => $this->storeId, 'cost_price' => 5.00, 'selling_price' => 10.00,
            ]);
            $this->products[$name] = $id;
        }

        $this->userId = (int) model(UserModel::class)->insert([
            'company_id' => $this->companyId,
            'role_id' => $role,
            'name' => 'Top Sellers Tester',
            'email' => "topsellers-{$suffix}@example.com",
            'username' => "topsellers_{$suffix}",
            'password' => 'Password123!',
            'is_active' => 1,
        ], true);

        $this->token = (new JwtService())->issueAccessToken(
            $this->userId,
            $this->companyId,
            $role,
            ['products.view', 'sales.create', 'sales.view']
        );
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

        $db->table('transaction_counters')->where('register_id', $this->registerId)->delete();
        $db->table('cash_sessions')->where('register_id', $this->registerId)->delete();
        $db->table('store_product_prices')->whereIn('store_id', [$this->storeId, $this->otherStoreId])->delete();
        $db->table('invoice_series')->where('company_id', $this->companyId)->delete();
        $db->table('registers')->where('store_id', $this->storeId)->delete();
        $db->table('stores')->where('company_id', $this->companyId)->delete();
        $db->table('products')->where('company_id', $this->companyId)->delete();
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

    /** Rings up one sale of a single product through the real endpoint and returns the new sale's id. */
    private function sell(string $productName, float $quantity = 1): int
    {
        $response = $this->auth()->withBodyFormat('json')->post('/api/v1/sales', [
            'company_id' => $this->companyId,
            'store_id' => $this->storeId,
            'register_id' => $this->registerId,
            'items' => [['product_id' => $this->products[$productName], 'quantity' => $quantity, 'unit_price' => 10.00]],
            'payments' => [['method' => 'cash', 'amount' => 10.00 * $quantity + 100]],
        ]);
        $response->assertStatus(201);

        return (int) json_decode($response->getJSON(), true)['data']['id'];
    }

    /** @return string[] product names, in the order the endpoint returned them */
    private function popularNames(string $extraQuery = ''): array
    {
        $response = $this->auth()->get("/api/v1/products?store_id={$this->storeId}&popular=1&per_page=50{$extraQuery}");
        $response->assertStatus(200);

        return array_column(json_decode($response->getJSON(), true)['data'], 'name');
    }

    public function testRanksBySalesNotUnitsAndLeavesOutWhatDoesNotCount(): void
    {
        // A: three separate sales of one unit each. B: one sale of ten units.
        // By units B wins (10 vs 3); by sales A wins (3 vs 1) — which is the
        // ranking this feature promises.
        $this->sell('Popular A');
        $this->sell('Popular A');
        $this->sell('Popular A');
        $this->sell('Popular B', 10);

        $db = \Config\Database::connect();

        // C is only ever sold in sales that must not count.
        $voided = $this->sell('Only Voided C');
        $training = $this->sell('Only Voided C');
        $tooOld = $this->sell('Only Voided C');
        $db->table('sales')->where('id', $voided)->update(['status' => 'voided']);
        $db->table('sales')->where('id', $training)->update(['is_training' => 1]);
        $db->table('sales')->where('id', $tooOld)->update(['sale_date' => date('Y-m-d H:i:s', strtotime('-45 days'))]);

        // D sells well — but at the OTHER store, so it isn't a top seller here.
        $elsewhere = $this->sell('Never Sold D');
        $db->table('sales')->where('id', $elsewhere)->update(['store_id' => $this->otherStoreId]);

        $this->assertSame(['Popular A', 'Popular B'], $this->popularNames());
    }

    public function testSearchNarrowsWithinTheTopSellersRatherThanReplacingThem(): void
    {
        $this->sell('Popular A');
        $this->sell('Popular B');

        $this->assertSame(['Popular B'], $this->popularNames('&q=Popular%20B'));
        // A term that matches an unsold product finds nothing, rather than
        // falling back to the whole catalogue.
        $this->assertSame([], $this->popularNames('&q=Never%20Sold'));
    }

    public function testListIsUnchangedWithoutThePopularFlag(): void
    {
        $this->sell('Popular A');

        $response = $this->auth()->get("/api/v1/products?store_id={$this->storeId}&per_page=50");
        $response->assertStatus(200);
        $names = array_column(json_decode($response->getJSON(), true)['data'], 'name');

        sort($names);
        $this->assertSame(['Never Sold D', 'Only Voided C', 'Popular A', 'Popular B'], $names);
    }
}
