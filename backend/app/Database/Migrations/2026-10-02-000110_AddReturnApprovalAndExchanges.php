<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Two things for returns at the POS:
 *
 * - companies.require_return_approval: whether a supervisor has to sign
 *   off on a return or replacement before it goes through, set under
 *   Settings → Security beside the void and cancel switches. Defaults to
 *   1 (required) — a return hands money or goods back, so it starts
 *   guarded, like cancelling a sale.
 *
 * - returns.exchange_sale_id: a return settled as a replacement gives an
 *   exchange credit instead of money; this links it to the sale the credit
 *   was spent on, so a credit can be used exactly once. Null while unused,
 *   and on every ordinary refund.
 */
class AddReturnApprovalAndExchanges extends Migration
{
    public function up()
    {
        $this->forge->addColumn('companies', [
            'require_return_approval' => ['type' => 'TINYINT', 'constraint' => 1, 'unsigned' => true, 'default' => 1, 'after' => 'require_cancel_approval'],
        ]);
        $this->forge->addColumn('returns', [
            'exchange_sale_id' => ['type' => 'BIGINT', 'constraint' => 20, 'unsigned' => true, 'null' => true, 'after' => 'cash_session_id'],
        ]);
        $this->db->query('ALTER TABLE returns ADD INDEX returns_exchange_sale_id (exchange_sale_id)');
    }

    public function down()
    {
        $this->db->query('ALTER TABLE returns DROP INDEX returns_exchange_sale_id');
        $this->forge->dropColumn('returns', 'exchange_sale_id');
        $this->forge->dropColumn('companies', 'require_return_approval');
    }
}
