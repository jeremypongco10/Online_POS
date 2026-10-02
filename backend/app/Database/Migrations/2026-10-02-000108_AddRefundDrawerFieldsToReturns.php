<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Returns are now done at the POS, approved there by a supervisor, and
 * refunded on the spot — so a return records how the money went back
 * (refund_method, a payment method code like the ones on `payments`) and,
 * for a cash refund, which drawer it came out of (cash_session_id). The
 * drawer's expected cash subtracts its completed cash refunds; see
 * CashSessionsController::buildSummary(). Both nullable: returns made
 * before this existed have neither.
 */
class AddRefundDrawerFieldsToReturns extends Migration
{
    public function up()
    {
        $this->forge->addColumn('returns', [
            'refund_method' => ['type' => 'VARCHAR', 'constraint' => 30, 'null' => true, 'after' => 'total_refund'],
            'cash_session_id' => ['type' => 'BIGINT', 'constraint' => 20, 'unsigned' => true, 'null' => true, 'after' => 'refund_method'],
        ]);
        $this->db->query('ALTER TABLE returns ADD INDEX returns_cash_session_id (cash_session_id)');
    }

    public function down()
    {
        $this->db->query('ALTER TABLE returns DROP INDEX returns_cash_session_id');
        $this->forge->dropColumn('returns', ['refund_method', 'cash_session_id']);
    }
}
