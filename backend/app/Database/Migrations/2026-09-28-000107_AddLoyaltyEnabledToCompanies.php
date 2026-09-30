<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Master switch for the whole Customer Loyalty feature (points + loyalty
 * card), separate from loyalty_points_per_100 (the earn RATE). A company
 * can already effectively stop earning new points by setting the rate to
 * 0, but that leaves every points/card UI (the POS's Loyalty points block,
 * Customers' Points column and history, the per-row points chip) fully
 * visible — this flag is what actually hides all of that, for a business
 * that doesn't run a loyalty program at all rather than one that's just
 * between rates. Default 1 (on) so an existing install's behavior doesn't
 * change the moment this migration runs.
 */
class AddLoyaltyEnabledToCompanies extends Migration
{
    public function up()
    {
        $this->forge->addColumn('companies', [
            'loyalty_enabled' => ['type' => 'TINYINT', 'constraint' => 1, 'unsigned' => true, 'default' => 1, 'after' => 'loyalty_points_per_100'],
        ]);
    }

    public function down()
    {
        $this->forge->dropColumn('companies', 'loyalty_enabled');
    }
}
