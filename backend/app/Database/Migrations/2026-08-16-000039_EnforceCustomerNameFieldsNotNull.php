<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Same CI4 modifyColumn/addColumn quirk as EnforceCompanyTradeNameNotNull:
 * addColumn() defaults to nullable when `null` isn't specified.
 */
class EnforceCustomerNameFieldsNotNull extends Migration
{
    public function up()
    {
        // Same rebuild-corrupts-FKs issue as EnforceCompanyTradeNameNotNull
        // — skipped for SQLite; CustomerModel's own validation still
        // enforces both fields as required at the application layer.
        if ($this->db->DBDriver === 'MySQLi') {
            $this->forge->modifyColumn('customers', [
                'first_name' => ['name' => 'first_name', 'type' => 'VARCHAR', 'constraint' => 75, 'null' => false],
                'last_name' => ['name' => 'last_name', 'type' => 'VARCHAR', 'constraint' => 75, 'null' => false],
            ]);
        }
    }

    public function down()
    {
        if ($this->db->DBDriver === 'MySQLi') {
            $this->forge->modifyColumn('customers', [
                'first_name' => ['name' => 'first_name', 'type' => 'VARCHAR', 'constraint' => 75, 'null' => true],
                'last_name' => ['name' => 'last_name', 'type' => 'VARCHAR', 'constraint' => 75, 'null' => true],
            ]);
        }
    }
}
