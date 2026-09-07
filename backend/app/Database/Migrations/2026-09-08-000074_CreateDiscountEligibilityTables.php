<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Whether a given product (or, failing that, its category) may receive
 * a given discount type at all — the piece this app was missing until
 * now: a cashier could apply Senior Citizen to a bottle of gin just as
 * freely as to a bag of rice, which isn't just a pricing mistake but a
 * real compliance problem (RA 9994/RA 10754 and the DTI-DA-DOH-DSWD
 * joint memorandum circular exclude alcohol and tobacco from the SC/PWD
 * discount, among other carve-outs).
 *
 * Two sparse override tables, not one flag-per-discount-type column on
 * `products`/`categories` — nine discount types would mean nine columns
 * on each table for a feature most rows never touch, and the resolution
 * order below (product row -> category row -> eligible-by-default) is
 * exactly a "most specific override wins" lookup, which a handful of
 * override rows expresses far more directly than eighteen nullable
 * columns would. Both tables are sparse ON PURPOSE: a row only ever
 * needs to exist to record an EXCEPTION (eligible=0) or to explicitly
 * re-enable something a category rule turned off (eligible=1) — see
 * TaxService::isProductEligibleForDiscount for the resolution itself,
 * and its docblock for why the default is "eligible" rather than "not"
 * (most retail goods DO qualify; naming every eligible product would be
 * the wrong way round for a mostly-permissive rule with a short
 * exclusion list).
 *
 * discount_type is a plain VARCHAR against TaxService::DISCOUNT_TYPES,
 * not a foreign key to a lookup table — the same choice already made for
 * sale_items.discount_type, for the same reason: a fixed, code-reviewed
 * taxonomy, not something a store admin adds rows to.
 */
class CreateDiscountEligibilityTables extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id' => ['type' => 'BIGINT', 'constraint' => 20, 'unsigned' => true, 'auto_increment' => true],
            'category_id' => ['type' => 'BIGINT', 'constraint' => 20, 'unsigned' => true],
            'discount_type' => ['type' => 'VARCHAR', 'constraint' => 30],
            'eligible' => ['type' => 'TINYINT', 'constraint' => 1, 'unsigned' => true, 'default' => 1],
            'created_at' => ['type' => 'DATETIME', 'null' => true],
            'updated_at' => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addKey('category_id');
        $this->forge->addUniqueKey(['category_id', 'discount_type']);
        $this->forge->addForeignKey('category_id', 'categories', 'id', 'CASCADE', 'CASCADE');
        $this->forge->createTable('category_discount_eligibility', false, ($this->db->DBDriver === 'MySQLi' ? ['ENGINE' => 'InnoDB'] : []));

        $this->forge->addField([
            'id' => ['type' => 'BIGINT', 'constraint' => 20, 'unsigned' => true, 'auto_increment' => true],
            'product_id' => ['type' => 'BIGINT', 'constraint' => 20, 'unsigned' => true],
            'discount_type' => ['type' => 'VARCHAR', 'constraint' => 30],
            'eligible' => ['type' => 'TINYINT', 'constraint' => 1, 'unsigned' => true, 'default' => 1],
            'created_at' => ['type' => 'DATETIME', 'null' => true],
            'updated_at' => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addKey('product_id');
        $this->forge->addUniqueKey(['product_id', 'discount_type']);
        $this->forge->addForeignKey('product_id', 'products', 'id', 'CASCADE', 'CASCADE');
        $this->forge->createTable('product_discount_eligibility', false, ($this->db->DBDriver === 'MySQLi' ? ['ENGINE' => 'InnoDB'] : []));
    }

    public function down()
    {
        $this->forge->dropTable('product_discount_eligibility', true);
        $this->forge->dropTable('category_discount_eligibility', true);
    }
}
