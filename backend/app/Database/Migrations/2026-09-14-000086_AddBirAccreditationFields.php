<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * The machine-level counters and identifiers a BIR-accredited POS has to
 * carry, none of which this system tracked before.
 *
 * On `registers`, because BIR accredits a MACHINE: the accumulated grand
 * total, the Z counter and the reset counter all belong to one terminal
 * and are printed on that terminal's own Z-readings.
 *
 *   - grand_total: lifetime accumulated gross sales. Only ever increases,
 *     and never by a void, a return, or a training sale. Its "old" and
 *     "new" values bracket every Z-reading, which is what makes a day's
 *     figures tie back to the machine's whole history.
 *   - z_counter: how many Z-readings this terminal has produced. Printed
 *     on each one, so a missing Z is visible as a gap.
 *   - reset_counter: how many times the grand total has been reset. Should
 *     stay 0 for the life of a machine; it exists so that if it ever isn't,
 *     the fact is on the record rather than invisible.
 *   - is_training_mode: sales rung up while this is on are marked
 *     is_training and excluded from every total, report and Z-reading, and
 *     never consume a real invoice number.
 *
 * On `stores`, alongside the MIN and POS serial number that already live
 * there (see AddShowBirDetailsToStores): the Permit to Use number and its
 * validity dates, which an accredited machine prints on every receipt.
 *
 * On `sales`: the training flag, and the buyer details a VAT invoice needs
 * for a business purchase — snapshotted onto the sale like every other
 * receipt field here, so editing the customer later can't rewrite an
 * invoice already issued.
 */
class AddBirAccreditationFields extends Migration
{
    public function up()
    {
        $this->forge->addColumn('registers', [
            'grand_total' => ['type' => 'DECIMAL', 'constraint' => '18,2', 'default' => 0, 'null' => false, 'after' => 'default_opening_float'],
            'z_counter' => ['type' => 'INT', 'constraint' => 10, 'unsigned' => true, 'default' => 0, 'null' => false, 'after' => 'grand_total'],
            'reset_counter' => ['type' => 'INT', 'constraint' => 10, 'unsigned' => true, 'default' => 0, 'null' => false, 'after' => 'z_counter'],
            'is_training_mode' => ['type' => 'TINYINT', 'constraint' => 1, 'default' => 0, 'null' => false, 'after' => 'reset_counter'],
        ]);

        $this->forge->addColumn('stores', [
            'ptu_number' => ['type' => 'VARCHAR', 'constraint' => 60, 'null' => true, 'after' => 'min_no'],
            'ptu_date_issued' => ['type' => 'DATE', 'null' => true, 'after' => 'ptu_number'],
            'ptu_valid_until' => ['type' => 'DATE', 'null' => true, 'after' => 'ptu_date_issued'],
        ]);

        $this->forge->addColumn('sales', [
            'is_training' => ['type' => 'TINYINT', 'constraint' => 1, 'default' => 0, 'null' => false, 'after' => 'status'],
            'customer_address' => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true, 'after' => 'customer_name'],
            'customer_tin' => ['type' => 'VARCHAR', 'constraint' => 50, 'null' => true, 'after' => 'customer_address'],
            'customer_business_style' => ['type' => 'VARCHAR', 'constraint' => 150, 'null' => true, 'after' => 'customer_tin'],
            // Printed as a duplicate once this passes 1 — a reissued
            // receipt must be visibly distinguishable from the original.
            'print_count' => ['type' => 'INT', 'constraint' => 10, 'unsigned' => true, 'default' => 0, 'null' => false, 'after' => 'transaction_no'],
        ]);

        $this->forge->addColumn('customers', [
            'business_style' => ['type' => 'VARCHAR', 'constraint' => 150, 'null' => true, 'after' => 'tax_id'],
        ]);
    }

    public function down()
    {
        $this->forge->dropColumn('customers', ['business_style']);
        $this->forge->dropColumn('sales', ['is_training', 'customer_address', 'customer_tin', 'customer_business_style', 'print_count']);
        $this->forge->dropColumn('stores', ['ptu_number', 'ptu_date_issued', 'ptu_valid_until']);
        $this->forge->dropColumn('registers', ['grand_total', 'z_counter', 'reset_counter', 'is_training_mode']);
    }
}
