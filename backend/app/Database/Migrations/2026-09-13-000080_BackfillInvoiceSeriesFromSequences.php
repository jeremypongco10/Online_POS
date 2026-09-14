<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Gives every existing store one active invoice_series row, continuing
 * from wherever its old invoice_sequences counter already is — the same
 * "never reset the sequence" rule the whole module exists to enforce,
 * applied to this very upgrade. Without this, every store would start
 * this migration with zero invoice_series rows and every checkout would
 * immediately fail with INVOICE_SERIES_UNAVAILABLE until an admin
 * manually configured one — correct behaviour for a brand-new store, but
 * wrong for one that was already issuing numbers under the old system.
 *
 * `maximum_number`/`number_length` are set to a generous, generic
 * default (99,999,999 / 8 digits) rather than anything BIR-specific: this
 * migration cannot know a store's actual approved series range, so it
 * hands the business a working series to keep operating on, and an
 * administrator configures the real one(s) from the Sales Invoice
 * Configuration screen whenever convenient — the same reasoning
 * `PermissionSeeder`/`RoleSeeder` backfills elsewhere in this codebase
 * favour "keep the app working" over guessing at data this migration has
 * no way to know correctly.
 */
class BackfillInvoiceSeriesFromSequences extends Migration
{
    private const DEFAULT_MAXIMUM = 99999999;
    private const DEFAULT_NUMBER_LENGTH = 8;

    public function up()
    {
        $now = date('Y-m-d H:i:s');
        $today = date('Y-m-d');

        $stores = $this->db->table('stores')->select('id, company_id')->get()->getResult();

        foreach ($stores as $store) {
            // Already has an active series (e.g. this migration re-run
            // after a partial failure) — never insert a second one.
            $existingActive = $this->db->table('invoice_series')
                ->where('store_id', $store->id)
                ->where('status', 'active')
                ->get()->getFirstRow();
            if ($existingActive) {
                continue;
            }

            $sequence = $this->db->table('invoice_sequences')
                ->where('store_id', $store->id)
                ->where('type', 'sale')
                ->get()->getFirstRow();

            $lastNumber = $sequence ? (int) $sequence->last_number : 0;
            $prefix = ($sequence && $sequence->prefix !== null && $sequence->prefix !== '') ? $sequence->prefix : 'INV-';

            $this->db->table('invoice_series')->insert([
                'company_id' => $store->company_id,
                'store_id' => $store->id,
                'invoice_type' => 'Sales Invoice',
                'series_code' => date('Y'),
                'prefix' => $prefix,
                'suffix' => null,
                'starting_number' => 1,
                // current_number = last already-issued number, so the
                // very next nextNumber() call continues right where the
                // old counter left off rather than restarting at 1.
                'current_number' => $lastNumber,
                'maximum_number' => self::DEFAULT_MAXIMUM,
                'number_length' => self::DEFAULT_NUMBER_LENGTH,
                'warning_threshold' => 10000,
                'critical_threshold' => 1000,
                'effective_from' => $today,
                'effective_to' => null,
                'status' => 'active',
                'created_by' => null,
                'updated_by' => null,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }

    public function down()
    {
        // Deliberately a no-op: these rows may already have real invoice
        // numbers issued against them by the time a rollback runs, and
        // deleting them would silently break every sale created since —
        // the same "never delete an issued series" rule this module
        // enforces everywhere else. Rolling back CreateInvoiceSeries
        // (which this migration depends on) drops the table anyway.
    }
}
