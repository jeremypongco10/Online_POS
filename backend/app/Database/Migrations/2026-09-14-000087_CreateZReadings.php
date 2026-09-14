<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * One row per Z-reading: the end-of-day close a BIR-accredited terminal
 * must produce, kept permanently rather than recomputed on demand.
 *
 * Persisted, not derived, for the same reason the receipt snapshots the
 * company name onto each sale: a Z-reading is a statement of what the
 * machine reported on a given date. Recomputing it later from the sales
 * table would quietly restate history the first time a sale is voided,
 * a rate is renamed, or a refund lands after the fact. The figures here
 * are what was read that day, full stop.
 *
 * `beginning_grand_total` / `ending_grand_total` bracket the day against
 * registers.grand_total, so every Z ties to the machine's lifetime total
 * and to the Z before it — that continuity is the thing an examiner
 * actually checks. `z_counter` is the terminal's own sequence, so a
 * missing day shows up as a gap rather than as nothing at all.
 *
 * Discounts are split out by statutory type because BIR asks for Senior
 * Citizen and PWD separately, not as one "discounts" figure.
 */
class CreateZReadings extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id' => ['type' => 'BIGINT', 'constraint' => 20, 'unsigned' => true, 'auto_increment' => true],
            'company_id' => ['type' => 'BIGINT', 'constraint' => 20, 'unsigned' => true],
            'store_id' => ['type' => 'BIGINT', 'constraint' => 20, 'unsigned' => true],
            'register_id' => ['type' => 'BIGINT', 'constraint' => 20, 'unsigned' => true],
            'z_counter' => ['type' => 'INT', 'constraint' => 10, 'unsigned' => true],
            'reset_counter' => ['type' => 'INT', 'constraint' => 10, 'unsigned' => true, 'default' => 0],
            'business_date' => ['type' => 'DATE'],
            'covers_from' => ['type' => 'DATETIME'],
            'covers_to' => ['type' => 'DATETIME'],

            // Snapshots of the machine identifiers as they read on the day,
            // so a later edit in Settings can't restate an issued Z.
            'min_no' => ['type' => 'VARCHAR', 'constraint' => 60, 'null' => true],
            'pos_serial_no' => ['type' => 'VARCHAR', 'constraint' => 60, 'null' => true],
            'ptu_number' => ['type' => 'VARCHAR', 'constraint' => 60, 'null' => true],

            'beginning_invoice_number' => ['type' => 'VARCHAR', 'constraint' => 40, 'null' => true],
            'ending_invoice_number' => ['type' => 'VARCHAR', 'constraint' => 40, 'null' => true],
            'beginning_grand_total' => ['type' => 'DECIMAL', 'constraint' => '18,2', 'default' => 0],
            'ending_grand_total' => ['type' => 'DECIMAL', 'constraint' => '18,2', 'default' => 0],

            'transaction_count' => ['type' => 'INT', 'constraint' => 10, 'unsigned' => true, 'default' => 0],
            'gross_sales' => ['type' => 'DECIMAL', 'constraint' => '15,2', 'default' => 0],
            'discount_total' => ['type' => 'DECIMAL', 'constraint' => '15,2', 'default' => 0],
            'net_sales' => ['type' => 'DECIMAL', 'constraint' => '15,2', 'default' => 0],

            'vatable_sales' => ['type' => 'DECIMAL', 'constraint' => '15,2', 'default' => 0],
            'vat_amount' => ['type' => 'DECIMAL', 'constraint' => '15,2', 'default' => 0],
            'vat_exempt_sales' => ['type' => 'DECIMAL', 'constraint' => '15,2', 'default' => 0],
            'zero_rated_sales' => ['type' => 'DECIMAL', 'constraint' => '15,2', 'default' => 0],
            'non_vat_sales' => ['type' => 'DECIMAL', 'constraint' => '15,2', 'default' => 0],

            'sc_discount_total' => ['type' => 'DECIMAL', 'constraint' => '15,2', 'default' => 0],
            'pwd_discount_total' => ['type' => 'DECIMAL', 'constraint' => '15,2', 'default' => 0],
            'bnpc_discount_total' => ['type' => 'DECIMAL', 'constraint' => '15,2', 'default' => 0],
            'other_discount_total' => ['type' => 'DECIMAL', 'constraint' => '15,2', 'default' => 0],

            'void_count' => ['type' => 'INT', 'constraint' => 10, 'unsigned' => true, 'default' => 0],
            'void_total' => ['type' => 'DECIMAL', 'constraint' => '15,2', 'default' => 0],
            'return_count' => ['type' => 'INT', 'constraint' => 10, 'unsigned' => true, 'default' => 0],
            'return_total' => ['type' => 'DECIMAL', 'constraint' => '15,2', 'default' => 0],

            'generated_by' => ['type' => 'BIGINT', 'constraint' => 20, 'unsigned' => true, 'null' => true],
            'created_at' => ['type' => 'DATETIME', 'null' => true],
            'updated_at' => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addKey('company_id');
        $this->forge->addKey(['register_id', 'business_date']);
        // One Z per terminal per counter value — the sequence can't fork.
        $this->forge->addUniqueKey(['register_id', 'z_counter']);
        $this->forge->addForeignKey('company_id', 'companies', 'id', 'CASCADE', 'CASCADE');
        $this->forge->addForeignKey('store_id', 'stores', 'id', 'RESTRICT', 'CASCADE');
        $this->forge->addForeignKey('register_id', 'registers', 'id', 'RESTRICT', 'CASCADE');
        $this->forge->addForeignKey('generated_by', 'users', 'id', 'SET NULL', 'CASCADE');
        $this->forge->createTable('z_readings', false, ($this->db->DBDriver === 'MySQLi' ? ['ENGINE' => 'InnoDB'] : []));
    }

    public function down()
    {
        $this->forge->dropTable('z_readings', true);
    }
}
