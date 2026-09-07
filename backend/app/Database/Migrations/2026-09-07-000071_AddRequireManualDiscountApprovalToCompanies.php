<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Gates ManualDiscount specifically — the one discount type on the
 * radio list with no fixed statutory rate and no policy backing it,
 * i.e. the cashier is asking to knock money off a sale purely on their
 * own say-so. Every other discount type (Senior Citizen, PWD, 5%
 * BNPC, Regular, Promo, Employee, Member, Wholesale) carries its own
 * built-in ceiling or business rule, so none of them need a supervisor
 * standing over the register — Manual is the one place that
 * discretion, not policy, sets the number.
 *
 * Defaults to 1 (required), matching require_cancel_approval rather
 * than require_item_void_approval: an open-ended discount is closer in
 * risk to cancelling a sale (rare, and the friction is exactly the
 * point) than to a mis-scan correction (constant, and friction there
 * just trains everyone to skip it).
 */
class AddRequireManualDiscountApprovalToCompanies extends Migration
{
    public function up()
    {
        $this->forge->addColumn('companies', [
            'require_manual_discount_approval' => [
                'type' => 'TINYINT',
                'unsigned' => true,
                'null' => false,
                'default' => 1,
                'after' => 'require_cancel_approval',
            ],
        ]);
    }

    public function down()
    {
        $this->forge->dropColumn('companies', ['require_manual_discount_approval']);
    }
}
