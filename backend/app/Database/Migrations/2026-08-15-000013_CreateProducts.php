<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateProducts extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id' => ['type' => 'BIGINT', 'constraint' => 20, 'unsigned' => true, 'auto_increment' => true],
            'company_id' => ['type' => 'BIGINT', 'constraint' => 20, 'unsigned' => true],
            'category_id' => ['type' => 'BIGINT', 'constraint' => 20, 'unsigned' => true, 'null' => true],
            'unit_id' => ['type' => 'BIGINT', 'constraint' => 20, 'unsigned' => true, 'null' => true],
            'tax_rate_id' => ['type' => 'BIGINT', 'constraint' => 20, 'unsigned' => true, 'null' => true],
            'sku' => ['type' => 'VARCHAR', 'constraint' => 60],
            'barcode' => ['type' => 'VARCHAR', 'constraint' => 60, 'null' => true],
            'name' => ['type' => 'VARCHAR', 'constraint' => 150],
            'description' => ['type' => 'TEXT', 'null' => true],
            'cost_price' => ['type' => 'DECIMAL', 'constraint' => '15,2', 'default' => 0],
            'is_active' => ['type' => 'TINYINT', 'constraint' => 1, 'unsigned' => true, 'default' => 1],
            'track_inventory' => ['type' => 'TINYINT', 'constraint' => 1, 'unsigned' => true, 'default' => 1],
            'created_at' => ['type' => 'DATETIME', 'null' => true],
            'updated_at' => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addKey('company_id');
        $this->forge->addKey('category_id');
        $this->forge->addKey('unit_id');
        $this->forge->addKey('tax_rate_id');
        $this->forge->addKey('name');
        $this->forge->addUniqueKey(['company_id', 'sku']);
        $this->forge->addUniqueKey(['company_id', 'barcode']);
        $this->forge->addForeignKey('company_id', 'companies', 'id', 'CASCADE', 'CASCADE');
        $this->forge->addForeignKey('category_id', 'categories', 'id', 'SET NULL', 'CASCADE');
        $this->forge->addForeignKey('unit_id', 'units', 'id', 'SET NULL', 'CASCADE');
        $this->forge->addForeignKey('tax_rate_id', 'tax_rates', 'id', 'SET NULL', 'CASCADE');
        $this->forge->createTable('products', false, ($this->db->DBDriver === 'MySQLi' ? ['ENGINE' => 'InnoDB'] : []));
    }

    public function down()
    {
        $this->forge->dropTable('products', true);
    }
}
