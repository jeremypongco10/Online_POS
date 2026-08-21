<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Phase 16: payment methods are exactly CASH, CARD, GCASH, MAYA,
 * BANK TRANSFER, OTHER (stored lowercase/snake_case, matching every
 * other enum in this schema). Replaces the old generic 'mobile' and
 * 'store_credit' with the specific PH e-wallet rails.
 */
class UpdatePaymentMethods extends Migration
{
    public function up()
    {
        // MODIFY COLUMN + ENUM are MySQL-only — see the equivalent note in
        // SplitTransferTransactionType. Skipped for non-MySQL drivers: a
        // fresh SQLite test DB has no legacy 'mobile'/'store_credit' rows,
        // and the original CREATE already allows 'cash' (the only method
        // this app's tests currently write).
        if ($this->db->DBDriver !== 'MySQLi') {
            return;
        }

        // Widen first so both old and new values are valid while migrating data.
        $this->db->query(
            "ALTER TABLE payments
             MODIFY COLUMN method ENUM('cash','card','mobile','store_credit','other','gcash','maya','bank_transfer') NOT NULL"
        );

        // 'mobile' had no specific rail — best-effort default to 'gcash'
        // (the more common PH e-wallet); 'store_credit' has no direct
        // equivalent in the new set, so it maps to 'other'.
        $this->db->query("UPDATE payments SET method = 'gcash' WHERE method = 'mobile'");
        $this->db->query("UPDATE payments SET method = 'other' WHERE method = 'store_credit'");

        $this->db->query(
            "ALTER TABLE payments
             MODIFY COLUMN method ENUM('cash','card','gcash','maya','bank_transfer','other') NOT NULL"
        );
    }

    public function down()
    {
        if ($this->db->DBDriver !== 'MySQLi') {
            return;
        }

        $this->db->query(
            "ALTER TABLE payments
             MODIFY COLUMN method ENUM('cash','card','gcash','maya','bank_transfer','other','mobile','store_credit') NOT NULL"
        );
        $this->db->query("UPDATE payments SET method = 'mobile' WHERE method IN ('gcash','maya','bank_transfer')");
        $this->db->query(
            "ALTER TABLE payments
             MODIFY COLUMN method ENUM('cash','card','mobile','store_credit','other') NOT NULL"
        );
    }
}
