<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Phase 19: a return moves pending -> completed only through an
 * explicit approval, same pattern as purchase order approval (Phase
 * 11) — records who approved it and when, distinct from user_id (who
 * requested/created the return).
 */
class AddApprovalToReturns extends Migration
{
    public function up()
    {
        $this->forge->addColumn('returns', [
            'approved_by' => [
                'type' => 'BIGINT',
                'constraint' => 20,
                'unsigned' => true,
                'null' => true,
                'after' => 'user_id',
            ],
            'approved_at' => [
                'type' => 'DATETIME',
                'null' => true,
                'after' => 'return_date',
            ],
        ]);

        // SQLite can't add a FK constraint via ALTER TABLE after table
        // creation at all — the constraint is MySQL-only; SQLite tests
        // run without DB-level enforcement of this particular FK.
        if ($this->db->DBDriver === 'MySQLi') {
            $this->db->query(
                'ALTER TABLE returns ADD CONSTRAINT returns_approved_by_fk FOREIGN KEY (approved_by) REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE'
            );
        }
    }

    public function down()
    {
        if ($this->db->DBDriver === 'MySQLi') {
            $this->db->query('ALTER TABLE returns DROP FOREIGN KEY returns_approved_by_fk');
        }
        $this->forge->dropColumn('returns', ['approved_by', 'approved_at']);
    }
}
