<?php

namespace App\Database\Seeds;

use CodeIgniter\Database\Seeder;

/**
 * Seeds the default tax types.
 *
 * `tax_rates` is the single source of truth for tax percentages —
 * application code must always look up a product/sale's tax_rate_id
 * and read `rate` from this table rather than hard-coding a VAT
 * percentage anywhere. The `rate` values below are starting defaults;
 * each company can adjust them (or add its own tax types) without
 * touching code.
 *
 * Depends on CompanySeeder (tax_rates are company-scoped).
 */
class TaxRateSeeder extends Seeder
{
    private array $taxRates = [
        ['name' => 'VAT', 'rate' => 12.0000, 'is_default' => 1],
        ['name' => 'VAT EXEMPT', 'rate' => 0.0000, 'is_default' => 0],
        ['name' => 'ZERO RATED', 'rate' => 0.0000, 'is_default' => 0],
        ['name' => 'NON VAT', 'rate' => 0.0000, 'is_default' => 0],
    ];

    public function run()
    {
        $company = $this->db->table('companies')->get()->getFirstRow();

        if (! $company) {
            log_message('error', 'TaxRateSeeder: no company found. Run CompanySeeder first.');
            return;
        }

        $now = date('Y-m-d H:i:s');

        foreach ($this->taxRates as $taxRate) {
            $exists = $this->db->table('tax_rates')
                ->where('company_id', $company->id)
                ->where('name', $taxRate['name'])
                ->get()->getFirstRow();

            if ($exists) {
                continue;
            }

            $this->db->table('tax_rates')->insert([
                'company_id' => $company->id,
                'name' => $taxRate['name'],
                'rate' => $taxRate['rate'],
                'is_default' => $taxRate['is_default'],
                'is_active' => 1,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }
}
