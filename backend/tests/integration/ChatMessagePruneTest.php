<?php

use App\Libraries\JwtService;
use App\Models\ChatMessageModel;
use App\Models\CompanyModel;
use App\Models\RoleModel;
use App\Models\UserModel;
use CodeIgniter\Test\CIUnitTestCase;
use CodeIgniter\Test\DatabaseTestTrait;
use CodeIgniter\Test\FeatureTestTrait;
use Config\Services;

/**
 * Chat messages auto-delete after ChatMessageModel::RETENTION_MONTHS
 * (3 months) — exercised two ways: the deletion logic itself
 * (pruneOlderThan(), directly, with fixture rows backdated by hand since
 * a message's own created_at can't be set through the normal insert
 * path), and separately that ChatController actually triggers it off
 * ordinary traffic, throttled so it isn't a real DELETE on every request.
 *
 * @internal
 */
final class ChatMessagePruneTest extends CIUnitTestCase
{
    use DatabaseTestTrait;
    use FeatureTestTrait;

    protected $migrate = false;
    protected $refresh = false;
    protected $seed = '';

    private int $companyId;
    private int $roleId;
    private int $userAId;
    private int $userBId;
    private int $conversationId;
    private string $tokenA;

    protected function setUp(): void
    {
        parent::setUp();

        // The throttle cache key must never leak between tests — otherwise
        // whichever test happens to run first "uses up" the one real
        // prune every other test in this file silently relies on too.
        Services::cache()->delete('chat_last_prune');

        $suffix = bin2hex(random_bytes(4));
        $this->companyId = (int) model(CompanyModel::class)->insert(['trade_name' => "Prune Co {$suffix}"], true);
        $this->roleId = (int) model(RoleModel::class)->insert(['company_id' => $this->companyId, 'name' => 'Prune Manager'], true);

        $chatPermissionId = \Config\Database::connect()->table('permissions')->where('slug', 'chat.access')->get()->getFirstRow()->id;
        \Config\Database::connect()->table('role_permissions')->insert(['role_id' => $this->roleId, 'permission_id' => $chatPermissionId]);

        $this->userAId = $this->makeUser($suffix, 'a');
        $this->userBId = $this->makeUser($suffix, 'b');
        $this->tokenA = (new JwtService())->issueAccessToken($this->userAId, $this->companyId, $this->roleId, ['chat.access']);
        $this->conversationId = model(\App\Models\ChatConversationModel::class)
            ->findOrCreateDirect($this->companyId, $this->userAId, $this->userBId, $this->userAId);
    }

    protected function tearDown(): void
    {
        Services::cache()->delete('chat_last_prune');

        $db = \Config\Database::connect();
        $db->table('chat_messages')->where('company_id', $this->companyId)->delete();
        $db->table('chat_conversation_participants')->where('conversation_id', $this->conversationId)->delete();
        $db->table('chat_conversations')->where('company_id', $this->companyId)->delete();
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
            'name' => "Prune User {$tag}",
            'email' => "prune-{$tag}-{$suffix}@example.com",
            'username' => "prune_{$tag}_{$suffix}",
            'password' => 'Password123!',
            'is_active' => 1,
        ], true);
    }

    /** Backdated directly through the query builder — created_at isn't settable through the model's own insert() (it's stamped by useTimestamps). */
    private function insertMessageAt(string $body, string $createdAt): int
    {
        $db = \Config\Database::connect();
        $db->table('chat_messages')->insert([
            'company_id' => $this->companyId,
            'conversation_id' => $this->conversationId,
            'sender_id' => $this->userAId,
            'body' => $body,
            'created_at' => $createdAt,
        ]);

        return (int) $db->insertID();
    }

    public function testPruneOlderThanDeletesOnlyMessagesPastRetention(): void
    {
        $old = $this->insertMessageAt('old message', date('Y-m-d H:i:s', strtotime('-4 months')));
        $borderline = $this->insertMessageAt('just under 3 months', date('Y-m-d H:i:s', strtotime('-3 months +1 day')));
        $recent = $this->insertMessageAt('recent message', date('Y-m-d H:i:s', strtotime('-1 month')));

        $deleted = model(ChatMessageModel::class)->pruneOlderThan();

        $this->assertSame(1, $deleted);
        $this->assertNull(model(ChatMessageModel::class)->find($old));
        $this->assertNotNull(model(ChatMessageModel::class)->find($borderline));
        $this->assertNotNull(model(ChatMessageModel::class)->find($recent));
    }

    public function testPruneOlderThanAcceptsACustomWindow(): void
    {
        $sixWeeksOld = $this->insertMessageAt('six weeks old', date('Y-m-d H:i:s', strtotime('-6 weeks')));
        $twoWeeksOld = $this->insertMessageAt('two weeks old', date('Y-m-d H:i:s', strtotime('-2 weeks')));

        $deleted = model(ChatMessageModel::class)->pruneOlderThan(1);

        $this->assertSame(1, $deleted);
        $this->assertNull(model(ChatMessageModel::class)->find($sixWeeksOld));
        $this->assertNotNull(model(ChatMessageModel::class)->find($twoWeeksOld));
    }

    public function testOrdinaryChatTrafficTriggersAPruneOnTheFirstRequest(): void
    {
        $old = $this->insertMessageAt('should be swept', date('Y-m-d H:i:s', strtotime('-4 months')));

        $this->withHeaders(['Authorization' => 'Bearer ' . $this->tokenA])
            ->get('/api/v1/chat/conversations')
            ->assertStatus(200);

        $this->assertNull(model(ChatMessageModel::class)->find($old), 'A chat request must trigger the lazy prune when the throttle window is open.');
    }

    public function testThePruneIsThrottledNotRunOnEveryRequest(): void
    {
        // Consume the throttle window with one request.
        $this->withHeaders(['Authorization' => 'Bearer ' . $this->tokenA])
            ->get('/api/v1/chat/conversations')
            ->assertStatus(200);

        // A message backdated AFTER that first request must survive a
        // second request within the same hour — if the throttle weren't
        // real, every single request (including the ~every-4-seconds
        // thread poll) would run a real DELETE.
        $old = $this->insertMessageAt('should survive the throttle window', date('Y-m-d H:i:s', strtotime('-4 months')));

        $this->withHeaders(['Authorization' => 'Bearer ' . $this->tokenA])
            ->get('/api/v1/chat/conversations')
            ->assertStatus(200);

        $this->assertNotNull(model(ChatMessageModel::class)->find($old), 'A second request inside the throttle window must not run another prune.');
    }
}
