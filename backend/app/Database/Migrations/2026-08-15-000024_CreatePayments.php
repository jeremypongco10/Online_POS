<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreatePayments extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id' => ['type' => 'BIGINT', 'constraint' => 20, 'unsigned' => true, 'auto_increment' => true],
            'sale_id' => ['type' => 'BIGINT', 'constraint' => 20, 'unsigned' => true],
            'method' => ['type' => 'ENUM', 'constraint' => ['cash', 'card', 'mobile', 'store_credit', 'other']],
            'amount' => ['type' => 'DECIMAL', 'constraint' => '15,2'],
            'reference' => ['type' => 'VARCHAR', 'constraint' => 100, 'null' => true],
            'paid_at' => ['type' => 'DATETIME'],
            'created_at' => ['type' => 'DATETIME', 'null' => true],
            'updated_at' => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addKey('sale_id');
        $this->forge->addKey('method');
        $this->forge->addForeignKey('sale_id', 'sales', 'id', 'CASCADE', 'CASCADE');
        $this->forge->createTable('payments', false, ($this->db->DBDriver === 'MySQLi' ? ['ENGINE' => 'InnoDB'] : []));
    }

    public function down()
    {
        $this->forge->dropTable('payments', true);
    }
}
