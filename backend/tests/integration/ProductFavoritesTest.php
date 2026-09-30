<?php

use App\Libraries\JwtService;
use App\Models\CompanyModel;
use App\Models\ProductModel;
use App\Models\RoleModel;
use App\Models\StoreModel;
use App\Models\StoreProductPriceModel;
use App\Models\UserModel;
use CodeIgniter\Test\CIUnitTestCase;
use CodeIgniter\Test\DatabaseTestTrait;
use CodeIgniter\Test\FeatureTestTrait;

/**
 * A store's shared Favorites list — the POS pill fed by
 * GET /products?store_id=..&favorites=1, starred with
 * PUT /products/{id}/favorite.
 *
 * @internal
 */
final class ProductFavoritesTest extends CIUnitTestCase
{
    use DatabaseTestTrait;
    use FeatureTestTrait;

    protected $migrate = false;
    protected $refresh = false;
    protected $seed = '';

    private int $companyId;
    private int $roleId;
    private int $storeId;
    private int $otherStoreId;
    private int $userId;
    private string $token;

    /** @var array<string,int> product name => id */
    private array $products = [];

    protected function setUp(): void
    {
        parent::setUp();

        $suffix = bin2hex(random_bytes(4));
        $this->companyId = (int) model(CompanyModel::class)->insert(['trade_name' => "Favorites Co {$suffix}"], true);
        $this->roleId = (int) model(RoleModel::class)->insert(['company_id' => $this->companyId, 'name' => 'Favorites Tester'], true);

        $this->storeId = (int) model(StoreModel::class)->insert([
            'company_id' => $this->companyId, 'name' => 'Main Store', 'code' => "FV-{$suffix}-1",
        ], true);
        $this->otherStoreId = (int) model(StoreModel::class)->insert([
            'company_id' => $this->companyId, 'name' => 'Other Store', 'code' => "FV-{$suffix}-2",
        ], true);

        foreach (['Alpha Item', 'Bravo Item', 'Charlie Item'] as $i => $name) {
            $id = (int) model(ProductModel::class)->insert([
                'company_id' => $this->companyId, 'sku' => "FV-{$suffix}-{$i}", 'name' => $name, 'track_inventory' => 0,
            ], true);
            foreach ([$this->storeId, $this->otherStoreId] as $storeId) {
                model(StoreProductPriceModel::class)->insert([
                    'product_id' => $id, 'store_id' => $storeId, 'cost_price' => 5.00, 'selling_price' => 10.00,
                ]);
            }
            $this->products[$name] = $id;
        }

        $this->userId = (int) model(UserModel::class)->insert([
            'company_id' => $this->companyId,
            'role_id' => $this->roleId,
            'name' => 'Favorites Tester',
            'email' => "favorites-{$suffix}@example.com",
            'username' => "favorites_{$suffix}",
            'password' => 'Password123!',
            'is_active' => 1,
        ], true);

        $this->token = $this->tokenWith(['products.view', 'products.update']);
    }

    protected function tearDown(): void
    {
        $db = \Config\Database::connect();
        $db->table('user_stores')->where('user_id', $this->userId)->delete();
        $db->table('store_product_favorites')->whereIn('store_id', [$this->storeId, $this->otherStoreId])->delete();
        $db->table('store_product_prices')->whereIn('store_id', [$this->storeId, $this->otherStoreId])->delete();
        $db->table('products')->where('company_id', $this->companyId)->delete();
        $db->table('stores')->where('company_id', $this->companyId)->delete();
        $db->table('users')->where('company_id', $this->companyId)->delete();
        $db->table('roles')->where('company_id', $this->companyId)->delete();
        $db->table('companies')->where('id', $this->companyId)->delete();

        parent::tearDown();
    }

    /** @param string[] $permissions */
    private function tokenWith(array $permissions): string
    {
        return (new JwtService())->issueAccessToken($this->userId, $this->companyId, $this->roleId, $permissions);
    }

    private function auth(?string $token = null)
    {
        return $this->withHeaders(['Authorization' => 'Bearer ' . ($token ?? $this->token)]);
    }

    private function star(string $productName, int $storeId, int $isFavorite = 1, ?string $token = null)
    {
        return $this->auth($token)->withBodyFormat('json')
            ->put("/api/v1/products/{$this->products[$productName]}/favorite", ['store_id' => $storeId, 'is_favorite' => $isFavorite]);
    }

    /** @return string[] */
    private function favoriteNames(int $storeId): array
    {
        $response = $this->auth()->get("/api/v1/products?store_id={$storeId}&favorites=1&per_page=50");
        $response->assertStatus(200);

        return array_column(json_decode($response->getJSON(), true)['data'], 'name');
    }

    public function testStarredProductsAppearInThatStoresFavoritesOnly(): void
    {
        $this->star('Charlie Item', $this->storeId)->assertStatus(200);
        $this->star('Alpha Item', $this->storeId)->assertStatus(200);
        $this->star('Bravo Item', $this->otherStoreId)->assertStatus(200);

        // Alphabetical, and scoped to the store that starred them.
        $this->assertSame(['Alpha Item', 'Charlie Item'], $this->favoriteNames($this->storeId));
        $this->assertSame(['Bravo Item'], $this->favoriteNames($this->otherStoreId));
    }

    public function testUnstarRemovesItAndStarringTwiceIsHarmless(): void
    {
        $this->star('Alpha Item', $this->storeId)->assertStatus(200);
        $this->star('Alpha Item', $this->storeId)->assertStatus(200);
        $this->assertSame(['Alpha Item'], $this->favoriteNames($this->storeId));

        $count = \Config\Database::connect()->table('store_product_favorites')
            ->where('store_id', $this->storeId)->where('product_id', $this->products['Alpha Item'])->countAllResults();
        $this->assertSame(1, $count, 'Starring twice must not create a duplicate row.');

        $this->star('Alpha Item', $this->storeId, 0)->assertStatus(200);
        $this->star('Alpha Item', $this->storeId, 0)->assertStatus(200);
        $this->assertSame([], $this->favoriteNames($this->storeId));
    }

    public function testPricesEndpointReportsEachStoresStar(): void
    {
        $this->star('Alpha Item', $this->otherStoreId)->assertStatus(200);

        $response = $this->auth()->get("/api/v1/products/{$this->products['Alpha Item']}/prices");
        $response->assertStatus(200);
        $byStore = [];
        foreach (json_decode($response->getJSON(), true)['data'] as $row) {
            $byStore[$row['store_id']] = $row['is_favorite'];
        }

        $this->assertFalse($byStore[$this->storeId]);
        $this->assertTrue($byStore[$this->otherStoreId]);
    }

    public function testOnlyProductEditorsCanStar(): void
    {
        $viewOnly = $this->tokenWith(['products.view']);

        $this->star('Alpha Item', $this->storeId, 1, $viewOnly)->assertStatus(403);
        $this->assertSame([], $this->favoriteNames($this->storeId));
    }

    public function testCannotStarForAStoreOutsideTheCompany(): void
    {
        $foreign = (int) model(CompanyModel::class)->insert(['trade_name' => 'Foreign Co ' . bin2hex(random_bytes(3))], true);
        $foreignStore = (int) model(StoreModel::class)->insert([
            'company_id' => $foreign, 'name' => 'Foreign Store', 'code' => 'FX-' . bin2hex(random_bytes(3)),
        ], true);

        try {
            $this->star('Alpha Item', $foreignStore)->assertStatus(422);
        } finally {
            $db = \Config\Database::connect();
            $db->table('store_product_favorites')->where('store_id', $foreignStore)->delete();
            $db->table('stores')->where('id', $foreignStore)->delete();
            $db->table('companies')->where('id', $foreign)->delete();
        }
    }

    public function testStorePinnedUserCannotStarForAnotherStore(): void
    {
        \Config\Database::connect()->table('user_stores')->insert(['user_id' => $this->userId, 'store_id' => $this->storeId]);

        $this->star('Alpha Item', $this->otherStoreId)->assertStatus(403);
        $this->star('Alpha Item', $this->storeId)->assertStatus(200);
        $this->assertSame(['Alpha Item'], $this->favoriteNames($this->storeId));
    }

    public function testDeletingAProductRemovesItsStars(): void
    {
        $this->star('Alpha Item', $this->storeId)->assertStatus(200);
        \Config\Database::connect()->table('store_product_prices')->where('product_id', $this->products['Alpha Item'])->delete();
        \Config\Database::connect()->table('products')->where('id', $this->products['Alpha Item'])->delete();

        $left = \Config\Database::connect()->table('store_product_favorites')
            ->where('product_id', $this->products['Alpha Item'])->countAllResults();
        $this->assertSame(0, $left, 'The foreign key must cascade so a deleted product leaves no orphaned favourite.');
    }
}
