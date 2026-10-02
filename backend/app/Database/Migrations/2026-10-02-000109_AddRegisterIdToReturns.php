<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * The terminal a return was processed on. A refund belongs on the X/Z
 * reading of the register that handed it out, which isn't always the one
 * that rang up the sale (another counter at the same branch can take the
 * return). BirReadingService counts a return on this register, falling
 * back to the sale's register for returns made before this existed.
 */
class AddRegisterIdToReturns extends Migration
{
    public function up()
    {
        $this->forge->addColumn('returns', [
            'register_id' => ['type' => 'BIGINT', 'constraint' => 20, 'unsigned' => true, 'null' => true, 'after' => 'store_id'],
        ]);
        $this->db->query('ALTER TABLE returns ADD INDEX returns_register_id (register_id)');
    }

    public function down()
    {
        $this->db->query('ALTER TABLE returns DROP INDEX returns_register_id');
        $this->forge->dropColumn('returns', 'register_id');
    }
}
