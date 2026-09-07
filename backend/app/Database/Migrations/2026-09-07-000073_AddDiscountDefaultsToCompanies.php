<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * A per-company default percentage for each of the five "Store &
 * Promotional"/"Company" discount types that have no statutory rate
 * (Regular, Promo, Employee, Member, Wholesale — see TaxService::
 * DISCOUNT_TYPES). Nullable, defaulting to NULL/unset for every existing
 * company: a null default leaves DiscountDialog's percent field blank,
 * exactly the behaviour before this migration, so nothing changes for a
 * company that never configures one.
 *
 * Deliberately still just a STARTING POINT, not an enforced ceiling —
 * the cashier can always type a different number over whatever this
 * pre-fills. Government discount types (Senior Citizen/PWD/5% BNPC) are
 * NOT here: those rates are statutory, computed server-side, and
 * already cannot be edited by anyone (see TaxService::DISCOUNT_RATES).
 */
class AddDiscountDefaultsToCompanies extends Migration
{
    private const COLUMNS = [
        'default_regular_discount_percent',
        'default_promo_discount_percent',
        'default_employee_discount_percent',
        'default_member_discount_percent',
        'default_wholesale_discount_percent',
    ];

    public function up()
    {
        $fields = [];
        $after = 'require_manual_discount_approval';
        foreach (self::COLUMNS as $column) {
            $fields[$column] = [
                'type' => 'DECIMAL',
                'constraint' => '5,2',
                'null' => true,
                'after' => $after,
            ];
            $after = $column;
        }

        $this->forge->addColumn('companies', $fields);
    }

    public function down()
    {
        $this->forge->dropColumn('companies', self::COLUMNS);
    }
}
