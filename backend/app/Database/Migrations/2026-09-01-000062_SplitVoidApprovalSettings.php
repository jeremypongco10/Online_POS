<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Splits the single require_void_approval switch into two, because the
 * two actions it covered carry very different risk:
 *
 *  - Voiding ONE cart line is a correction. Nothing is recorded yet (no
 *    OR issued, no sale row), mis-scans are constant, and gating every
 *    one behind a supervisor password reliably ends with the supervisor
 *    handing out that password — at which point the control is theatre
 *    AND attribution is gone, since every void then reads as approved.
 *    Defaults to 0: allowed, but still written to the audit trail (see
 *    SalesController::logVoid).
 *
 *  - Cancelling the WHOLE cart is rare and high-signal, so the friction
 *    is cheap and the alarm means something. Defaults to 1.
 *
 * The old column's value carries over to the cancel side, which is the
 * stricter of the two — no company silently loses a control it had.
 */
class SplitVoidApprovalSettings extends Migration
{
    public function up()
    {
        $this->forge->addColumn('companies', [
            'require_item_void_approval' => [
                'type' => 'TINYINT',
                'unsigned' => true,
                'null' => false,
                'default' => 0,
                'after' => 'require_void_approval',
            ],
            'require_cancel_approval' => [
                'type' => 'TINYINT',
                'unsigned' => true,
                'null' => false,
                'default' => 1,
                'after' => 'require_item_void_approval',
            ],
        ]);

        $this->db->query('UPDATE companies SET require_cancel_approval = require_void_approval');

        $this->forge->dropColumn('companies', ['require_void_approval']);
    }

    public function down()
    {
        $this->forge->addColumn('companies', [
            'require_void_approval' => [
                'type' => 'TINYINT',
                'unsigned' => true,
                'null' => false,
                'default' => 1,
                'after' => 'loyalty_points_per_100',
            ],
        ]);

        // Collapsing two flags back into one can't be lossless; the cancel
        // side wins because it's the stricter setting, matching how up()
        // seeded it.
        $this->db->query('UPDATE companies SET require_void_approval = require_cancel_approval');

        $this->forge->dropColumn('companies', ['require_item_void_approval', 'require_cancel_approval']);
    }
}
