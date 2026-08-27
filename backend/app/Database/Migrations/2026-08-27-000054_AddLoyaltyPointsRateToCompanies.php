<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * A single flat, company-wide earn rate — "N points per ₱100 spent" — used
 * by SalesController::create() to award loyalty points automatically on
 * every completed sale that has a customer attached. Zero (the default)
 * means points aren't awarded at all until a company opts in by setting a
 * rate in Settings. Deliberately not a per-product rate — see the
 * migration/PR notes for why a flat company-wide rate is the v1 here.
 */
class AddLoyaltyPointsRateToCompanies extends Migration
{
    public function up()
    {
        $this->forge->addColumn('companies', [
            'loyalty_points_per_100' => [
                'type' => 'INT',
                'unsigned' => true,
                'null' => false,
                'default' => 0,
                'after' => 'timezone',
            ],
        ]);
    }

    public function down()
    {
        $this->forge->dropColumn('companies', ['loyalty_points_per_100']);
    }
}
