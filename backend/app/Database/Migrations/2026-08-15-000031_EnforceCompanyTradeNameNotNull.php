<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * The rename in UpdateCompanyFields (name -> trade_name) dropped the
 * NOT NULL constraint because CI4's modifyColumn() defaults to nullable
 * when `null` isn't specified. Restoring it here.
 */
class EnforceCompanyTradeNameNotNull extends Migration
{
    public function up()
    {
        // CI4's SQLite modifyColumn() rebuilds the whole table even for a
        // NOT NULL tweak (no rename involved), and — as with the rename in
        // UpdateCompanyFields — that rebuild corrupts other tables' FK
        // clauses when many tables reference companies. SQLite has no
        // lightweight ALTER for adding NOT NULL after the fact, so this
        // DB-level constraint is skipped there; CompanyModel's own
        // validation rule ('trade_name' => 'required|...') still enforces
        // it at the application layer either way.
        if ($this->db->DBDriver === 'MySQLi') {
            $this->forge->modifyColumn('companies', [
                'trade_name' => [
                    'name' => 'trade_name',
                    'type' => 'VARCHAR',
                    'constraint' => 150,
                    'null' => false,
                ],
            ]);
        }
    }

    public function down()
    {
        if ($this->db->DBDriver === 'MySQLi') {
            $this->forge->modifyColumn('companies', [
                'trade_name' => [
                    'name' => 'trade_name',
                    'type' => 'VARCHAR',
                    'constraint' => 150,
                    'null' => true,
                ],
            ]);
        }
    }
}
