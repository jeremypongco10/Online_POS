<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Which of the nine PH-retail discount types a line's `discount` amount
 * came from — see TaxService::DISCOUNT_TYPES for the authoritative list
 * and its rate/VAT-treatment rules. NULL means either no discount, or a
 * discount applied before this feature existed (a held sale resumed
 * from localStorage, or old sale history) — always rendered as a plain
 * "Discount" with no special handling, never an error.
 *
 * Deliberately a plain VARCHAR validated at the model layer
 * (SaleItemModel::$validationRules), not a foreign key to a lookup
 * table — the same choice this codebase already made for
 * sale_items.tax_type, and for the same reason: this is a fixed, small,
 * code-reviewed taxonomy driven by Philippine statute (RA 9994, RA
 * 10754) and business policy, not something a store admin adds rows to
 * at runtime.
 */
class AddDiscountTypeToSaleItems extends Migration
{
    public function up()
    {
        $this->forge->addColumn('sale_items', [
            'discount_type' => [
                'type' => 'VARCHAR',
                'constraint' => 30,
                'null' => true,
                'after' => 'discount',
            ],
        ]);
    }

    public function down()
    {
        $this->forge->dropColumn('sale_items', 'discount_type');
    }
}
