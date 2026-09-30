<?php

namespace App\Models;

use CodeIgniter\Model;

/**
 * A chat thread — either 'direct' (exactly two participants, fixed for
 * the life of the conversation) or 'group' (however many were added, with
 * membership editable afterwards — see ChatConversationParticipantModel).
 * A message itself only ever carries a conversation_id + sender_id; every
 * "who's in this thread" and "what's it called" question is answered here.
 */
class ChatConversationModel extends Model
{
    protected $table = 'chat_conversations';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'object';
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';
    protected $allowedFields = ['company_id', 'type', 'name', 'created_by', 'last_message_at'];

    protected $validationRules = [
        'company_id' => ['label' => 'Company', 'rules' => 'required|is_natural_no_zero'],
        'type' => ['label' => 'Type', 'rules' => 'required|in_list[direct,group]'],
        'name' => ['label' => 'Name', 'rules' => 'permit_empty|max_length[191]'],
    ];

    public function touchLastMessageAt(int $id): void
    {
        $this->update($id, ['last_message_at' => date('Y-m-d H:i:s')]);
    }

    public function rename(int $id, string $name): void
    {
        $this->update($id, ['name' => $name]);
    }

    /**
     * Finds the existing direct conversation between these two users, or
     * creates one — a direct conversation is always exactly these two
     * participants, so (company_id, type='direct', these two members)
     * fully identifies it; two people are never split across more than
     * one direct thread.
     */
    public function findOrCreateDirect(int $companyId, int $userA, int $userB, int $createdBy): int
    {
        $db = $this->db;

        $existing = $db->table('chat_conversations c')
            ->select('c.id')
            ->join('chat_conversation_participants cp1', 'cp1.conversation_id = c.id AND cp1.user_id = ' . (int) $userA, 'inner', false)
            ->join('chat_conversation_participants cp2', 'cp2.conversation_id = c.id AND cp2.user_id = ' . (int) $userB, 'inner', false)
            ->where('c.company_id', $companyId)
            ->where('c.type', 'direct')
            ->get()->getFirstRow();

        if ($existing !== null) {
            return (int) $existing->id;
        }

        $id = (int) $this->insert([
            'company_id' => $companyId,
            'type' => 'direct',
            'name' => null,
            'created_by' => $createdBy,
        ], true);

        $participants = model(ChatConversationParticipantModel::class);
        $participants->addOrRejoin($id, $userA, $createdBy);
        $participants->addOrRejoin($id, $userB, $createdBy);

        return $id;
    }

    /** @param int[] $memberUserIds every OTHER member besides the creator, who is always added too */
    public function createGroup(int $companyId, string $name, int $createdBy, array $memberUserIds): int
    {
        $id = (int) $this->insert([
            'company_id' => $companyId,
            'type' => 'group',
            'name' => $name,
            'created_by' => $createdBy,
        ], true);

        $participants = model(ChatConversationParticipantModel::class);
        $participants->addOrRejoin($id, $createdBy, $createdBy);
        foreach ($memberUserIds as $userId) {
            if ($userId !== $createdBy) {
                $participants->addOrRejoin($id, $userId, $createdBy);
            }
        }

        return $id;
    }

    /**
     * Every conversation $userId is CURRENTLY (not left) a part of, most
     * recently active first — the conversation list's own row shape, not
     * a bare list of conversation rows.
     */
    public function conversationsFor(int $companyId, int $userId): array
    {
        $db = $this->db;

        $rows = $db->table('chat_conversations c')
            ->select('c.id, c.type, c.name, c.last_message_at, cp.last_read_message_id')
            ->join('chat_conversation_participants cp', 'cp.conversation_id = c.id', 'inner')
            ->where('c.company_id', $companyId)
            ->where('cp.user_id', $userId)
            ->where('cp.left_at', null)
            ->orderBy('c.last_message_at', 'DESC')
            ->get()->getResult();

        if ($rows === []) {
            return [];
        }

        $ids = array_map(static fn ($row) => (int) $row->id, $rows);
        $lastMessages = $this->lastMessagesFor($ids);
        $directNames = $this->directCounterpartNamesFor($userId, $ids);
        $memberCounts = $this->memberCountsFor($ids);

        return array_map(function ($row) use ($lastMessages, $directNames, $memberCounts, $userId) {
            $id = (int) $row->id;
            $last = $lastMessages[$id] ?? null;

            return [
                'id' => $id,
                'type' => $row->type,
                'name' => $row->type === 'group' ? $row->name : ($directNames[$id] ?? 'Unknown user'),
                'member_count' => $memberCounts[$id] ?? 1,
                'last_message' => $last->body ?? '',
                // The list preview needs to say so too, not just the
                // thread view — otherwise the last line shown for a
                // conversation would just go blank (body is actually
                // cleared, not merely hidden — see AddDeletedAtToChatMessages)
                // with nothing explaining why.
                'last_message_deleted' => $last !== null && $last->deleted_at !== null,
                'last_message_at' => $row->last_message_at,
                'last_message_from_me' => $last !== null && (int) $last->sender_id === $userId,
                'last_message_sender_name' => $last->sender_name ?? null,
                'unread_count' => $this->unreadCountFor($id, $userId, $row->last_read_message_id),
            ];
        }, $rows);
    }

    public function totalUnread(int $companyId, int $userId): int
    {
        return array_sum(array_column($this->conversationsFor($companyId, $userId), 'unread_count'));
    }

    /** @param int[] $conversationIds @return array<int,object> conversation_id => last message row (with sender_name) */
    private function lastMessagesFor(array $conversationIds): array
    {
        if ($conversationIds === []) {
            return [];
        }

        $db = $this->db;
        $latestIds = $db->table('chat_messages')
            ->select('conversation_id, MAX(id) AS latest_id')
            ->whereIn('conversation_id', $conversationIds)
            ->groupBy('conversation_id')
            ->getCompiledSelect();

        $rows = $db->table('chat_messages cm')
            ->select('cm.conversation_id, cm.sender_id, cm.body, cm.deleted_at, u.name AS sender_name')
            ->join("({$latestIds}) lc", 'lc.latest_id = cm.id', 'inner', false)
            ->join('users u', 'u.id = cm.sender_id')
            ->get()->getResult();

        $out = [];
        foreach ($rows as $row) {
            $out[(int) $row->conversation_id] = $row;
        }

        return $out;
    }

    /** @param int[] $conversationIds @return array<int,string> conversation_id => the OTHER participant's name, for 'direct' rows only */
    private function directCounterpartNamesFor(int $userId, array $conversationIds): array
    {
        if ($conversationIds === []) {
            return [];
        }

        $rows = $this->db->table('chat_conversation_participants cp')
            ->select('cp.conversation_id, u.name')
            ->join('chat_conversations c', 'c.id = cp.conversation_id')
            ->join('users u', 'u.id = cp.user_id')
            ->whereIn('cp.conversation_id', $conversationIds)
            ->where('c.type', 'direct')
            ->where('cp.user_id !=', $userId)
            ->get()->getResult();

        $out = [];
        foreach ($rows as $row) {
            $out[(int) $row->conversation_id] = $row->name;
        }

        return $out;
    }

    /** @param int[] $conversationIds @return array<int,int> conversation_id => count of currently-active members */
    private function memberCountsFor(array $conversationIds): array
    {
        if ($conversationIds === []) {
            return [];
        }

        $rows = $this->db->table('chat_conversation_participants')
            ->select('conversation_id, COUNT(*) AS cnt', false)
            ->whereIn('conversation_id', $conversationIds)
            ->where('left_at', null)
            ->groupBy('conversation_id')
            ->get()->getResult();

        $out = [];
        foreach ($rows as $row) {
            $out[(int) $row->conversation_id] = (int) $row->cnt;
        }

        return $out;
    }

    /**
     * Messages in this conversation from anyone OTHER than $userId, with
     * an id past $userId's own read cursor for it (or all of them, if
     * they've never opened it) — an id cursor rather than a created_at
     * timestamp comparison, since two messages sent within the same
     * second would otherwise be indistinguishable by DATETIME precision
     * alone (see CreateChatConversations' own note on last_read_message_id).
     * A small, per-conversation query rather than one clever batched one,
     * since a Back Office team's conversation count is never large enough
     * for the difference to matter.
     */
    private function unreadCountFor(int $conversationId, int $userId, ?int $lastReadMessageId): int
    {
        $builder = $this->db->table('chat_messages')
            ->where('conversation_id', $conversationId)
            ->where('sender_id !=', $userId)
            ->where('deleted_at', null);

        if ($lastReadMessageId !== null) {
            $builder->where('id >', $lastReadMessageId);
        }

        return $builder->countAllResults();
    }
}
