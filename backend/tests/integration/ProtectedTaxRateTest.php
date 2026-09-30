<?php

use App\Libraries\JwtService;
use App\Models\CompanyModel;
use App\Models\RoleModel;
use App\Models\TaxRateModel;
use App\Models\UserModel;
use CodeIgniter\Test\CIUnitTestCase;
use CodeIgniter\Test\DatabaseTestTrait;
use CodeIgniter\Test\FeatureTestTrait;

/**
 * The is_system flag on a tax rate (AddIsSystemToTaxRates) is meant to make
 * the standard rate for a regime genuinely undeletable — not just skipped
 * by "Reset configuration" (see SystemResetTest for that half), but also
 * refused through the ordinary Tax tab delete button. This is the other
 * half: DELETE /taxes/{id} itself has to say no on its own, or "can't be
 * removed" wouldn't actually be true.
 *
 * @internal
 */
final class ProtectedTaxRateTest extends CIUnitTestCase
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
        $this->companyId = (int) model(CompanyModel::class)->insert(['trade_name' => "Tax Protect Co {$suffix}"], true);

        $roleId = (int) model(RoleModel::class)->insert(['company_id' => $this->companyId, 'name' => 'Admin'], true);
        $userId = (int) model(UserModel::class)->insert([
            'company_id' => $this->companyId,
            'role_id' => $roleId,
            'name' => 'Tax Protect Tester',
            'email' => "taxprotect-{$suffix}@example.com",
            'username' => "taxprotect_{$suffix}",
            'password' => 'Password123!',
            'is_active' => 1,
        ], true);

        $this->token = (new JwtService())->issueAccessToken($userId, $this->companyId, $roleId, ['taxes.view', 'taxes.manage']);
    }

    protected function tearDown(): void
    {
        $db = \Config\Database::connect();
        $db->table('tax_rates')->where('company_id', $this->companyId)->delete();
        $db->table('users')->where('company_id', $this->companyId)->delete();
        $db->table('roles')->where('company_id', $this->companyId)->delete();
        $db->table('companies')->where('id', $this->companyId)->delete();

        parent::tearDown();
    }

    private function auth()
    {
        return $this->withHeaders(['Authorization' => "Bearer {$this->token}"]);
    }

    public function testCannotDeleteASystemDefaultTaxRate(): void
    {
        // Raw insert, not the model: is_system is deliberately absent from
        // TaxRateModel::$allowedFields (see testIsSystemCannotBeSetThrough...
        // below), so model()->insert() would silently drop it here too.
        $db = \Config\Database::connect();
        $db->table('tax_rates')->insert([
            'company_id' => $this->companyId,
            'name' => 'VAT',
            'tax_system' => 'vat',
            'rate' => 12,
            'is_default' => 1,
            'is_system' => 1,
            'is_active' => 1,
            'created_at' => date('Y-m-d H:i:s'),
            'updated_at' => date('Y-m-d H:i:s'),
        ]);
        $rateId = (int) $db->insertID();

        $this->auth()->delete("/api/v1/taxes/{$rateId}")->assertStatus(403);

        $this->assertNotNull(model(TaxRateModel::class)->find($rateId), 'A system default tax rate must survive an attempted delete.');
    }

    public function testCanStillDeleteAnOrdinaryTaxRate(): void
    {
        $rateId = (int) model(TaxRateModel::class)->insert([
            'company_id' => $this->companyId,
            'name' => 'Promo Rate',
            'tax_system' => 'vat',
            'rate' => 5,
            'is_default' => 0,
            'is_active' => 1,
        ], true);

        $this->auth()->delete("/api/v1/taxes/{$rateId}")->assertStatus(200);

        $this->assertNull(model(TaxRateModel::class)->find($rateId));
    }

    /**
     * is_system has no create/update field at all — a client sending it
     * anyway must be silently ignored, the same way company_id already is,
     * rather than let an admin protect (or unprotect) a rate by hand.
     */
    public function testIsSystemCannotBeSetThroughTheOrdinaryCreateEndpoint(): void
    {
        $response = $this->auth()->withBodyFormat('json')->post('/api/v1/taxes', [
            'name' => 'Should Not Be System',
            'rate' => 8,
            'is_system' => 1,
        ]);

        $response->assertStatus(201);
        $id = json_decode($response->getJSON(), true)['data']['id'];

        $row = model(TaxRateModel::class)->find($id);
        $this->assertSame(0, (int) $row->is_system);
    }
}
