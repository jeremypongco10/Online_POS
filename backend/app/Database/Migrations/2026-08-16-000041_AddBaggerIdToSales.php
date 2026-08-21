<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Phase 14: bagger is optional on a sale, but when set must be a real,
 * active user with the Bagger role, assigned to the sale's store — all
 * enforced in SalesController::create(), not just here at the schema
 * level.
 */
class AddBaggerIdToSales extends Migration
{
    public function up()
    {
        $this->forge->addColumn('sales', [
            'bagger_id' => [
                'type' => 'BIGINT',
                'constraint' => 20,
                'unsigned' => true,
                'null' => true,
                'after' => 'user_id',
            ],
        ]);

        if ($this->db->DBDriver === 'MySQLi') {
            $this->db->query(
                'ALTER TABLE sales ADD CONSTRAINT sales_bagger_id_fk FOREIGN KEY (bagger_id) REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE'
            );
        }
    }

    public function down()
    {
        if ($this->db->DBDriver === 'MySQLi') {
            $this->db->query('ALTER TABLE sales DROP FOREIGN KEY sales_bagger_id_fk');
        }
        $this->forge->dropColumn('sales', ['bagger_id']);
    }
}
