<?php

namespace App\Database\Seeds;

use CodeIgniter\Database\Seeder;

/**
 * Bootstraps one default company so company-scoped seed data
 * (roles, tax rates, etc.) has a row to attach to.
 */
class CompanySeeder extends Seeder
{
    public function run()
    {
        $existing = $this->db->table('companies')->get()->getFirstRow();

        if ($existing) {
            return;
        }

        $now = date('Y-m-d H:i:s');

        $this->db->table('companies')->insert([
            'trade_name' => 'Default Company',
            'legal_name' => 'Default Company',
            'currency' => 'USD',
            'timezone' => 'UTC',
            'is_active' => 1,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
    }
}
