<?php

namespace App\Controllers\Api\V1;

use App\Controllers\BaseApiController;
use App\Models\ChatConversationModel;
use App\Models\ChatConversationParticipantModel;
use App\Models\ChatMessageModel;
use CodeIgniter\HTTP\ResponseInterface;
use Config\Database;
use Config\Services;

/**
 * Back Office chat — direct messages and groups. Every action here is
 * gated by `permission:chat.access` at the route level (Routes.php), which
 * is what actually keeps a Cashier/Cashier Supervisor out — nothing in
 * this controller re-checks that, the same way no other permission-gated
 * controller in this app re-derives its own gate.
 *
 * Eligibility (active + holds chat.access) is only ever checked at the
 * moment someone is ADDED to a conversation — opening a new direct message
 * (openDirect()), creating a group (createGroup()), or adding a member to
 * one (addMember()). Once someone is an active participant, sending into
 * that conversation follows from participancy alone, not a live re-check
 * of whether they'd still be eligible to be added today — a group message
 * doesn't stop just because one member's role changed, and a direct
 * thread's own history stays fully readable even after the other person
 * is deactivated, since viewing only ever depends on the CALLER'S own
 * membership row.
 *
 * Group management is split two ways: any current member can send, view,
 * or add another eligible teammate (addMember()) — but renaming the group
 * (renameGroup()) or removing someone ELSE (removeMember()) is restricted
 * to whoever created it (see isGroupCreator()). Removing YOURSELF (leaving)
 * is always allowed regardless of who created the group.
 */
class ChatController extends BaseApiController
{
    private const REQUIRED_PERMISSION = 'chat.access';

    /**
     * How often maybePrune() is actually allowed to run the real DELETE —
     * a cache hit/miss check happens on every chat request (cheap), but
     * the query itself only fires at most this often. This app has no
     * cron/scheduler infrastructure to trigger cleanup on its own
     * (`php spark chat:prune` exists for anyone who sets one up — see
     * app/Commands/PruneChatMessages.php), so ordinary chat traffic is
     * what drives it instead: 3-month-old messages get swept away the
     * next time anyone actually uses the chat, at most once an hour.
     */
    private const PRUNE_THROTTLE_SECONDS = 3600;
    private const PRUNE_CACHE_KEY = 'chat_last_prune';

    public function initController(
        \CodeIgniter\HTTP\RequestInterface $request,
        \CodeIgniter\HTTP\ResponseInterface $response,
        \Psr\Log\LoggerInterface $logger
    ) {
        parent::initController($request, $response, $logger);
        $this->maybePrune();
    }

    private function maybePrune(): void
    {
        $cache = Services::cache();
        if ($cache->get(self::PRUNE_CACHE_KEY) !== null) {
            return;
        }

        // Set first, before the delete runs: this is the throttle itself,
        // so a slow query (or two requests landing at once) must never
        // leave the window open for a second DELETE to slip in behind it.
        $cache->save(self::PRUNE_CACHE_KEY, '1', self::PRUNE_THROTTLE_SECONDS);
        model(ChatMessageModel::class)->pruneOlderThan();
    }

    /** Every other chat-eligible user in the company — the "start a new conversation" picker's contact list (both for a new direct message and for who can be added to a group). */
    public function contacts(): ResponseInterface
    {
        $auth = Services::authContext();

        $rows = $this->chatEligibleUsersQuery($auth->companyId)
            ->where('users.id !=', $auth->userId)
            ->orderBy('users.name', 'ASC')
            ->get()->getResult();

        return $this->ok($rows);
    }

    /** GET /api/v1/chat/conversations — every conversation (direct or group) this user is currently in, most recently active first. */
    public function conversations(): ResponseInterface
    {
        $auth = Services::authContext();
        $rows = model(ChatConversationModel::class)->conversationsFor($auth->companyId, $auth->userId);

        return $this->ok($rows);
    }

    /** GET /api/v1/chat/unread-count */
    public function unreadCount(): ResponseInterface
    {
        $auth = Services::authContext();
        $total = model(ChatConversationModel::class)->totalUnread($auth->companyId, $auth->userId);

        return $this->ok(['unread' => $total]);
    }

    /**
     * GET /api/v1/chat/messages?conversation_id={id}
     *
     * Fetching a thread is what marks it read — there's no separate
     * "mark as read" action a client has to remember to call, matching
     * how opening a conversation already IS reading it in every chat UI
     * this one is modelled on.
     */
    public function messages(): ResponseInterface
    {
        $auth = Services::authContext();
        $conversationId = (int) ($this->request->getGet('conversation_id') ?? 0);

        $conversation = $this->requireActiveParticipant($auth->companyId, $auth->userId, $conversationId);
        if ($conversation === null) {
            return $this->apiFail('Unknown or inaccessible conversation_id', 422);
        }

        $messageModel = model(ChatMessageModel::class);
        // Fetched newest-first (LIMIT catches the most recent N), reversed
        // here so the response reads oldest-to-newest top to bottom, the
        // order a chat thread is actually displayed in.
        $rows = array_reverse($messageModel->messagesIn($conversationId));
        model(ChatConversationParticipantModel::class)->markRead($conversationId, $auth->userId);

        $members = model(ChatConversationParticipantModel::class)->activeMembers($conversationId);
        $name = $conversation->type === 'group' ? $conversation->name : $this->directCounterpartName($members, $auth->userId);

        return $this->ok([
            'conversation' => [
                'id' => (int) $conversation->id,
                'type' => $conversation->type,
                'name' => $name,
                // Only meaningful for a group — lets the frontend show/hide
                // the rename field and "remove" affordance on OTHER
                // members without a second round trip. See renameGroup()/
                // removeMember() for why those two are creator-only while
                // addMember() stays open to any current member.
                'is_creator' => $conversation->created_by !== null && (int) $conversation->created_by === $auth->userId,
            ],
            'members' => $members,
            'messages' => $rows,
        ]);
    }

    /** POST /api/v1/chat/messages  body: { conversation_id, body } — sends into an EXISTING conversation (direct or group); see openDirect()/createGroup() for starting a new one. */
    public function send(): ResponseInterface
    {
        $auth = Services::authContext();
        $payload = $this->request->getJSON(true) ?? [];

        if (! $this->validateData($payload, [
            'conversation_id' => ['label' => 'Conversation', 'rules' => 'required|is_natural_no_zero'],
            'body' => ['label' => 'Message', 'rules' => 'required|max_length[4000]'],
        ])) {
            return $this->validationFail($this->validator->getErrors());
        }

        $conversationId = (int) $payload['conversation_id'];
        if ($this->requireActiveParticipant($auth->companyId, $auth->userId, $conversationId) === null) {
            return $this->apiFail('Unknown or inaccessible conversation_id', 422);
        }

        $messageModel = model(ChatMessageModel::class);
        $id = $messageModel->insert([
            'company_id' => $auth->companyId,
            'conversation_id' => $conversationId,
            'sender_id' => $auth->userId,
            'body' => trim((string) $payload['body']),
        ], true);

        if ($id === false) {
            return $this->validationFail($messageModel->errors());
        }

        model(ChatConversationModel::class)->touchLastMessageAt($conversationId);
        // Sending is also reading, as far as the sender's own copy of this
        // conversation is concerned — otherwise their own message would
        // immediately count against their own unread total.
        model(ChatConversationParticipantModel::class)->markRead($conversationId, $auth->userId);

        return $this->created($messageModel->find($id));
    }

    /**
     * DELETE /api/v1/chat/messages/{id}
     *
     * Sender-only — see ChatMessageModel::softDelete() for how that's
     * actually enforced (in the UPDATE's own WHERE clause, not a
     * check-then-write). No audit log entry for this, same as send()
     * itself: these are private messages, and logging their content (or
     * even just "message N was deleted") into the company-wide audit
     * trail — readable by anyone holding audit.view, a materially wider
     * audience than the people in the conversation — would leak exactly
     * what a delete is meant to remove.
     */
    public function delete($id = null): ResponseInterface
    {
        $auth = Services::authContext();
        $deleted = model(ChatMessageModel::class)->softDelete($auth->companyId, (int) $id, $auth->userId);

        if (! $deleted) {
            return $this->notFound('No such message, or it is not yours to delete');
        }

        return $this->noContentOk('Message deleted');
    }

    /**
     * DELETE /api/v1/chat/conversations/{id}
     *
     * Permanently deletes the conversation itself, every message in it,
     * and everyone's membership — a hard delete, not a tombstone, unlike
     * an individual message's own soft delete (see ChatMessageModel::
     * softDelete()'s own docblock for why that one IS kept as a
     * placeholder). There's no retention reason to keep it: chat already
     * has its own 3-month auto-prune for ordinary aging-out, so a whole
     * conversation someone deliberately deletes has nothing left to
     * retain. The DB's own ON DELETE CASCADE (see CreateChatConversations)
     * takes care of every chat_messages/chat_conversation_participants row
     * that pointed at it — deleting the parent row here is the whole
     * operation.
     *
     * A direct conversation can be deleted by EITHER participant — there's
     * no "owner" of a two-person thread. A group can only be deleted by
     * whoever created it, the same restriction rename()/removeMember()
     * already apply to managing it.
     */
    public function deleteConversation($id = null): ResponseInterface
    {
        $auth = Services::authContext();
        $conversationId = (int) $id;

        $conversation = $this->requireActiveParticipant($auth->companyId, $auth->userId, $conversationId);
        if ($conversation === null) {
            return $this->notFound('No such conversation');
        }

        if ($conversation->type === 'group' && ! $this->isGroupCreator($conversation, $auth->userId)) {
            return $this->apiFail('Only the group creator can delete this group', 403);
        }

        model(ChatConversationModel::class)->delete($conversationId);

        return $this->noContentOk('Conversation deleted');
    }

    /** POST /api/v1/chat/direct  body: { recipient_id } — finds or creates the direct conversation with this contact, without sending a message yet (mirrors just opening a thread in any chat app before you've typed anything). */
    public function openDirect(): ResponseInterface
    {
        $auth = Services::authContext();
        $payload = $this->request->getJSON(true) ?? [];
        $recipientId = (int) ($payload['recipient_id'] ?? 0);

        if ($recipientId === $auth->userId) {
            return $this->apiFail('Cannot message yourself', 422);
        }

        if ($this->resolveChatEligibleContact($auth->companyId, $recipientId) === null) {
            return $this->apiFail('Unknown or non-chat-eligible recipient_id', 422);
        }

        $conversationId = model(ChatConversationModel::class)
            ->findOrCreateDirect($auth->companyId, $auth->userId, $recipientId, $auth->userId);

        return $this->ok(['conversation_id' => $conversationId]);
    }

    /** POST /api/v1/chat/groups  body: { name, member_ids: number[] } — the caller is always added as a member alongside whoever else was picked. */
    public function createGroup(): ResponseInterface
    {
        $auth = Services::authContext();
        $payload = $this->request->getJSON(true) ?? [];

        if (! $this->validateData($payload, [
            'name' => ['label' => 'Group name', 'rules' => 'required|max_length[191]'],
        ])) {
            return $this->validationFail($this->validator->getErrors());
        }

        $memberIds = array_values(array_unique(array_map('intval', (array) ($payload['member_ids'] ?? []))));
        $memberIds = array_values(array_filter($memberIds, static fn (int $id) => $id !== $auth->userId));

        if ($memberIds === []) {
            return $this->apiFail('Select at least one other teammate to add', 422);
        }

        foreach ($memberIds as $memberId) {
            if ($this->resolveChatEligibleContact($auth->companyId, $memberId) === null) {
                return $this->apiFail('One or more selected teammates are not available to message', 422);
            }
        }

        $conversationId = model(ChatConversationModel::class)->createGroup(
            $auth->companyId,
            trim((string) $payload['name']),
            $auth->userId,
            $memberIds
        );

        return $this->created(['id' => $conversationId]);
    }

    /** PUT /api/v1/chat/groups/{id}  body: { name } — creator-only. */
    public function renameGroup($id = null): ResponseInterface
    {
        $auth = Services::authContext();
        $conversationId = (int) $id;
        $payload = $this->request->getJSON(true) ?? [];

        $conversation = $this->requireActiveGroupParticipant($auth->companyId, $auth->userId, $conversationId);
        if ($conversation === null) {
            return $this->notFound('No such group');
        }

        if (! $this->isGroupCreator($conversation, $auth->userId)) {
            return $this->apiFail('Only the group creator can rename this group', 403);
        }

        if (! $this->validateData($payload, [
            'name' => ['label' => 'Group name', 'rules' => 'required|max_length[191]'],
        ])) {
            return $this->validationFail($this->validator->getErrors());
        }

        model(ChatConversationModel::class)->rename($conversationId, trim((string) $payload['name']));

        return $this->ok(['id' => $conversationId]);
    }

    /** POST /api/v1/chat/groups/{id}/members  body: { user_id } — any current member may add another chat-eligible teammate. */
    public function addMember($id = null): ResponseInterface
    {
        $auth = Services::authContext();
        $conversationId = (int) $id;
        $payload = $this->request->getJSON(true) ?? [];
        $userId = (int) ($payload['user_id'] ?? 0);

        $conversation = $this->requireActiveGroupParticipant($auth->companyId, $auth->userId, $conversationId);
        if ($conversation === null) {
            return $this->notFound('No such group');
        }

        if ($this->resolveChatEligibleContact($auth->companyId, $userId) === null) {
            return $this->apiFail('Unknown or non-chat-eligible user_id', 422);
        }

        model(ChatConversationParticipantModel::class)->addOrRejoin($conversationId, $userId, $auth->userId);

        return $this->ok(['id' => $conversationId]);
    }

    /** DELETE /api/v1/chat/groups/{id}/members/{userId} — anyone may remove THEMSELVES (leave); removing someone else is creator-only. */
    public function removeMember($id = null, $userId = null): ResponseInterface
    {
        $auth = Services::authContext();
        $conversationId = (int) $id;
        $targetUserId = (int) $userId;

        $conversation = $this->requireActiveGroupParticipant($auth->companyId, $auth->userId, $conversationId);
        if ($conversation === null) {
            return $this->notFound('No such group');
        }

        if ($targetUserId !== $auth->userId && ! $this->isGroupCreator($conversation, $auth->userId)) {
            return $this->apiFail('Only the group creator can remove other members', 403);
        }

        $removed = model(ChatConversationParticipantModel::class)->remove($conversationId, $targetUserId);
        if (! $removed) {
            return $this->notFound('That person is not a member of this group');
        }

        return $this->noContentOk('Removed');
    }

    /** Users in $companyId who are active and hold chat.access — the shared base query behind contacts() and every eligibility check (openDirect, createGroup, addMember) alike. */
    private function chatEligibleUsersQuery(int $companyId)
    {
        return Database::connect()->table('users')
            ->select('users.id, users.name, users.email, users.role_id')
            ->join('roles', 'roles.id = users.role_id')
            ->join('role_permissions', 'role_permissions.role_id = roles.id')
            ->join('permissions', 'permissions.id = role_permissions.permission_id')
            ->where('users.company_id', $companyId)
            ->where('users.is_active', 1)
            ->where('permissions.slug', self::REQUIRED_PERMISSION)
            // A user's role could theoretically hold chat.access via more
            // than one grant path in a customized role — distinct avoids
            // the same person appearing twice in a join like this.
            ->groupBy('users.id');
    }

    private function resolveChatEligibleContact(int $companyId, int $userId): ?object
    {
        if ($userId <= 0) {
            return null;
        }

        return $this->chatEligibleUsersQuery($companyId)->where('users.id', $userId)->get()->getFirstRow();
    }

    /** The conversation, but only if $userId is CURRENTLY an active participant of it — the one rule that governs both viewing and sending (see this class's own docblock for why). */
    private function requireActiveParticipant(int $companyId, int $userId, int $conversationId): ?object
    {
        if ($conversationId <= 0) {
            return null;
        }

        $conversation = model(ChatConversationModel::class)->where('company_id', $companyId)->find($conversationId);
        if ($conversation === null) {
            return null;
        }

        if (! model(ChatConversationParticipantModel::class)->isActiveParticipant($conversationId, $userId)) {
            return null;
        }

        return $conversation;
    }

    private function requireActiveGroupParticipant(int $companyId, int $userId, int $conversationId): ?object
    {
        $conversation = $this->requireActiveParticipant($companyId, $userId, $conversationId);
        if ($conversation === null || $conversation->type !== 'group') {
            return null;
        }

        return $conversation;
    }

    private function isGroupCreator(object $conversation, int $userId): bool
    {
        return $conversation->created_by !== null && (int) $conversation->created_by === $userId;
    }

    /** @param object[] $members activeMembers() rows, already loaded — avoids a second query just to find "the other one" in a 2-person thread. */
    private function directCounterpartName(array $members, int $userId): string
    {
        foreach ($members as $member) {
            if ((int) $member->user_id !== $userId) {
                return $member->name;
            }
        }

        return 'Unknown user';
    }
}
