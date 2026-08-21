<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Phase 11 requires an explicit approval step between creating a PO and
 * receiving it: Create -> Approve -> Receive -> Update inventory ->
 * Inventory transaction. Replaces the old ('draft','ordered','received',
 * 'cancelled') set — 'ordered' never had a distinct meaning from
 * 'approved' in this app — with ('draft','approved','received',
 * 'cancelled'), and adds who/when approved it.
 */
class AddApprovalToPurchaseOrders extends Migration
{
    public function up()
    {
        // MODIFY COLUMN + ENUM are MySQL-only — SQLite represents the
        // original ENUM as TEXT + CHECK() (see Forge::_processColumn())
        // and has no ALTER COLUMN at all, so redefining the allowed set
        // would require a full table rebuild. Skipped for non-MySQL
        // drivers; nothing in this app currently exercises the 'ordered'
        // status under SQLite tests.
        if ($this->db->DBDriver === 'MySQLi') {
            $this->db->query(
                "ALTER TABLE purchase_orders
                 MODIFY COLUMN status ENUM('draft','approved','ordered','received','cancelled') NOT NULL DEFAULT 'draft'"
            );
            $this->db->query("UPDATE purchase_orders SET status = 'approved' WHERE status = 'ordered'");
            $this->db->query(
                "ALTER TABLE purchase_orders
                 MODIFY COLUMN status ENUM('draft','approved','received','cancelled') NOT NULL DEFAULT 'draft'"
            );
        }

        $this->forge->addColumn('purchase_orders', [
            'approved_by' => [
                'type' => 'BIGINT',
                'constraint' => 20,
                'unsigned' => true,
                'null' => true,
                'after' => 'user_id',
            ],
            'approved_at' => [
                'type' => 'DATETIME',
                'null' => true,
                'after' => 'order_date',
            ],
        ]);

        if ($this->db->DBDriver === 'MySQLi') {
            $this->db->query(
                'ALTER TABLE purchase_orders ADD CONSTRAINT po_approved_by_fk FOREIGN KEY (approved_by) REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE'
            );
        }
    }

    public function down()
    {
        if ($this->db->DBDriver === 'MySQLi') {
            $this->db->query('ALTER TABLE purchase_orders DROP FOREIGN KEY po_approved_by_fk');
        }
        $this->forge->dropColumn('purchase_orders', ['approved_by', 'approved_at']);

        if ($this->db->DBDriver === 'MySQLi') {
            $this->db->query(
                "ALTER TABLE purchase_orders
                 MODIFY COLUMN status ENUM('draft','ordered','received','cancelled') NOT NULL DEFAULT 'draft'"
            );
        }
    }
}
