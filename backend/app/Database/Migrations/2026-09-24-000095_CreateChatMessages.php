<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Direct messages between Back Office staff — explicitly NOT reachable
 * from the POS screen or by a Cashier/Cashier Supervisor account (see
 * GrantChatPermissionToExistingRoles: chat.access is granted to Store
 * Manager, Store Admin, Company Admin and Super Admin only, the same split
 * POS_ROLES already draws between "spends their day at the register" and
 * everyone else).
 *
 * A single flat table rather than a conversations table plus a messages
 * table: a conversation here is never more than "the two participants",
 * so it's fully identified by (sender_id, recipient_id) without a join —
 * ChatController derives a contact's thread and a company-wide contact
 * list straight off this table.
 */
class CreateChatMessages extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id' => ['type' => 'BIGINT', 'constraint' => 20, 'unsigned' => true, 'auto_increment' => true],
            'company_id' => ['type' => 'BIGINT', 'constraint' => 20, 'unsigned' => true],
            'sender_id' => ['type' => 'BIGINT', 'constraint' => 20, 'unsigned' => true],
            'recipient_id' => ['type' => 'BIGINT', 'constraint' => 20, 'unsigned' => true],
            'body' => ['type' => 'TEXT'],
            // Null = unread. Stamped the moment the recipient's own
            // GET /chat/messages?with= reads this row, not by any action
            // the sender takes.
            'read_at' => ['type' => 'DATETIME', 'null' => true],
            'created_at' => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addKey('company_id');
        // Both directions of "the thread between these two people",
        // and "my unread count" (recipient_id + read_at IS NULL).
        $this->forge->addKey(['sender_id', 'recipient_id']);
        $this->forge->addKey(['recipient_id', 'sender_id']);
        $this->forge->addKey(['recipient_id', 'read_at']);
        $this->forge->addForeignKey('company_id', 'companies', 'id', 'CASCADE', 'CASCADE');
        // RESTRICT, matching sales.user_id — this system never hard-deletes
        // a user (UsersController only deactivates one), so this is a
        // defensive backstop rather than something normal use ever hits.
        $this->forge->addForeignKey('sender_id', 'users', 'id', 'RESTRICT', 'CASCADE');
        $this->forge->addForeignKey('recipient_id', 'users', 'id', 'RESTRICT', 'CASCADE');
        $this->forge->createTable('chat_messages', false, ($this->db->DBDriver === 'MySQLi' ? ['ENGINE' => 'InnoDB'] : []));
    }

    public function down()
    {
        $this->forge->dropTable('chat_messages', true);
    }
}
