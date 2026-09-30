<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Chat gets a real conversation concept (see CreateChatConversations) so a
 * thread can hold more than two people — a message now belongs to a
 * conversation_id instead of carrying its own fixed sender/recipient pair,
 * and per-participant read state moved to
 * chat_conversation_participants.last_read_at (a single read_at column on
 * the message only ever worked for exactly two participants).
 *
 * Chat launched earlier this same session and has never held anything
 * beyond QA/test fixtures, so this drops and recreates chat_messages
 * outright — a column-by-column ALTER (drop recipient_id/read_at, add
 * conversation_id) isn't something CI4's SQLite Forge can actually do in
 * one step once a foreign key is involved (its column-drop rebuild doesn't
 * carry the old FK list forward), and there's no real history here worth
 * preserving through that complexity anyway. Anywhere this ships to an
 * install with genuine chat history already in production, that
 * assumption would need revisiting before running this migration.
 */
class RestructureChatMessagesForConversations extends Migration
{
    public function up()
    {
        $this->forge->dropTable('chat_messages', true);

        $this->forge->addField([
            'id' => ['type' => 'BIGINT', 'constraint' => 20, 'unsigned' => true, 'auto_increment' => true],
            'company_id' => ['type' => 'BIGINT', 'constraint' => 20, 'unsigned' => true],
            'conversation_id' => ['type' => 'BIGINT', 'constraint' => 20, 'unsigned' => true],
            'sender_id' => ['type' => 'BIGINT', 'constraint' => 20, 'unsigned' => true],
            'body' => ['type' => 'TEXT'],
            // Soft delete with the body actually cleared, not left in
            // place behind a flag — see the original AddDeletedAtToChatMessages
            // for the full reasoning, carried over unchanged here.
            'deleted_at' => ['type' => 'DATETIME', 'null' => true],
            'created_at' => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addKey('company_id');
        // The thread view ("this conversation's messages, oldest/newest
        // first") and pruneOlderThan()'s own age scan are the two lookups
        // this table exists to serve.
        $this->forge->addKey(['conversation_id', 'created_at']);
        $this->forge->addForeignKey('company_id', 'companies', 'id', 'CASCADE', 'CASCADE');
        $this->forge->addForeignKey('conversation_id', 'chat_conversations', 'id', 'CASCADE', 'CASCADE');
        // RESTRICT, matching sales.user_id — this system never hard-deletes
        // a user (UsersController only deactivates one), so this is a
        // defensive backstop rather than something normal use ever hits.
        $this->forge->addForeignKey('sender_id', 'users', 'id', 'RESTRICT', 'CASCADE');
        $this->forge->createTable('chat_messages', false, ($this->db->DBDriver === 'MySQLi' ? ['ENGINE' => 'InnoDB'] : []));
    }

    public function down()
    {
        $this->forge->dropTable('chat_messages', true);

        $this->forge->addField([
            'id' => ['type' => 'BIGINT', 'constraint' => 20, 'unsigned' => true, 'auto_increment' => true],
            'company_id' => ['type' => 'BIGINT', 'constraint' => 20, 'unsigned' => true],
            'sender_id' => ['type' => 'BIGINT', 'constraint' => 20, 'unsigned' => true],
            'recipient_id' => ['type' => 'BIGINT', 'constraint' => 20, 'unsigned' => true],
            'body' => ['type' => 'TEXT'],
            'read_at' => ['type' => 'DATETIME', 'null' => true],
            'deleted_at' => ['type' => 'DATETIME', 'null' => true],
            'created_at' => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addKey('company_id');
        $this->forge->addKey(['sender_id', 'recipient_id']);
        $this->forge->addKey(['recipient_id', 'sender_id']);
        $this->forge->addKey(['recipient_id', 'read_at']);
        $this->forge->addForeignKey('company_id', 'companies', 'id', 'CASCADE', 'CASCADE');
        $this->forge->addForeignKey('sender_id', 'users', 'id', 'RESTRICT', 'CASCADE');
        $this->forge->addForeignKey('recipient_id', 'users', 'id', 'RESTRICT', 'CASCADE');
        $this->forge->createTable('chat_messages', false, ($this->db->DBDriver === 'MySQLi' ? ['ENGINE' => 'InnoDB'] : []));
    }
}
