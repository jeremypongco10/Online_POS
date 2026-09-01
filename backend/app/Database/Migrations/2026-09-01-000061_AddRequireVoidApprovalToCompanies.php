<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Company-wide policy switch: whether voiding a cart line or cancelling
 * an in-progress sale needs a supervisor (sales.void) to authorize it —
 * see SalesController::authorizeItemVoid()/authorizeCartVoid(). Defaults
 * to 1 (required) rather than 0 — the void/cancel-approval feature
 * shipped as always-on before this setting existed, so the safe default
 * preserves that behaviour for every existing company instead of
 * silently turning the control off underneath them.
 */
class AddRequireVoidApprovalToCompanies extends Migration
{
    public function up()
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
    }

    public function down()
    {
        $this->forge->dropColumn('companies', ['require_void_approval']);
    }
}
