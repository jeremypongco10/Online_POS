<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * The admin-manageable list a company picks payment methods from at
 * checkout — replaces the old hard-coded set (see the next migration,
 * which widens payments.method to match and seeds every existing company
 * with the original six as a starting point).
 *
 * `code` (not `id`) is what actually gets stored in payments.method —
 * kept as a plain string rather than a foreign key so deleting/renaming a
 * payment method here can never cascade into historical payment rows;
 * see PaymentMethodsController for why 'cash' specifically can never be
 * deleted or deactivated (CashSessionsController's drawer reconciliation
 * depends on that literal code existing and staying active).
 */
class CreatePaymentMethods extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id' => ['type' => 'BIGINT', 'constraint' => 20, 'unsigned' => true, 'auto_increment' => true],
            'company_id' => ['type' => 'BIGINT', 'constraint' => 20, 'unsigned' => true],
            'name' => ['type' => 'VARCHAR', 'constraint' => 100],
            'code' => ['type' => 'VARCHAR', 'constraint' => 60],
            'is_active' => ['type' => 'TINYINT', 'constraint' => 1, 'unsigned' => true, 'default' => 1],
            'created_at' => ['type' => 'DATETIME', 'null' => true],
            'updated_at' => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addKey('company_id');
        $this->forge->addUniqueKey(['company_id', 'code']);
        $this->forge->addForeignKey('company_id', 'companies', 'id', 'CASCADE', 'CASCADE');
        $this->forge->createTable('payment_methods', false, ($this->db->DBDriver === 'MySQLi' ? ['ENGINE' => 'InnoDB'] : []));
    }

    public function down()
    {
        $this->forge->dropTable('payment_methods', true);
    }
}
