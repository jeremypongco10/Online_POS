<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Completes what SeedProtectedDefaultTaxRates started: that migration only
 * protected the 12% VAT rate itself, but TaxService::classify() reads the
 * receipt's V/E/Z/N flag off a rate's NAME (str_contains against 'ZERO
 * RATED', 'EXEMPT', 'NON VAT', 'VAT' — in that order), and a Philippine
 * company needs all four of those classifications available to pick from,
 * not just the standard one, to flag an exempt or zero-rated product
 * correctly at all. Without this, a reset left VAT itself protected but
 * still wiped the other three, which is the gap this fixes.
 *
 * GST gets no equivalent set here on purpose: TAX_SYSTEMS.gst.showBirDetail
 * is false (see src/regional.ts) specifically because the V/E/Z/N system is
 * a Philippine BIR convention with no GST counterpart — there's nothing
 * for a second, third or fourth GST classification to mean.
 *
 * Same promote-if-it-already-exists-by-name-or-rate approach as
 * SeedProtectedDefaultTaxRates, for the same reason: most companies
 * already have these three from TaxRateSeeder, and creating duplicates
 * would just confuse the Tax tab.
 */
class SeedRemainingVatClassificationRates extends Migration
{
    private const REMAINING_VAT_RATES = [
        ['name' => 'VAT EXEMPT', 'rate' => 0.0],
        ['name' => 'ZERO RATED', 'rate' => 0.0],
        ['name' => 'NON VAT', 'rate' => 0.0],
    ];

    public function up()
    {
        $companyIds = array_column($this->db->table('companies')->select('id')->get()->getResultArray(), 'id');
        $now = date('Y-m-d H:i:s');

        foreach ($companyIds as $companyId) {
            foreach (self::REMAINING_VAT_RATES as $standard) {
                // Name match first here, deliberately the opposite order
                // from SeedProtectedDefaultTaxRates: all three of these
                // are 0%, so matching by rate alone would just grab
                // whichever 0% row happens to exist first and mislabel it
                // — the name IS the classification for this trio (see
                // TaxService::classify), so it's the only reliable match.
                $existing = $this->db->table('tax_rates')
                    ->where('company_id', $companyId)
                    ->where('tax_system', 'vat')
                    ->where('name', $standard['name'])
                    ->get()->getFirstRow();

                if ($existing) {
                    $this->db->table('tax_rates')->where('id', $existing->id)->update(['is_system' => 1]);
                    continue;
                }

                $this->db->table('tax_rates')->insert([
                    'company_id' => $companyId,
                    'name' => $standard['name'],
                    'tax_system' => 'vat',
                    'rate' => $standard['rate'],
                    'is_default' => 0,
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
        // Only clears the flag — see SeedProtectedDefaultTaxRates::down()
        // for why a rollback never deletes the rows themselves.
        $this->db->table('tax_rates')
            ->whereIn('name', array_column(self::REMAINING_VAT_RATES, 'name'))
            ->where('is_system', 1)
            ->set('is_system', 0)
            ->update();
    }
}
