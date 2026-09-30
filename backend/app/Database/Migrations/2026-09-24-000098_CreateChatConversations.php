<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Conversations now sit between chat_messages and their participants,
 * replacing the fixed (sender_id, recipient_id) pair a message used to
 * carry directly — see RestructureChatMessagesForConversations for that
 * half. A 'direct' conversation is still exactly two participants (the
 * same behaviour as before this table existed); a 'group' conversation is
 * however many were added, with membership editable afterwards by any
 * current participant (see ChatController::addMember()/removeMember()).
 *
 * `last_message_at` is denormalized onto the conversation row purely so
 * the conversation list can ORDER BY it directly without joining back into
 * chat_messages for a MAX(created_at) on every request.
 */
class CreateChatConversations extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id' => ['type' => 'BIGINT', 'constraint' => 20, 'unsigned' => true, 'auto_increment' => true],
            'company_id' => ['type' => 'BIGINT', 'constraint' => 20, 'unsigned' => true],
            'type' => ['type' => 'ENUM', 'constraint' => ['direct', 'group'], 'default' => 'direct'],
            // Only meaningful for a group; a direct conversation is always
            // displayed under the other participant's own name instead.
            'name' => ['type' => 'VARCHAR', 'constraint' => 191, 'null' => true],
            'created_by' => ['type' => 'BIGINT', 'constraint' => 20, 'unsigned' => true, 'null' => true],
            'last_message_at' => ['type' => 'DATETIME', 'null' => true],
            'created_at' => ['type' => 'DATETIME', 'null' => true],
            'updated_at' => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addKey(['company_id', 'type']);
        $this->forge->addForeignKey('company_id', 'companies', 'id', 'CASCADE', 'CASCADE');
        // SET NULL, not RESTRICT: a group conversation must survive its
        // creator later being deactivated (this app never hard-deletes a
        // user — see every other created_by/updated_by FK), it just loses
        // the "created by" attribution.
        $this->forge->addForeignKey('created_by', 'users', 'id', 'SET NULL', 'CASCADE');
        $this->forge->createTable('chat_conversations', false, ($this->db->DBDriver === 'MySQLi' ? ['ENGINE' => 'InnoDB'] : []));

        $this->forge->addField([
            'id' => ['type' => 'BIGINT', 'constraint' => 20, 'unsigned' => true, 'auto_increment' => true],
            'conversation_id' => ['type' => 'BIGINT', 'constraint' => 20, 'unsigned' => true],
            'user_id' => ['type' => 'BIGINT', 'constraint' => 20, 'unsigned' => true],
            'joined_at' => ['type' => 'DATETIME', 'null' => true],
            // Non-null = this person is no longer a member. The row is
            // kept rather than removed so messages they sent while still a
            // member keep a valid sender to attribute to, and re-adding
            // the same person later is an UPDATE (clear left_at) instead
            // of a second, duplicate row.
            'left_at' => ['type' => 'DATETIME', 'null' => true],
            // Per-participant read tracking — this is what a single
            // message-level read_at column couldn't do once a conversation
            // can have more than two people in it. NULL = never opened.
            // An id cursor (the highest chat_messages.id that existed at
            // the moment this was last marked read), not a timestamp: two
            // messages sent within the same second have identical
            // DATETIME-precision created_at values, so "unread = created
            // after I last read" would silently miss one of them — id
            // ordering has no such collision.
            'last_read_message_id' => ['type' => 'BIGINT', 'constraint' => 20, 'unsigned' => true, 'null' => true],
            'added_by' => ['type' => 'BIGINT', 'constraint' => 20, 'unsigned' => true, 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addUniqueKey(['conversation_id', 'user_id']);
        // "My active conversations" and "who's currently in this
        // conversation" are the two lookups this table exists to serve.
        $this->forge->addKey(['user_id', 'left_at']);
        $this->forge->addKey(['conversation_id', 'left_at']);
        $this->forge->addForeignKey('conversation_id', 'chat_conversations', 'id', 'CASCADE', 'CASCADE');
        $this->forge->addForeignKey('user_id', 'users', 'id', 'RESTRICT', 'CASCADE');
        $this->forge->addForeignKey('added_by', 'users', 'id', 'SET NULL', 'CASCADE');
        $this->forge->createTable('chat_conversation_participants', false, ($this->db->DBDriver === 'MySQLi' ? ['ENGINE' => 'InnoDB'] : []));
    }

    public function down()
    {
        $this->forge->dropTable('chat_conversation_participants', true);
        $this->forge->dropTable('chat_conversations', true);
    }
}
