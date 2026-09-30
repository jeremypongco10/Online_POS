<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Corrects a parameter-order mistake repeated across many earlier
 * migrations. CodeIgniter's `Forge::addForeignKey()` signature is
 * `($fieldName, $tableName, $tableField, $onUpdate, $onDelete)` —
 * onUpdate FOURTH, onDelete FIFTH. Every FK referencing `users.id` added
 * via that helper was written as e.g.
 * `addForeignKey('user_id', 'users', 'id', 'RESTRICT', 'CASCADE')`,
 * clearly intending "block deleting a referenced user, cascade doesn't
 * matter for update since a PK never changes" — but that actually
 * produced `ON UPDATE RESTRICT ON DELETE CASCADE`, the exact opposite of
 * every one of those migrations' own stated intent (see e.g.
 * CreateChatMessages: "RESTRICT... this system never hard-deletes a
 * user... a defensive backstop"). Since nothing ever actually deleted a
 * user until UsersController::delete() (added alongside this migration —
 * see AddUsersDeletePermission), the bug stayed completely dormant: it
 * only matters the moment something tries to DELETE a users row, and
 * until now nothing did.
 *
 * Two intended shapes, both now corrected to `ON UPDATE CASCADE` (still
 * irrelevant in practice — a user's id never changes) with the RIGHT
 * onDelete action:
 *   - RESTRICT: content whose existence depends on knowing who it belongs
 *     to (a sale, a cash session, a sent chat message, a return, a
 *     conversation membership row) — deleting that user must be blocked
 *     outright rather than silently destroying the record.
 *   - SET NULL: attribution-only metadata (who created/approved/
 *     generated something) — deleting that user should just anonymize
 *     the record, never destroy business/audit history that has to
 *     survive personnel changes (audit_logs and z_readings especially:
 *     an audit trail or a BIR Z-reading disappearing because the person
 *     who triggered it was later removed would defeat the entire point
 *     of keeping one).
 *
 * The three FKs written by hand as raw SQL instead of this helper
 * (sales.bagger_id, purchase_orders.approved_by, returns.approved_by)
 * already got the clause order right and are untouched here.
 *
 * MySQL-only: SQLite has no ALTER TABLE support for changing an existing
 * foreign key's ON DELETE/ON UPDATE action short of rebuilding the whole
 * table, which isn't worth doing for a test database that already
 * rebuilds fresh from these same migrations every run — and
 * UsersController::delete()'s own pre-delete existence checks (not
 * database-level FK enforcement) are what the test suite actually
 * exercises for "deleting a user with history is blocked" either way.
 */
class FixUsersForeignKeyDeleteRules extends Migration
{
    /** @var list<array{0: string, 1: string, 2: string, 3: 'RESTRICT'|'SET NULL'}> [table, column, fkName, correctOnDelete] */
    private const FIXES = [
        ['cash_sessions', 'user_id', 'cash_sessions_user_id_foreign', 'RESTRICT'],
        ['inventory_transactions', 'user_id', 'inventory_transactions_user_id_foreign', 'SET NULL'],
        ['purchase_orders', 'user_id', 'purchase_orders_user_id_foreign', 'SET NULL'],
        ['sales', 'user_id', 'sales_user_id_foreign', 'RESTRICT'],
        ['returns', 'user_id', 'returns_user_id_foreign', 'RESTRICT'],
        ['cash_movements', 'user_id', 'cash_movements_user_id_foreign', 'SET NULL'],
        ['loyalty_point_transactions', 'created_by', 'loyalty_point_transactions_created_by_foreign', 'SET NULL'],
        ['audit_logs', 'user_id', 'audit_logs_user_id_foreign', 'SET NULL'],
        ['invoice_series', 'created_by', 'invoice_series_created_by_foreign', 'SET NULL'],
        ['invoice_series', 'updated_by', 'invoice_series_updated_by_foreign', 'SET NULL'],
        ['z_readings', 'generated_by', 'z_readings_generated_by_foreign', 'SET NULL'],
        ['chat_messages', 'sender_id', 'chat_messages_sender_id_foreign', 'RESTRICT'],
        ['chat_conversations', 'created_by', 'chat_conversations_created_by_foreign', 'SET NULL'],
        ['chat_conversation_participants', 'user_id', 'chat_conversation_participants_user_id_foreign', 'RESTRICT'],
        ['chat_conversation_participants', 'added_by', 'chat_conversation_participants_added_by_foreign', 'SET NULL'],
    ];

    public function up()
    {
        if ($this->db->DBDriver !== 'MySQLi') {
            return;
        }

        foreach (self::FIXES as [$table, $column, $fkName, $onDelete]) {
            $this->db->query("ALTER TABLE {$table} DROP FOREIGN KEY {$fkName}");
            $this->db->query(
                "ALTER TABLE {$table} ADD CONSTRAINT {$fkName} FOREIGN KEY ({$column}) REFERENCES users (id) "
                . "ON DELETE {$onDelete} ON UPDATE CASCADE"
            );
        }
    }

    public function down()
    {
        if ($this->db->DBDriver !== 'MySQLi') {
            return;
        }

        // Restores the exact (wrong) pre-fix shape every one of these had
        // — onDelete was always CASCADE, onUpdate carried whatever value
        // was meant for onDelete — since a down() migration's job is
        // undoing up(), not re-deciding what "correct" means.
        foreach (self::FIXES as [$table, $column, $fkName, $correctOnDelete]) {
            $this->db->query("ALTER TABLE {$table} DROP FOREIGN KEY {$fkName}");
            $this->db->query(
                "ALTER TABLE {$table} ADD CONSTRAINT {$fkName} FOREIGN KEY ({$column}) REFERENCES users (id) "
                . "ON DELETE CASCADE ON UPDATE {$correctOnDelete}"
            );
        }
    }
}
