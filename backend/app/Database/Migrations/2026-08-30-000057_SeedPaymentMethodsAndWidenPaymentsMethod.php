<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Two parts, run together since the seed only makes sense once the column
 * can actually hold whatever code a company later defines:
 *
 *  1. payments.method widens from the old fixed ENUM to a plain VARCHAR —
 *     the payment_methods table (previous migration) is now the source of
 *     truth for which codes are valid, enforced in SalesController rather
 *     than at the schema level, so the column itself just needs to hold
 *     any code a company defines.
 *  2. Every company that already exists gets the original six methods
 *     seeded as real, editable rows — preserves current checkout behavior
 *     (nothing an existing company does today stops working), while
 *     leaving them free to rename, deactivate, or add to the list
 *     afterward. A company created after this migration has no seeded
 *     methods of its own; see PaymentMethodsController for why that's
 *     acceptable today (no self-serve company signup exists yet).
 */
class SeedPaymentMethodsAndWidenPaymentsMethod extends Migration
{
    private const DEFAULTS = [
        ['code' => 'cash', 'name' => 'Cash'],
        ['code' => 'card', 'name' => 'Card'],
        ['code' => 'gcash', 'name' => 'GCash'],
        ['code' => 'maya', 'name' => 'Maya'],
        ['code' => 'bank_transfer', 'name' => 'Bank Transfer'],
        ['code' => 'other', 'name' => 'Other'],
    ];

    public function up()
    {
        // MySQL-only, same reasoning as EnforceCompanyTradeNameNotNull and
        // UpdatePaymentMethods: CI4's SQLite modifyColumn() (there's no
        // lightweight ALTER for a type change under SQLite) rebuilds the
        // whole table via rename-aside/recreate/copy-back, which has
        // already bitten this project once (see the temp_products repair
        // in tests/_support/build-test-db.php) — not worth the risk here
        // even though `payments` itself has no incoming foreign keys.
        // SQLite's test DB keeps payments.method's original CHECK
        // (cash/card/mobile/store_credit/other from 2026-08-15-000024); the
        // real enforcement of "is this code valid" already moved to
        // SalesController querying payment_methods, and every test that
        // writes a payment still only ever uses 'cash', which that CHECK
        // already allows.
        if ($this->db->DBDriver === 'MySQLi') {
            $this->db->query('ALTER TABLE payments MODIFY COLUMN method VARCHAR(60) NOT NULL');
        }

        $now = date('Y-m-d H:i:s');
        $companies = $this->db->table('companies')->select('id')->get()->getResultArray();

        foreach ($companies as $company) {
            $rows = array_map(static fn (array $method) => [
                'company_id' => $company['id'],
                'name' => $method['name'],
                'code' => $method['code'],
                'is_active' => 1,
                'created_at' => $now,
                'updated_at' => $now,
            ], self::DEFAULTS);

            $this->db->table('payment_methods')->insertBatch($rows);
        }
    }

    public function down()
    {
        $this->db->table('payment_methods')->whereIn('code', array_column(self::DEFAULTS, 'code'))->delete();

        if ($this->db->DBDriver === 'MySQLi') {
            $this->db->query(
                "ALTER TABLE payments MODIFY COLUMN method ENUM('cash','card','gcash','maya','bank_transfer','other') NOT NULL"
            );
        }
    }
}
