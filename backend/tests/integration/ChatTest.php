<?php

use App\Libraries\JwtService;
use App\Models\CompanyModel;
use App\Models\RoleModel;
use App\Models\UserModel;
use CodeIgniter\Test\CIUnitTestCase;
use CodeIgniter\Test\DatabaseTestTrait;
use CodeIgniter\Test\FeatureTestTrait;

/**
 * Back Office chat: direct messages and groups, both riding the same
 * chat_conversations/chat_conversation_participants/chat_messages schema
 * (see CreateChatConversations, RestructureChatMessagesForConversations).
 * The permission gate itself (chat.access on every route) is exercised
 * here as a real 403 against a Cashier token, not assumed — and
 * separately, that a chat.access holder can't be forced into a
 * conversation with someone who doesn't hold it (a Cashier's user id),
 * which the route-level gate alone wouldn't catch since a Cashier is never
 * the CALLER in that scenario.
 *
 * @internal
 */
final class ChatTest extends CIUnitTestCase
{
    use DatabaseTestTrait;
    use FeatureTestTrait;

    protected $migrate = false;
    protected $refresh = false;
    protected $seed = '';

    private int $companyId;
    private int $managerRoleId;
    private int $cashierRoleId;
    private int $managerAId;
    private int $managerBId;
    private int $managerCId;
    private int $cashierId;
    private string $managerAToken;
    private string $managerBToken;
    private string $managerCToken;
    private string $cashierToken;

    protected function setUp(): void
    {
        parent::setUp();

        $suffix = bin2hex(random_bytes(4));
        $this->companyId = (int) model(CompanyModel::class)->insert(['trade_name' => "Chat Co {$suffix}"], true);

        $this->managerRoleId = (int) model(RoleModel::class)->insert(['company_id' => $this->companyId, 'name' => 'Chat Manager'], true);
        $this->cashierRoleId = (int) model(RoleModel::class)->insert(['company_id' => $this->companyId, 'name' => 'Chat Cashier'], true);

        $this->managerAId = $this->makeUser($suffix, 'a', $this->managerRoleId);
        $this->managerBId = $this->makeUser($suffix, 'b', $this->managerRoleId);
        $this->managerCId = $this->makeUser($suffix, 'c', $this->managerRoleId);
        $this->cashierId = $this->makeUser($suffix, 'cashier', $this->cashierRoleId);

        // JWT-embedded permissions (below) satisfy the route-level gate for
        // whoever is CALLING an endpoint, but ChatController's own
        // eligibility check for a named RECIPIENT/member reads the real
        // role_permissions table (there's no token to read permissions off
        // for someone who isn't making the request) — so the grant has to
        // actually exist in the database too, not just in the token.
        $chatPermissionId = \Config\Database::connect()->table('permissions')->where('slug', 'chat.access')->get()->getFirstRow()->id;
        \Config\Database::connect()->table('role_permissions')->insert(['role_id' => $this->managerRoleId, 'permission_id' => $chatPermissionId]);

        // Only the manager role holds chat.access — mirrors real
        // Store Manager/Cashier in production, without depending on the
        // seeded role names actually existing in the test DB.
        $this->managerAToken = $this->tokenFor($this->managerAId, $this->managerRoleId, ['chat.access']);
        $this->managerBToken = $this->tokenFor($this->managerBId, $this->managerRoleId, ['chat.access']);
        $this->managerCToken = $this->tokenFor($this->managerCId, $this->managerRoleId, ['chat.access']);
        $this->cashierToken = $this->tokenFor($this->cashierId, $this->cashierRoleId, ['sales.create']);
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
        $db->table('users')->where('company_id', $this->companyId)->delete();
        $db->table('roles')->where('company_id', $this->companyId)->delete();
        $db->table('companies')->where('id', $this->companyId)->delete();

        parent::tearDown();
    }

    private function makeUser(string $suffix, string $tag, int $roleId): int
    {
        return (int) model(UserModel::class)->insert([
            'company_id' => $this->companyId,
            'role_id' => $roleId,
            'name' => "Chat User {$tag}",
            'email' => "chat-{$tag}-{$suffix}@example.com",
            'username' => "chat_{$tag}_{$suffix}",
            'password' => 'Password123!',
            'is_active' => 1,
        ], true);
    }

    /** @param string[] $permissions */
    private function tokenFor(int $userId, int $roleId, array $permissions): string
    {
        return (new JwtService())->issueAccessToken($userId, $this->companyId, $roleId, $permissions);
    }

    private function auth(string $token)
    {
        return $this->withHeaders(['Authorization' => 'Bearer ' . $token]);
    }

    private function openDirectAsA(int $recipientId): int
    {
        $response = $this->auth($this->managerAToken)->withBodyFormat('json')
            ->post('/api/v1/chat/direct', ['recipient_id' => $recipientId]);
        $response->assertStatus(200);

        return (int) json_decode($response->getJSON(), true)['data']['conversation_id'];
    }

    private function sendAsA(int $conversationId, string $body): int
    {
        $response = $this->auth($this->managerAToken)->withBodyFormat('json')
            ->post('/api/v1/chat/messages', ['conversation_id' => $conversationId, 'body' => $body]);
        $response->assertStatus(201);

        return (int) json_decode($response->getJSON(), true)['data']['id'];
    }

    public function testCashierIsBlockedFromEveryChatRoute(): void
    {
        $this->auth($this->cashierToken)->get('/api/v1/chat/contacts')->assertStatus(403);
        $this->auth($this->cashierToken)->get('/api/v1/chat/conversations')->assertStatus(403);
        $this->auth($this->cashierToken)->get('/api/v1/chat/unread-count')->assertStatus(403);
        $this->auth($this->cashierToken)->get('/api/v1/chat/messages?conversation_id=1')->assertStatus(403);
        $this->auth($this->cashierToken)->withBodyFormat('json')
            ->post('/api/v1/chat/messages', ['conversation_id' => 1, 'body' => 'hi'])
            ->assertStatus(403);
        $this->auth($this->cashierToken)->withBodyFormat('json')
            ->post('/api/v1/chat/direct', ['recipient_id' => $this->managerAId])
            ->assertStatus(403);
        $this->auth($this->cashierToken)->withBodyFormat('json')
            ->post('/api/v1/chat/groups', ['name' => 'x', 'member_ids' => [$this->managerAId]])
            ->assertStatus(403);
    }

    public function testContactsListsOtherChatEligibleUsersOnlyExcludingCashiersAndSelf(): void
    {
        $response = $this->auth($this->managerAToken)->get('/api/v1/chat/contacts');
        $response->assertStatus(200);
        $names = array_column(json_decode($response->getJSON(), true)['data'], 'name');

        $this->assertContains('Chat User b', $names);
        $this->assertNotContains('Chat User a', $names, 'A user must not appear in their own contact list.');
        $this->assertNotContains('Chat User cashier', $names, 'A Cashier (no chat.access) must never appear as a contact.');
    }

    public function testCannotOpenADirectConversationWithAUserWithoutChatAccess(): void
    {
        $response = $this->auth($this->managerAToken)->withBodyFormat('json')
            ->post('/api/v1/chat/direct', ['recipient_id' => $this->cashierId]);

        $response->assertStatus(422);
    }

    public function testCannotMessageSelf(): void
    {
        $this->auth($this->managerAToken)->withBodyFormat('json')
            ->post('/api/v1/chat/direct', ['recipient_id' => $this->managerAId])
            ->assertStatus(422);
    }

    public function testCannotOpenADirectConversationWithAUserInAnotherCompany(): void
    {
        $otherCompanyId = (int) model(CompanyModel::class)->insert(['trade_name' => 'Other Chat Co ' . bin2hex(random_bytes(3))], true);
        $otherRoleId = (int) model(RoleModel::class)->insert(['company_id' => $otherCompanyId, 'name' => 'Other Manager'], true);
        $otherUserId = (int) model(UserModel::class)->insert([
            'company_id' => $otherCompanyId,
            'role_id' => $otherRoleId,
            'name' => 'Other Co Manager',
            'email' => 'other-chat-' . bin2hex(random_bytes(3)) . '@example.com',
            'username' => 'other_chat_' . bin2hex(random_bytes(3)),
            'password' => 'Password123!',
            'is_active' => 1,
        ], true);

        try {
            $this->auth($this->managerAToken)->withBodyFormat('json')
                ->post('/api/v1/chat/direct', ['recipient_id' => $otherUserId])
                ->assertStatus(422);
        } finally {
            $db = \Config\Database::connect();
            $db->table('users')->where('id', $otherUserId)->delete();
            $db->table('roles')->where('id', $otherRoleId)->delete();
            $db->table('companies')->where('id', $otherCompanyId)->delete();
        }
    }

    public function testOpeningADirectConversationTwiceReturnsTheSameOne(): void
    {
        $first = $this->openDirectAsA($this->managerBId);
        $second = $this->openDirectAsA($this->managerBId);

        $this->assertSame($first, $second, 'Two people must never be split across more than one direct conversation.');
    }

    public function testSendCreatesAMessageAndAppearsInTheThread(): void
    {
        $conversationId = $this->openDirectAsA($this->managerBId);
        $this->sendAsA($conversationId, 'Can you cover Thursday?');

        $thread = $this->auth($this->managerBToken)->get("/api/v1/chat/messages?conversation_id={$conversationId}");
        $thread->assertStatus(200);
        $data = json_decode($thread->getJSON(), true)['data'];

        $this->assertSame('Chat User a', $data['conversation']['name']);
        $this->assertSame('direct', $data['conversation']['type']);
        $this->assertCount(1, $data['messages']);
        $this->assertSame('Can you cover Thursday?', $data['messages'][0]['body']);
        $this->assertSame('Chat User a', $data['messages'][0]['sender_name']);
    }

    /**
     * Design decision (a change from the pre-groups version of this
     * feature): eligibility is only checked when a conversation is FIRST
     * opened/created, not on every send afterwards — a rule that "you can
     * only keep messaging someone while they're still eligible" doesn't
     * generalize to a group of five, so it isn't applied to a direct
     * conversation either. Viewing and sending both depend only on the
     * CALLER'S own still-active participant row.
     */
    public function testCanStillReadAndSendInAnExistingDirectThreadAfterTheOtherPartyIsDeactivated(): void
    {
        $conversationId = $this->openDirectAsA($this->managerBId);
        $this->sendAsA($conversationId, 'before you left');

        model(UserModel::class)->update($this->managerBId, ['is_active' => 0]);

        $thread = $this->auth($this->managerAToken)->get("/api/v1/chat/messages?conversation_id={$conversationId}");
        $thread->assertStatus(200);
        $data = json_decode($thread->getJSON(), true)['data'];
        $this->assertSame('before you left', $data['messages'][0]['body']);

        $this->auth($this->managerAToken)->withBodyFormat('json')
            ->post('/api/v1/chat/messages', ['conversation_id' => $conversationId, 'body' => 'are you still there?'])
            ->assertStatus(201);
    }

    public function testCannotViewOrSendInAConversationYouAreNotAParticipantOf(): void
    {
        $conversationId = $this->openDirectAsA($this->managerBId);

        $this->auth($this->managerCToken)->get("/api/v1/chat/messages?conversation_id={$conversationId}")->assertStatus(422);
        $this->auth($this->managerCToken)->withBodyFormat('json')
            ->post('/api/v1/chat/messages', ['conversation_id' => $conversationId, 'body' => 'butting in'])
            ->assertStatus(422);
    }

    public function testReadingAThreadMarksItReadAndDropsTheUnreadCount(): void
    {
        $conversationId = $this->openDirectAsA($this->managerBId);
        $this->sendAsA($conversationId, 'msg 1');
        $this->sendAsA($conversationId, 'msg 2');

        $before = json_decode($this->auth($this->managerBToken)->get('/api/v1/chat/unread-count')->getJSON(), true)['data'];
        $this->assertSame(2, $before['unread']);

        $this->auth($this->managerBToken)->get("/api/v1/chat/messages?conversation_id={$conversationId}")->assertStatus(200);

        $after = json_decode($this->auth($this->managerBToken)->get('/api/v1/chat/unread-count')->getJSON(), true)['data'];
        $this->assertSame(0, $after['unread']);

        // Reading B's inbox must never mark A's own copy of the exchange
        // read — last_read_at belongs to the participant, not the thread.
        $stillUnreadForA = json_decode($this->auth($this->managerAToken)->get('/api/v1/chat/unread-count')->getJSON(), true)['data'];
        $this->assertSame(0, $stillUnreadForA['unread'], 'A sent both messages and received none, so A should have nothing unread either way.');
    }

    public function testConversationsListShowsTheLatestMessageAndUnreadCount(): void
    {
        $conversationId = $this->openDirectAsA($this->managerBId);
        $this->sendAsA($conversationId, 'first');
        $this->auth($this->managerBToken)->withBodyFormat('json')
            ->post('/api/v1/chat/messages', ['conversation_id' => $conversationId, 'body' => 'reply, most recent'])
            ->assertStatus(201);

        $response = $this->auth($this->managerAToken)->get('/api/v1/chat/conversations');
        $response->assertStatus(200);
        $rows = json_decode($response->getJSON(), true)['data'];

        $this->assertCount(1, $rows, 'Two people exchanging messages is ONE conversation, not two.');
        $this->assertSame('direct', $rows[0]['type']);
        $this->assertSame('Chat User b', $rows[0]['name']);
        $this->assertSame('reply, most recent', $rows[0]['last_message']);
        $this->assertSame(1, $rows[0]['unread_count']);
        $this->assertFalse($rows[0]['last_message_from_me']);
    }

    public function testSenderCanDeleteTheirOwnMessageAndTheBodyIsActuallyCleared(): void
    {
        $conversationId = $this->openDirectAsA($this->managerBId);
        $id = $this->sendAsA($conversationId, 'oops, wrong channel');

        $this->auth($this->managerAToken)->delete("/api/v1/chat/messages/{$id}")->assertStatus(200);

        $thread = json_decode($this->auth($this->managerBToken)->get("/api/v1/chat/messages?conversation_id={$conversationId}")->getJSON(), true)['data'];
        $this->assertNotNull($thread['messages'][0]['deleted_at']);
        // Actually cleared, not just flagged — see AddDeletedAtToChatMessages.
        $this->assertSame('', $thread['messages'][0]['body']);
    }

    public function testRecipientCannotDeleteAMessageSentToThem(): void
    {
        $conversationId = $this->openDirectAsA($this->managerBId);
        $id = $this->sendAsA($conversationId, 'can B delete this?');

        $this->auth($this->managerBToken)->delete("/api/v1/chat/messages/{$id}")->assertStatus(404);

        $thread = json_decode($this->auth($this->managerAToken)->get("/api/v1/chat/messages?conversation_id={$conversationId}")->getJSON(), true)['data'];
        $this->assertNull($thread['messages'][0]['deleted_at']);
    }

    public function testCannotDeleteSomeoneElsesMessageById(): void
    {
        // A third chat-eligible user in a DIFFERENT company must not be
        // able to delete A's message just by guessing its id.
        $suffix = bin2hex(random_bytes(4));
        $otherCompanyId = (int) model(CompanyModel::class)->insert(['trade_name' => "Chat Delete Other Co {$suffix}"], true);
        $otherRoleId = (int) model(RoleModel::class)->insert(['company_id' => $otherCompanyId, 'name' => 'Other Manager'], true);
        $chatPermissionId = \Config\Database::connect()->table('permissions')->where('slug', 'chat.access')->get()->getFirstRow()->id;
        \Config\Database::connect()->table('role_permissions')->insert(['role_id' => $otherRoleId, 'permission_id' => $chatPermissionId]);
        $otherUserId = (int) model(UserModel::class)->insert([
            'company_id' => $otherCompanyId,
            'role_id' => $otherRoleId,
            'name' => 'Other Co Manager',
            'email' => "other-del-{$suffix}@example.com",
            'username' => "other_del_{$suffix}",
            'password' => 'Password123!',
            'is_active' => 1,
        ], true);
        $otherToken = (new JwtService())->issueAccessToken($otherUserId, $otherCompanyId, $otherRoleId, ['chat.access']);

        $conversationId = $this->openDirectAsA($this->managerBId);
        $id = $this->sendAsA($conversationId, 'cross-tenant delete attempt');

        try {
            $this->auth($otherToken)->delete("/api/v1/chat/messages/{$id}")->assertStatus(404);
        } finally {
            $db = \Config\Database::connect();
            $db->table('chat_messages')->where('company_id', $otherCompanyId)->delete();
            $db->table('users')->where('id', $otherUserId)->delete();
            $db->table('roles')->where('id', $otherRoleId)->delete();
            $db->table('companies')->where('id', $otherCompanyId)->delete();
        }

        $thread = json_decode($this->auth($this->managerAToken)->get("/api/v1/chat/messages?conversation_id={$conversationId}")->getJSON(), true)['data'];
        $this->assertNull($thread['messages'][0]['deleted_at'], "Another company's user must not be able to delete this message.");
    }

    public function testDeletingAlreadyDeletedMessageIsANotFoundNotASilentSuccess(): void
    {
        $conversationId = $this->openDirectAsA($this->managerBId);
        $id = $this->sendAsA($conversationId, 'delete me twice');

        $this->auth($this->managerAToken)->delete("/api/v1/chat/messages/{$id}")->assertStatus(200);
        $this->auth($this->managerAToken)->delete("/api/v1/chat/messages/{$id}")->assertStatus(404);
    }

    public function testConversationsListReflectsADeletedLastMessage(): void
    {
        $conversationId = $this->openDirectAsA($this->managerBId);
        $id = $this->sendAsA($conversationId, 'will be deleted');
        $this->auth($this->managerAToken)->delete("/api/v1/chat/messages/{$id}")->assertStatus(200);

        $rows = json_decode($this->auth($this->managerAToken)->get('/api/v1/chat/conversations')->getJSON(), true)['data'];
        $this->assertTrue($rows[0]['last_message_deleted']);
    }

    // -- Group chat -----------------------------------------------------

    private function createGroupAsA(string $name, array $memberIds): int
    {
        $response = $this->auth($this->managerAToken)->withBodyFormat('json')
            ->post('/api/v1/chat/groups', ['name' => $name, 'member_ids' => $memberIds]);
        $response->assertStatus(201);

        return (int) json_decode($response->getJSON(), true)['data']['id'];
    }

    public function testCreateGroupAddsCreatorAndSelectedMembers(): void
    {
        $conversationId = $this->createGroupAsA('Weekend Shift Leads', [$this->managerBId, $this->managerCId]);

        $rowsForA = json_decode($this->auth($this->managerAToken)->get('/api/v1/chat/conversations')->getJSON(), true)['data'];
        $this->assertSame('group', $rowsForA[0]['type']);
        $this->assertSame('Weekend Shift Leads', $rowsForA[0]['name']);
        $this->assertSame(3, $rowsForA[0]['member_count']);

        // The creator never has to be explicitly listed in member_ids to end up a member.
        $rowsForB = json_decode($this->auth($this->managerBToken)->get('/api/v1/chat/conversations')->getJSON(), true)['data'];
        $this->assertCount(1, $rowsForB);
        $this->assertSame($conversationId, $rowsForB[0]['id']);
    }

    public function testCreateGroupRejectsANonEligibleMember(): void
    {
        $this->auth($this->managerAToken)->withBodyFormat('json')
            ->post('/api/v1/chat/groups', ['name' => 'Sneaking in a cashier', 'member_ids' => [$this->managerBId, $this->cashierId]])
            ->assertStatus(422);
    }

    public function testCreateGroupRequiresAtLeastOneOtherMember(): void
    {
        $this->auth($this->managerAToken)->withBodyFormat('json')
            ->post('/api/v1/chat/groups', ['name' => 'Just me', 'member_ids' => []])
            ->assertStatus(422);

        // Naming only yourself (the creator gets filtered out of member_ids) is the same as an empty list.
        $this->auth($this->managerAToken)->withBodyFormat('json')
            ->post('/api/v1/chat/groups', ['name' => 'Just me again', 'member_ids' => [$this->managerAId]])
            ->assertStatus(422);
    }

    public function testNonMemberCannotViewOrSendInAGroupTheyAreNotIn(): void
    {
        $conversationId = $this->createGroupAsA('Private group', [$this->managerBId]);

        $this->auth($this->managerCToken)->get("/api/v1/chat/messages?conversation_id={$conversationId}")->assertStatus(422);
        $this->auth($this->managerCToken)->withBodyFormat('json')
            ->post('/api/v1/chat/messages', ['conversation_id' => $conversationId, 'body' => 'butting in'])
            ->assertStatus(422);
    }

    public function testGroupMessagesShowSenderAttribution(): void
    {
        $conversationId = $this->createGroupAsA('Attribution check', [$this->managerBId, $this->managerCId]);
        $this->sendAsA($conversationId, 'hello team');
        $this->auth($this->managerBToken)->withBodyFormat('json')
            ->post('/api/v1/chat/messages', ['conversation_id' => $conversationId, 'body' => 'hi back'])
            ->assertStatus(201);

        $thread = json_decode($this->auth($this->managerCToken)->get("/api/v1/chat/messages?conversation_id={$conversationId}")->getJSON(), true)['data'];
        $this->assertSame('Chat User a', $thread['messages'][0]['sender_name']);
        $this->assertSame('Chat User b', $thread['messages'][1]['sender_name']);
        $this->assertCount(3, $thread['members'], 'All three current members should be listed.');
    }

    public function testAnyMemberCanAddAnotherEligibleMember(): void
    {
        $conversationId = $this->createGroupAsA('Growing group', [$this->managerBId]);

        // B, not the creator, adds C.
        $this->auth($this->managerBToken)->withBodyFormat('json')
            ->post("/api/v1/chat/groups/{$conversationId}/members", ['user_id' => $this->managerCId])
            ->assertStatus(200);

        $thread = json_decode($this->auth($this->managerCToken)->get("/api/v1/chat/messages?conversation_id={$conversationId}")->getJSON(), true)['data'];
        $this->assertCount(3, $thread['members']);
    }

    public function testAddMemberRejectsANonEligibleUser(): void
    {
        $conversationId = $this->createGroupAsA('No cashiers here', [$this->managerBId]);

        $this->auth($this->managerAToken)->withBodyFormat('json')
            ->post("/api/v1/chat/groups/{$conversationId}/members", ['user_id' => $this->cashierId])
            ->assertStatus(422);
    }

    public function testCreatorCanRemoveAnotherMemberAndTheyLoseAccess(): void
    {
        $conversationId = $this->createGroupAsA('Shrinking group', [$this->managerBId, $this->managerCId]);

        // A is the creator.
        $this->auth($this->managerAToken)->delete("/api/v1/chat/groups/{$conversationId}/members/{$this->managerCId}")->assertStatus(200);

        $this->auth($this->managerCToken)->get("/api/v1/chat/messages?conversation_id={$conversationId}")->assertStatus(422);

        $rowsForA = json_decode($this->auth($this->managerAToken)->get('/api/v1/chat/conversations')->getJSON(), true)['data'];
        $this->assertSame(2, $rowsForA[0]['member_count']);
    }

    public function testNonCreatorCannotRemoveAnotherMember(): void
    {
        $conversationId = $this->createGroupAsA('Protected group', [$this->managerBId, $this->managerCId]);

        // B is not the creator and must not be able to remove C.
        $this->auth($this->managerBToken)->delete("/api/v1/chat/groups/{$conversationId}/members/{$this->managerCId}")->assertStatus(403);

        $rowsForA = json_decode($this->auth($this->managerAToken)->get('/api/v1/chat/conversations')->getJSON(), true)['data'];
        $this->assertSame(3, $rowsForA[0]['member_count'], 'The rejected removal must not have taken effect.');
    }

    public function testMemberCanLeaveAGroupByRemovingThemselves(): void
    {
        $conversationId = $this->createGroupAsA('Leaving group', [$this->managerBId]);

        $this->auth($this->managerBToken)->delete("/api/v1/chat/groups/{$conversationId}/members/{$this->managerBId}")->assertStatus(200);

        $rowsForB = json_decode($this->auth($this->managerBToken)->get('/api/v1/chat/conversations')->getJSON(), true)['data'];
        $this->assertCount(0, $rowsForB, 'A departed member must no longer see the group in their own conversation list.');
    }

    public function testRemovingSomeoneNotInTheGroupIsANotFound(): void
    {
        $conversationId = $this->createGroupAsA('No-op removal', [$this->managerBId]);

        $this->auth($this->managerAToken)->delete("/api/v1/chat/groups/{$conversationId}/members/{$this->managerCId}")->assertStatus(404);
    }

    public function testOnlyTheCreatorCanRenameTheGroup(): void
    {
        $conversationId = $this->createGroupAsA('Old name', [$this->managerBId]);

        $this->auth($this->managerBToken)->withBodyFormat('json')
            ->put("/api/v1/chat/groups/{$conversationId}", ['name' => 'Attempted by B'])
            ->assertStatus(403);

        $this->auth($this->managerAToken)->withBodyFormat('json')
            ->put("/api/v1/chat/groups/{$conversationId}", ['name' => 'New name'])
            ->assertStatus(200);

        $rows = json_decode($this->auth($this->managerAToken)->get('/api/v1/chat/conversations')->getJSON(), true)['data'];
        $this->assertSame('New name', $rows[0]['name'], "B's rejected rename must not have taken effect, and A's must have.");
    }

    public function testMessagesResponseFlagsWhoCreatedTheGroup(): void
    {
        $conversationId = $this->createGroupAsA('Ownership check', [$this->managerBId]);

        $forCreator = json_decode($this->auth($this->managerAToken)->get("/api/v1/chat/messages?conversation_id={$conversationId}")->getJSON(), true)['data'];
        $this->assertTrue($forCreator['conversation']['is_creator']);

        $forMember = json_decode($this->auth($this->managerBToken)->get("/api/v1/chat/messages?conversation_id={$conversationId}")->getJSON(), true)['data'];
        $this->assertFalse($forMember['conversation']['is_creator']);
    }

    public function testCannotRenameOrManageMembersOfADirectConversationAsIfItWereAGroup(): void
    {
        $conversationId = $this->openDirectAsA($this->managerBId);

        $this->auth($this->managerAToken)->withBodyFormat('json')
            ->put("/api/v1/chat/groups/{$conversationId}", ['name' => 'Not a group'])
            ->assertStatus(404);
        $this->auth($this->managerAToken)->withBodyFormat('json')
            ->post("/api/v1/chat/groups/{$conversationId}/members", ['user_id' => $this->managerCId])
            ->assertStatus(404);
        $this->auth($this->managerAToken)->delete("/api/v1/chat/groups/{$conversationId}/members/{$this->managerBId}")->assertStatus(404);
    }

    // -- Deleting a whole conversation -----------------------------------

    public function testEitherPartyCanDeleteADirectConversationAndItIsGoneForBoth(): void
    {
        $conversationId = $this->openDirectAsA($this->managerBId);
        $this->sendAsA($conversationId, 'to be wiped');

        // B deletes it, not A — there's no "owner" of a direct conversation.
        $this->auth($this->managerBToken)->delete("/api/v1/chat/conversations/{$conversationId}")->assertStatus(200);

        $rowsForA = json_decode($this->auth($this->managerAToken)->get('/api/v1/chat/conversations')->getJSON(), true)['data'];
        $this->assertCount(0, $rowsForA);
        $rowsForB = json_decode($this->auth($this->managerBToken)->get('/api/v1/chat/conversations')->getJSON(), true)['data'];
        $this->assertCount(0, $rowsForB);

        $this->auth($this->managerAToken)->get("/api/v1/chat/messages?conversation_id={$conversationId}")->assertStatus(422);
    }

    public function testDeletingAConversationPermanentlyRemovesItsMessagesNotJustHidesThem(): void
    {
        $conversationId = $this->openDirectAsA($this->managerBId);
        $this->sendAsA($conversationId, 'gone for good');

        $this->auth($this->managerAToken)->delete("/api/v1/chat/conversations/{$conversationId}")->assertStatus(200);

        $db = \Config\Database::connect();
        $this->assertSame(0, $db->table('chat_messages')->where('conversation_id', $conversationId)->countAllResults());
        $this->assertSame(0, $db->table('chat_conversation_participants')->where('conversation_id', $conversationId)->countAllResults());
        $this->assertSame(0, $db->table('chat_conversations')->where('id', $conversationId)->countAllResults());
    }

    public function testNonParticipantCannotDeleteAConversation(): void
    {
        $conversationId = $this->openDirectAsA($this->managerBId);

        $this->auth($this->managerCToken)->delete("/api/v1/chat/conversations/{$conversationId}")->assertStatus(404);

        $rowsForA = json_decode($this->auth($this->managerAToken)->get('/api/v1/chat/conversations')->getJSON(), true)['data'];
        $this->assertCount(1, $rowsForA, 'The rejected delete attempt must not have taken effect.');
    }

    public function testOnlyTheGroupCreatorCanDeleteTheGroup(): void
    {
        $conversationId = $this->createGroupAsA('Delete-protected group', [$this->managerBId]);

        $this->auth($this->managerBToken)->delete("/api/v1/chat/conversations/{$conversationId}")->assertStatus(403);

        $rowsForA = json_decode($this->auth($this->managerAToken)->get('/api/v1/chat/conversations')->getJSON(), true)['data'];
        $this->assertCount(1, $rowsForA, "B's rejected delete attempt must not have taken effect.");

        $this->auth($this->managerAToken)->delete("/api/v1/chat/conversations/{$conversationId}")->assertStatus(200);

        $rowsForB = json_decode($this->auth($this->managerBToken)->get('/api/v1/chat/conversations')->getJSON(), true)['data'];
        $this->assertCount(0, $rowsForB, "The creator's delete must remove the group for every member, not just themselves.");
    }
}
