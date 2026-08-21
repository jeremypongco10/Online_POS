<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Phase 5: companies maintain Legal Name, Trade Name, TIN, VAT
 * Registration, Address, Phone, Email. `legal_name`/`tax_id` (TIN)/
 * `address`/`phone`/`email` already existed; this renames the generic
 * `name` to `trade_name` for clarity and adds VAT registration fields.
 */
class UpdateCompanyFields extends Migration
{
    public function up()
    {
        // CI4's SQLite modifyColumn() rebuilds the whole table to rename a
        // column, which — because nearly every table in this schema has an
        // FK pointing at companies — corrupts other tables' FK clauses
        // mid-rebuild (they get frozen referencing companies' transient
        // rebuild name). SQLite's own native RENAME COLUMN doesn't rebuild
        // anything, so it isn't affected; used directly for SQLite instead.
        if ($this->db->DBDriver === 'MySQLi') {
            $this->forge->modifyColumn('companies', [
                'name' => [
                    'name' => 'trade_name',
                    'type' => 'VARCHAR',
                    'constraint' => 150,
                ],
            ]);
        } else {
            $this->db->query('ALTER TABLE companies RENAME COLUMN name TO trade_name');
        }

        $this->forge->addColumn('companies', [
            'is_vat_registered' => [
                'type' => 'TINYINT',
                'constraint' => 1,
                'unsigned' => true,
                'default' => 0,
                'after' => 'tax_id',
            ],
            'vat_registration_number' => [
                'type' => 'VARCHAR',
                'constraint' => 50,
                'null' => true,
                'after' => 'is_vat_registered',
            ],
        ]);
    }

    public function down()
    {
        $this->forge->dropColumn('companies', ['is_vat_registered', 'vat_registration_number']);

        if ($this->db->DBDriver === 'MySQLi') {
            $this->forge->modifyColumn('companies', [
                'trade_name' => [
                    'name' => 'name',
                    'type' => 'VARCHAR',
                    'constraint' => 150,
                ],
            ]);
        } else {
            $this->db->query('ALTER TABLE companies RENAME COLUMN trade_name TO name');
        }
    }
}
