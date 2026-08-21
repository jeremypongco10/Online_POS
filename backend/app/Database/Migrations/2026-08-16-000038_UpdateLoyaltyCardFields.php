<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Phase 10: loyalty cards maintain Card Number, Customer, Status,
 * Issued Date, Activated Date. Replaces the boolean is_active with the
 * four-state lifecycle a physical card actually has, and adds
 * activated_at (a card can be issued before it's activated).
 */
class UpdateLoyaltyCardFields extends Migration
{
    public function up()
    {
        // ADD COLUMN ... ENUM ... AFTER in one raw statement is MySQL-only;
        // for SQLite the equivalent column is added via Forge below with
        // a plain TEXT type (see UpdateLoyaltyCardFields' 'status' handling).
        if ($this->db->DBDriver === 'MySQLi') {
            $this->db->query(
                "ALTER TABLE loyalty_cards
                 ADD COLUMN status ENUM('active','inactive','blocked','lost') NOT NULL DEFAULT 'inactive' AFTER card_number"
            );

            $this->db->query(
                "UPDATE loyalty_cards SET status = IF(is_active = 1, 'active', 'inactive')"
            );
        } else {
            $this->forge->addColumn('loyalty_cards', [
                'status' => [
                    'type' => 'VARCHAR',
                    'constraint' => 20,
                    'default' => 'inactive',
                ],
            ]);
        }

        $this->forge->addColumn('loyalty_cards', [
            'activated_at' => [
                'type' => 'DATETIME',
                'null' => true,
                'after' => 'issued_at',
            ],
        ]);

        $this->forge->dropColumn('loyalty_cards', ['is_active']);
    }

    public function down()
    {
        $this->forge->addColumn('loyalty_cards', [
            'is_active' => [
                'type' => 'TINYINT',
                'constraint' => 1,
                'unsigned' => true,
                'default' => 1,
            ],
        ]);

        if ($this->db->DBDriver === 'MySQLi') {
            $this->db->query("UPDATE loyalty_cards SET is_active = IF(status = 'active', 1, 0)");
        } else {
            $this->db->query("UPDATE loyalty_cards SET is_active = CASE WHEN status = 'active' THEN 1 ELSE 0 END");
        }

        $this->forge->dropColumn('loyalty_cards', ['status', 'activated_at']);
    }
}
