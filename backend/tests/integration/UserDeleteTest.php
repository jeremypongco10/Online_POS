<?php

use App\Libraries\JwtService;
use App\Models\ChatConversationModel;
use App\Models\ChatMessageModel;
use App\Models\CompanyModel;
use App\Models\RegisterModel;
use App\Models\RoleModel;
use App\Models\StoreModel;
use App\Models\UserModel;
use CodeIgniter\Test\CIUnitTestCase;
use CodeIgniter\Test\DatabaseTestTrait;
use CodeIgniter\Test\FeatureTestTrait;

/**
 * DELETE /api/v1/users/{id} — the one genuine, permanent delete anywhere
 * in this app for a user account (every other removal path is
 * deactivate()). Gated on users.delete, a permission granted to no role
 * by default (see AddUsersDeletePermission) — this test's own fixture
 * role has to be given it explicitly, the same way a real install's
 * dev/test-cleanup role would be.
 *
 * Covers: the permission gate itself, self-delete being refused, a
 * "clean" account (no history) actually being removed from the database,
 * and — the core of the feature — an account WITH real history (a sale,
 * a cash session, a chat message, a group membership) being blocked with
 * a specific reason instead of silently cascading that history away (see
 * FixUsersForeignKeyDeleteRules for the schema-level bug this and the
 * database's own FK RESTRICT both guard against).
 *
 * @internal
 */
final class UserDeleteTest extends CIUnitTestCase
{
    use DatabaseTestTrait;
    use FeatureTestTrait;

    protected $migrate = false;
    protected $refresh = false;
    protected $seed = '';

    private int $companyId;
    private int $roleId;
    private int $callerId;
    private string $callerToken;

    protected function setUp(): void
    {
        parent::setUp();

        $suffix = bin2hex(random_bytes(4));
        $this->companyId = (int) model(CompanyModel::class)->insert(['trade_name' => "User Delete Test Co {$suffix}"], true);
        $this->roleId = (int) model(RoleModel::class)->insert(['company_id' => $this->companyId, 'name' => 'Test Dev Admin', 'is_system' => 0], true);

        $usersDeleteId = \Config\Database::connect()->table('permissions')->where('slug', 'users.delete')->get()->getFirstRow()->id;
        \Config\Database::connect()->table('role_permissions')->insert(['role_id' => $this->roleId, 'permission_id' => $usersDeleteId]);

        $this->callerId = $this->makeUser($suffix, 'caller');
        $this->callerToken = (new JwtService())->issueAccessToken(
            $this->callerId,
            $this->companyId,
            $this->roleId,
            ['users.view', 'users.delete']
        );
    }

    protected function tearDown(): void
    {
        $db = \Config\Database::connect();
        $db->table('chat_messages')->where('company_id', $this->companyId)->delete();
        $conversationIds = $db->table('chat_conversations')->select('id')->where('company_id', $this->companyId)->get()->getResultArray();
        if ($conversationIds !== []) {
            $db->table('chat_conversation_participants')->whereIn('conversation_id', array_column($conversationIds, 'id'))->delete();
        }
        $db->table('chat_conversations')->where('company_id', $this->companyId)->delete();

        $storeIds = array_column($db->table('stores')->select('id')->where('company_id', $this->companyId)->get()->getResultArray(), 'id');
        $registerIds = $storeIds === [] ? [] : array_column($db->table('registers')->select('id')->whereIn('store_id', $storeIds)->get()->getResultArray(), 'id');
        if ($registerIds !== []) {
            $db->table('cash_sessions')->whereIn('register_id', $registerIds)->delete();
            $db->table('registers')->whereIn('id', $registerIds)->delete();
        }
        $db->table('stores')->where('company_id', $this->companyId)->delete();
        $db->table('audit_logs')->where('company_id', $this->companyId)->delete();
        $db->table('users')->where('company_id', $this->companyId)->delete();
        $db->table('roles')->where('company_id', $this->companyId)->delete();
        $db->table('companies')->where('id', $this->companyId)->delete();

        parent::tearDown();
    }

    private function makeUser(string $suffix, string $tag): int
    {
        return (int) model(UserModel::class)->insert([
            'company_id' => $this->companyId,
            'role_id' => $this->roleId,
            'name' => "Delete Test {$tag}",
            'email' => "udt-{$tag}-{$suffix}@example.com",
            'username' => "udt_{$tag}_{$suffix}",
            'password' => 'Password123!',
            'is_active' => 1,
        ], true);
    }

    private function auth(string $token)
    {
        return $this->withHeaders(['Authorization' => 'Bearer ' . $token]);
    }

    public function testDeletingAUserWithNoHistorySucceedsAndActuallyRemovesTheRow(): void
    {
        $suffix = bin2hex(random_bytes(4));
        $victimId = $this->makeUser($suffix, 'clean');

        $response = $this->auth($this->callerToken)->delete("/api/v1/users/{$victimId}");
        $response->assertStatus(200);

        $this->assertNull(model(UserModel::class)->find($victimId), 'A genuinely hard delete, not a deactivate.');
    }

    public function testSuccessfulDeleteWritesAnAuditLogEntry(): void
    {
        $suffix = bin2hex(random_bytes(4));
        $victimId = $this->makeUser($suffix, 'audited');

        $this->auth($this->callerToken)->delete("/api/v1/users/{$victimId}")->assertStatus(200);

        $entry = \Config\Database::connect()->table('audit_logs')
            ->where('company_id', $this->companyId)
            ->where('action', 'delete')
            ->where('entity_type', 'User')
            ->where('entity_id', $victimId)
            ->get()->getFirstRow();

        $this->assertNotNull($entry, 'Deleting a user must still leave a record of who deleted whom.');
    }

    public function testCannotDeleteYourself(): void
    {
        $response = $this->auth($this->callerToken)->delete("/api/v1/users/{$this->callerId}");
        $response->assertStatus(422);

        $this->assertNotNull(model(UserModel::class)->find($this->callerId));
    }

    public function testDeletingWithoutUsersDeletePermissionIsForbidden(): void
    {
        $suffix = bin2hex(random_bytes(4));
        $victimId = $this->makeUser($suffix, 'protected');

        // A token with users.update (even users.view) but not users.delete.
        $limitedToken = (new JwtService())->issueAccessToken($this->callerId, $this->companyId, $this->roleId, ['users.view', 'users.update']);

        $this->auth($limitedToken)->delete("/api/v1/users/{$victimId}")->assertStatus(403);
        $this->assertNotNull(model(UserModel::class)->find($victimId));
    }

    public function testDeletingANonexistentUserIs404(): void
    {
        $this->auth($this->callerToken)->delete('/api/v1/users/999999999')->assertStatus(404);
    }

    public function testDeletingAUserInAnotherCompanyIs404(): void
    {
        $suffix = bin2hex(random_bytes(4));
        $otherCompanyId = (int) model(CompanyModel::class)->insert(['trade_name' => "Other Co {$suffix}"], true);
        $otherUserId = (int) model(UserModel::class)->insert([
            'company_id' => $otherCompanyId,
            'role_id' => null,
            'name' => 'Cross Tenant',
            'email' => "cross-{$suffix}@example.com",
            'username' => "cross_{$suffix}",
            'password' => 'Password123!',
            'is_active' => 1,
        ], true);

        try {
            $this->auth($this->callerToken)->delete("/api/v1/users/{$otherUserId}")->assertStatus(404);
            $this->assertNotNull(model(UserModel::class)->find($otherUserId));
        } finally {
            $db = \Config\Database::connect();
            $db->table('users')->where('id', $otherUserId)->delete();
            $db->table('companies')->where('id', $otherCompanyId)->delete();
        }
    }

    public function testDeletingAUserWhoSentAChatMessageIsBlockedWithASpecificReason(): void
    {
        $suffix = bin2hex(random_bytes(4));
        $senderId = $this->makeUser($suffix, 'sender');
        $otherId = $this->makeUser($suffix, 'other');

        $conversationId = model(ChatConversationModel::class)->findOrCreateDirect($this->companyId, $senderId, $otherId, $senderId);
        model(ChatMessageModel::class)->insert([
            'company_id' => $this->companyId,
            'conversation_id' => $conversationId,
            'sender_id' => $senderId,
            'body' => 'hello',
        ]);

        $response = $this->auth($this->callerToken)->delete("/api/v1/users/{$senderId}");
        $response->assertStatus(422);
        $body = json_decode($response->getJSON(), true);
        $this->assertStringContainsString('chat message', $body['message']);

        $this->assertNotNull(model(UserModel::class)->find($senderId), 'The blocked delete must not have removed the row.');
    }

    public function testDeletingAUserWithOnlyGroupMembershipAndNoMessagesIsAlsoBlocked(): void
    {
        $suffix = bin2hex(random_bytes(4));
        $creatorId = $this->makeUser($suffix, 'creator');
        $lurkerId = $this->makeUser($suffix, 'lurker');

        // A group with a member who never actually sent anything — proves
        // this checks conversation MEMBERSHIP, not just sent messages.
        model(ChatConversationModel::class)->createGroup($this->companyId, 'Test Group', $creatorId, [$lurkerId]);

        $this->auth($this->callerToken)->delete("/api/v1/users/{$lurkerId}")->assertStatus(422);
        $this->assertNotNull(model(UserModel::class)->find($lurkerId));
    }

    public function testDeletingAUserWithACashSessionIsBlockedWithASpecificReason(): void
    {
        $suffix = bin2hex(random_bytes(4));
        $cashierId = $this->makeUser($suffix, 'cashier');

        $storeId = (int) model(StoreModel::class)->insert(['company_id' => $this->companyId, 'name' => 'UDT Store', 'code' => "UDT-{$suffix}"], true);
        $registerId = (int) model(RegisterModel::class)->insert(['store_id' => $storeId, 'name' => 'UDT Register', 'code' => "UDTR-{$suffix}"], true);

        \Config\Database::connect()->table('cash_sessions')->insert([
            'register_id' => $registerId,
            'user_id' => $cashierId,
            'opened_at' => date('Y-m-d H:i:s'),
            'status' => 'open',
        ]);

        $response = $this->auth($this->callerToken)->delete("/api/v1/users/{$cashierId}");
        $response->assertStatus(422);
        $body = json_decode($response->getJSON(), true);
        $this->assertStringContainsString('cash session', $body['message']);

        $this->assertNotNull(model(UserModel::class)->find($cashierId));
    }
}
