<?php

namespace App\Models;

use CodeIgniter\Model;

/**
 * Membership of a chat_conversations row. A participant row is kept (not
 * deleted) when someone leaves or is removed — left_at is stamped instead
 * — so messages they sent while still a member keep a valid sender to
 * attribute to, and re-adding the same person later is a plain UPDATE
 * (see addOrRejoin()) rather than a second, duplicate row.
 */
class ChatConversationParticipantModel extends Model
{
    protected $table = 'chat_conversation_participants';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'object';
    protected $useTimestamps = false;
    protected $allowedFields = ['conversation_id', 'user_id', 'joined_at', 'left_at', 'last_read_message_id', 'added_by'];

    public function isActiveParticipant(int $conversationId, int $userId): bool
    {
        return $this->where('conversation_id', $conversationId)
            ->where('user_id', $userId)
            ->where('left_at', null)
            ->countAllResults() > 0;
    }

    /** Currently-active (not left) members of a conversation, joined to users for display. */
    public function activeMembers(int $conversationId): array
    {
        return $this->db->table('chat_conversation_participants cp')
            ->select('cp.user_id, cp.joined_at, u.name, u.email')
            ->join('users u', 'u.id = cp.user_id')
            ->where('cp.conversation_id', $conversationId)
            ->where('cp.left_at', null)
            ->orderBy('u.name', 'ASC')
            ->get()->getResult();
    }

    /**
     * Adds $userId to a conversation, or — if they were a member before and
     * left — clears left_at on their existing row instead of inserting a
     * second one (the unique key on (conversation_id, user_id) means a
     * plain insert() would fail here on a re-add).
     */
    public function addOrRejoin(int $conversationId, int $userId, int $addedBy): void
    {
        $existing = $this->where('conversation_id', $conversationId)->where('user_id', $userId)->first();
        if ($existing !== null) {
            $this->update($existing->id, [
                'left_at' => null,
                'joined_at' => date('Y-m-d H:i:s'),
                'added_by' => $addedBy,
            ]);

            return;
        }

        $this->insert([
            'conversation_id' => $conversationId,
            'user_id' => $userId,
            'joined_at' => date('Y-m-d H:i:s'),
            'left_at' => null,
            'last_read_message_id' => null,
            'added_by' => $addedBy,
        ]);
    }

    /** @return bool whether an active membership row was actually found and removed */
    public function remove(int $conversationId, int $userId): bool
    {
        $this->db->table('chat_conversation_participants')
            ->where('conversation_id', $conversationId)
            ->where('user_id', $userId)
            ->where('left_at', null)
            ->update(['left_at' => date('Y-m-d H:i:s')]);

        return $this->db->affectedRows() > 0;
    }

    /** Advances $userId's read cursor to the newest message currently in the conversation — a no-op (not a rewind) if there are no messages yet. */
    public function markRead(int $conversationId, int $userId): void
    {
        $latest = $this->db->table('chat_messages')
            ->selectMax('id')
            ->where('conversation_id', $conversationId)
            ->get()->getRow();

        if ($latest === null || $latest->id === null) {
            return;
        }

        $this->db->table('chat_conversation_participants')
            ->where('conversation_id', $conversationId)
            ->where('user_id', $userId)
            ->update(['last_read_message_id' => (int) $latest->id]);
    }
}
