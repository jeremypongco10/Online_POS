<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * The purchaser's name and government-ID number backing a Senior
 * Citizen / PWD / 5% SC-PWD Basic Necessities discount on this sale —
 * BIR RR 7-2010 and the RA 9994 / RA 10754 IRRs require this be on
 * record for the discount to be valid, not just applied at the register.
 *
 * One holder per SALE, not per line: in the ordinary case one senior
 * citizen or PWD is transacting for themselves, so a single name/ID
 * captured once and carried by every qualifying line in the cart is the
 * common case this models directly. A household buying under two
 * different IDs in one transaction is out of scope for this pass — the
 * cashier would ring those up as two separate sales, same as most PH
 * POS systems require today.
 *
 * Nullable, and only ever populated when at least one sale_items row
 * carries a government discount_type (senior_citizen, pwd, or
 * sc_pwd_5_bnpc) — see SalesController::create()'s validation.
 */
class AddDiscountHolderToSales extends Migration
{
    public function up()
    {
        $this->forge->addColumn('sales', [
            'discount_holder_name' => [
                'type' => 'VARCHAR',
                'constraint' => 150,
                'null' => true,
                'after' => 'discount_total',
            ],
            'discount_id_number' => [
                'type' => 'VARCHAR',
                'constraint' => 60,
                'null' => true,
                'after' => 'discount_holder_name',
            ],
        ]);
    }

    public function down()
    {
        $this->forge->dropColumn('sales', ['discount_holder_name', 'discount_id_number']);
    }
}
