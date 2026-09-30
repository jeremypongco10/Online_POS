<?php

namespace App\Models;

use CodeIgniter\Model;

/** A single message inside a chat_conversations thread — see ChatConversationModel for the thread-level logic (who's in it, unread counts, the list preview). */
class ChatMessageModel extends Model
{
    /** How long a message is kept before it's eligible for automatic deletion — see pruneOlderThan() and ChatController::maybePrune(). */
    public const RETENTION_MONTHS = 3;

    protected $table = 'chat_messages';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'object';
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    // No updatedField: a message is never edited after sending, and
    // deleted_at is written directly through the query builder (see
    // softDelete()) rather than through update(), for the same reason
    // failed_login_attempts/locked_until bypass UserModel's own update() —
    // it must never be settable through a generic mass-assignable path.
    protected $updatedField = '';

    protected $allowedFields = ['company_id', 'conversation_id', 'sender_id', 'body'];

    protected $validationRules = [
        'company_id' => ['label' => 'Company', 'rules' => 'required|is_natural_no_zero'],
        'conversation_id' => ['label' => 'Conversation', 'rules' => 'required|is_natural_no_zero'],
        'sender_id' => ['label' => 'Sender', 'rules' => 'required|is_natural_no_zero'],
        'body' => ['label' => 'Message', 'rules' => 'required|max_length[4000]'],
    ];

    /** A conversation's messages, oldest first (how a chat reads top to bottom) — the caller (ChatController::messages()) fetches DESC+LIMIT then reverses, same as before. */
    public function messagesIn(int $conversationId, int $limit = 100): array
    {
        return $this->db->table('chat_messages cm')
            ->select('cm.id, cm.company_id, cm.conversation_id, cm.sender_id, cm.body, cm.deleted_at, cm.created_at, u.name AS sender_name')
            ->join('users u', 'u.id = cm.sender_id')
            ->where('cm.conversation_id', $conversationId)
            ->orderBy('cm.id', 'DESC')
            ->limit($limit)
            ->get()->getResult();
    }

    /**
     * A sender deleting their own message — see ChatController::delete().
     * Ownership is enforced IN the WHERE clause, not by a separate check
     * beforehand: $senderId has to be the row's own sender_id for the
     * UPDATE to match anything at all, so there's no window where a
     * lookup says "yours" and the write runs against a row that wasn't.
     * Already-deleted is excluded too, so a repeat call is a no-op rather
     * than re-stamping deleted_at.
     *
     * @return bool whether a row was actually deleted — false covers
     *              "no such message", "not this sender's", and "already deleted" alike, none of which the caller needs to tell apart
     */
    public function softDelete(int $companyId, int $messageId, int $senderId): bool
    {
        $this->db->table('chat_messages')
            ->where('id', $messageId)
            ->where('company_id', $companyId)
            ->where('sender_id', $senderId)
            ->where('deleted_at', null)
            ->update(['body' => '', 'deleted_at' => date('Y-m-d H:i:s')]);

        return $this->db->affectedRows() > 0;
    }

    /**
     * Permanently deletes every message older than RETENTION_MONTHS,
     * across every company — a message's age is the only thing that ever
     * makes it eligible, there's no per-company opt-out. Called two ways:
     * opportunistically on ordinary chat traffic (ChatController::
     * maybePrune(), throttled via cache so it isn't a real DELETE on every
     * request) and explicitly via `php spark chat:prune` for anyone
     * running that off a real cron instead. Both call this same method,
     * so the two can never drift on what "too old" means.
     *
     * @return int rows deleted
     */
    public function pruneOlderThan(int $months = self::RETENTION_MONTHS): int
    {
        $cutoff = date('Y-m-d H:i:s', strtotime("-{$months} months"));

        $this->db->table('chat_messages')->where('created_at <', $cutoff)->delete();

        return $this->db->affectedRows();
    }
}
