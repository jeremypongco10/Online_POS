<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Gives every company a protected standard rate for each regime — 12% VAT
 * (Philippines) and 10% GST (Papua New Guinea) — flagged is_system so
 * SystemResetController::reset() and TaxesController::delete() both refuse
 * to remove them (see AddIsSystemToTaxRates for the column and the fuller
 * reasoning). Both are seeded regardless of which regime the company is
 * currently on, the same way tax_rates already carries rows for a regime a
 * company isn't actively using — a company that switches from VAT to GST
 * and back later should find both standard rates already waiting rather
 * than having to recreate whichever one it left behind.
 *
 * Promotes an existing row rather than blindly inserting a duplicate:
 * almost every company already has a 12% VAT row from TaxRateSeeder or
 * its own setup, and creating a second one would just confuse the Tax tab
 * with two rates that mean the same thing. Only a company with no
 * matching row at all — most plausibly one that already ran "Reset
 * configuration" and lost everything, which is the exact situation this
 * whole feature exists to stop happening again — gets a freshly inserted
 * one.
 */
class SeedProtectedDefaultTaxRates extends Migration
{
    private const STANDARD_RATES = [
        ['tax_system' => 'vat', 'name' => 'VAT', 'rate' => 12.0],
        ['tax_system' => 'gst', 'name' => 'GST', 'rate' => 10.0],
    ];

    public function up()
    {
        $companyIds = array_column($this->db->table('companies')->select('id')->get()->getResultArray(), 'id');
        $now = date('Y-m-d H:i:s');

        foreach ($companyIds as $companyId) {
            foreach (self::STANDARD_RATES as $standard) {
                // Prefer a row that's already at the standard rate for this
                // regime, whatever it happens to be named.
                $existing = $this->db->table('tax_rates')
                    ->where('company_id', $companyId)
                    ->where('tax_system', $standard['tax_system'])
                    ->where('rate', $standard['rate'])
                    ->get()->getFirstRow();

                // Failing that, a row already named the way this one would
                // be — most likely the same rate re-typed to something odd
                // — is still a better match than creating a second one.
                if (! $existing) {
                    $existing = $this->db->table('tax_rates')
                        ->where('company_id', $companyId)
                        ->where('tax_system', $standard['tax_system'])
                        ->where('name', $standard['name'])
                        ->get()->getFirstRow();
                }

                if ($existing) {
                    $this->db->table('tax_rates')->where('id', $existing->id)->update(['is_system' => 1]);
                    continue;
                }

                $this->db->table('tax_rates')->insert([
                    'company_id' => $companyId,
                    'name' => $standard['name'],
                    'tax_system' => $standard['tax_system'],
                    'rate' => $standard['rate'],
                    'is_default' => 1,
                    'is_system' => 1,
                    'is_active' => 1,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }
        }
    }

    public function down()
    {
        // Only clears the flag — never deletes the rows themselves. A rate
        // this migration promoted (rather than inserted) may already have
        // real sales/products pointing at it; removing that row on a
        // rollback would be a far more destructive surprise than leaving
        // it just unprotected again.
        $this->db->table('tax_rates')->set('is_system', 0)->where('is_system', 1)->update();
    }
}
