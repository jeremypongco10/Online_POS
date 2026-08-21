<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Phase 10: customers maintain Customer Code, First Name, Last Name,
 * Mobile, Email, Address, Status. `email`/`address`/`is_active` (status)
 * already existed; this adds customer_code + splits `name` into
 * first_name/last_name, renaming `phone` to `mobile` for precision.
 *
 * `name` is kept as an internally-computed full-name column (first +
 * last, maintained by CustomerModel — never directly writable) so
 * free-text search across the full name doesn't require a CONCAT
 * expression in the generic list/search helper.
 */
class UpdateCustomerFields extends Migration
{
    public function up()
    {
        $this->forge->addColumn('customers', [
            'customer_code' => [
                'type' => 'VARCHAR',
                'constraint' => 30,
                'null' => true,
                'after' => 'company_id',
            ],
            'first_name' => [
                'type' => 'VARCHAR',
                'constraint' => 75,
                'after' => 'customer_code',
            ],
            'last_name' => [
                'type' => 'VARCHAR',
                'constraint' => 75,
                'after' => 'first_name',
            ],
        ]);

        // See the equivalent note in UpdateCompanyFields — CI4's SQLite
        // modifyColumn() rebuild corrupts other tables' FK clauses when
        // many tables reference the one being rebuilt; native RENAME
        // COLUMN avoids the rebuild path entirely.
        if ($this->db->DBDriver === 'MySQLi') {
            $this->forge->modifyColumn('customers', [
                'phone' => [
                    'name' => 'mobile',
                    'type' => 'VARCHAR',
                    'constraint' => 30,
                    'null' => true,
                ],
            ]);
        } else {
            $this->db->query('ALTER TABLE customers RENAME COLUMN phone TO mobile');
        }

        // SQLite has no ALTER TABLE ... ADD CONSTRAINT; a unique index is
        // the equivalent and works on both drivers, so it's used unconditionally.
        $this->db->query('CREATE UNIQUE INDEX customers_company_code_unique ON customers (company_id, customer_code)');
    }

    public function down()
    {
        // DROP INDEX syntax differs: MySQL needs "ON table", SQLite doesn't.
        $this->db->query($this->db->DBDriver === 'MySQLi'
            ? 'DROP INDEX customers_company_code_unique ON customers'
            : 'DROP INDEX customers_company_code_unique');

        if ($this->db->DBDriver === 'MySQLi') {
            $this->forge->modifyColumn('customers', [
                'mobile' => [
                    'name' => 'phone',
                    'type' => 'VARCHAR',
                    'constraint' => 30,
                    'null' => true,
                ],
            ]);
        } else {
            $this->db->query('ALTER TABLE customers RENAME COLUMN mobile TO phone');
        }

        $this->forge->dropColumn('customers', ['customer_code', 'first_name', 'last_name']);
    }
}
