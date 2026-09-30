<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * A sender deleting their own message — see ChatController::delete().
 *
 * Soft delete with the body actually cleared, not left in place behind a
 * flag: someone deleting a message is often doing it BECAUSE of what's in
 * it (pasted the wrong thing, a typo that changed the meaning), so a
 * "delete" that left the real text sitting in the database would not
 * actually be honouring the request. deleted_at stays as a tombstone —
 * the recipient sees "This message was deleted" in its place instead of
 * the row silently vanishing out from under a thread they might be
 * looking at right now, which reads as a bug rather than a deliberate
 * removal.
 */
class AddDeletedAtToChatMessages extends Migration
{
    public function up()
    {
        $this->forge->addColumn('chat_messages', [
            'deleted_at' => ['type' => 'DATETIME', 'null' => true, 'after' => 'read_at'],
        ]);
    }

    public function down()
    {
        $this->forge->dropColumn('chat_messages', ['deleted_at']);
    }
}
