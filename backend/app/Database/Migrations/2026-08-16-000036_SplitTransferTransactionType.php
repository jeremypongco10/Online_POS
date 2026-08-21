<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Phase 9 requires movements to be recorded as one of exactly:
 * PURCHASE, SALE, RETURN, ADJUSTMENT, TRANSFER_IN, TRANSFER_OUT
 * (stored lowercase, matching every other enum in this schema).
 *
 * The original `transfer` type covered both legs of a transfer,
 * distinguished only by the sign of `quantity` — not explicit enough
 * for an audit trail. This splits it into transfer_in/transfer_out.
 */
class SplitTransferTransactionType extends Migration
{
    public function up()
    {
        // MODIFY COLUMN + ENUM (and MySQL's IF()) are MySQL-only — SQLite
        // represents the original ENUM as TEXT + CHECK() fixed at CREATE
        // TABLE time (see Forge::_processColumn()), so widening/narrowing
        // it here would need a full table rebuild. Skipped for non-MySQL
        // drivers: a fresh SQLite test DB has no legacy 'transfer' rows to
        // migrate, and the original CREATE already allows every value
        // this app actually writes (purchase/sale/return/adjustment).
        if ($this->db->DBDriver !== 'MySQLi') {
            return;
        }

        // Widen first so both old and new values are valid while migrating data.
        $this->db->query(
            "ALTER TABLE inventory_transactions
             MODIFY COLUMN type ENUM('purchase','sale','return','adjustment','transfer','transfer_in','transfer_out') NOT NULL"
        );

        $this->db->query(
            "UPDATE inventory_transactions
             SET type = IF(quantity < 0, 'transfer_out', 'transfer_in')
             WHERE type = 'transfer'"
        );

        // Narrow: drop the now-unused legacy value.
        $this->db->query(
            "ALTER TABLE inventory_transactions
             MODIFY COLUMN type ENUM('purchase','sale','return','adjustment','transfer_in','transfer_out') NOT NULL"
        );
    }

    public function down()
    {
        if ($this->db->DBDriver !== 'MySQLi') {
            return;
        }

        $this->db->query(
            "ALTER TABLE inventory_transactions
             MODIFY COLUMN type ENUM('purchase','sale','return','adjustment','transfer','transfer_in','transfer_out') NOT NULL"
        );

        $this->db->query(
            "UPDATE inventory_transactions
             SET type = 'transfer'
             WHERE type IN ('transfer_in','transfer_out')"
        );

        $this->db->query(
            "ALTER TABLE inventory_transactions
             MODIFY COLUMN type ENUM('purchase','sale','return','adjustment','transfer') NOT NULL"
        );
    }
}
