<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Replaces `invoice_sequences` (see that table's own migration) as the
 * source SalesController::create() draws its invoice numbers from. That
 * table was a bare counter with no maximum, no status, and no admin UI —
 * this is the real BIR-style series configuration: a maximum number a
 * series is retired at (never reset, never reused — see
 * InvoiceSeriesModel::nextNumber), an effective date range, and a status
 * an admin controls directly rather than one this app infers.
 *
 * `invoice_sequences` itself is left in place, untouched, purely so any
 * number already issued through it stays traceable back to how it was
 * generated — nothing reads or writes it after this ships.
 *
 * One row per (store, invoice_type, series_code) — a business re-numbers
 * by creating a NEW row for the next series (a new year, a new BIR
 * permit), never by editing an old one's numbers backward. Only one row
 * per (store_id, invoice_type) may be `status = 'active'` at a time; that
 * rule can't be expressed as a table constraint (status is one value among
 * three, not a boolean), so it's enforced in InvoiceSeriesController.
 */
class CreateInvoiceSeries extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id' => ['type' => 'BIGINT', 'constraint' => 20, 'unsigned' => true, 'auto_increment' => true],
            'company_id' => ['type' => 'BIGINT', 'constraint' => 20, 'unsigned' => true],
            'store_id' => ['type' => 'BIGINT', 'constraint' => 20, 'unsigned' => true],
            // Admin-defined text, not a fixed enum — this app must not
            // assume which invoice types a company's actual BIR permit
            // covers (see the module's own design note on this).
            'invoice_type' => ['type' => 'VARCHAR', 'constraint' => 60],
            'series_code' => ['type' => 'VARCHAR', 'constraint' => 30],
            'prefix' => ['type' => 'VARCHAR', 'constraint' => 20, 'null' => true],
            'suffix' => ['type' => 'VARCHAR', 'constraint' => 20, 'null' => true],
            'starting_number' => ['type' => 'BIGINT', 'constraint' => 20, 'unsigned' => true],
            // The last number actually issued — a brand-new series is
            // inserted with current_number = starting_number - 1, so the
            // first nextNumber() call correctly hands out starting_number.
            // Directly editable by an admin migrating an already-partially-
            // used legacy series (see InvoiceSeriesModel's own validation).
            'current_number' => ['type' => 'BIGINT', 'constraint' => 20, 'unsigned' => true],
            'maximum_number' => ['type' => 'BIGINT', 'constraint' => 20, 'unsigned' => true],
            'number_length' => ['type' => 'TINYINT', 'constraint' => 3, 'unsigned' => true],
            // How many numbers remain before the POS should warn/refuse —
            // configurable per series rather than a single hard-coded
            // constant, since a low-volume branch and a flagship store
            // exhaust a series at very different paces.
            'warning_threshold' => ['type' => 'INT', 'constraint' => 10, 'unsigned' => true, 'default' => 10000],
            'critical_threshold' => ['type' => 'INT', 'constraint' => 10, 'unsigned' => true, 'default' => 1000],
            'effective_from' => ['type' => 'DATE'],
            'effective_to' => ['type' => 'DATE', 'null' => true],
            'status' => ['type' => 'ENUM', 'constraint' => ['active', 'inactive', 'exhausted'], 'default' => 'inactive'],
            'created_by' => ['type' => 'BIGINT', 'constraint' => 20, 'unsigned' => true, 'null' => true],
            'updated_by' => ['type' => 'BIGINT', 'constraint' => 20, 'unsigned' => true, 'null' => true],
            'created_at' => ['type' => 'DATETIME', 'null' => true],
            'updated_at' => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addKey('company_id');
        $this->forge->addKey('store_id');
        $this->forge->addKey('status');
        // Blocks a literal duplicate series (same store, same type, same
        // code) — not simultaneous "active" ones, which is a status value
        // rather than an identity and is enforced in the controller.
        $this->forge->addUniqueKey(['company_id', 'store_id', 'invoice_type', 'series_code']);
        $this->forge->addForeignKey('company_id', 'companies', 'id', 'CASCADE', 'CASCADE');
        $this->forge->addForeignKey('store_id', 'stores', 'id', 'RESTRICT', 'CASCADE');
        $this->forge->addForeignKey('created_by', 'users', 'id', 'SET NULL', 'CASCADE');
        $this->forge->addForeignKey('updated_by', 'users', 'id', 'SET NULL', 'CASCADE');
        $this->forge->createTable('invoice_series', false, ($this->db->DBDriver === 'MySQLi' ? ['ENGINE' => 'InnoDB'] : []));
    }

    public function down()
    {
        $this->forge->dropTable('invoice_series', true);
    }
}
