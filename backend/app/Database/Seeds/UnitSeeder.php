<?php

namespace App\Database\Seeds;

use CodeIgniter\Database\Seeder;

class UnitSeeder extends Seeder
{
    /**
     * decimal_places reflects how that unit is actually sold: whole
     * pieces/boxes/milliliters/grams, but fractional weights/lengths
     * to 3 decimals (e.g. 1.250 KG of rice, 0.750 KG, 2.500 L, 3.250 M
     * of cable — Phase 13's examples).
     */
    private array $units = [
        ['name' => 'Pieces', 'abbreviation' => 'PCS', 'decimal_places' => 0],
        ['name' => 'Kilogram', 'abbreviation' => 'KG', 'decimal_places' => 3],
        ['name' => 'Gram', 'abbreviation' => 'G', 'decimal_places' => 0],
        ['name' => 'Liter', 'abbreviation' => 'L', 'decimal_places' => 3],
        ['name' => 'Milliliter', 'abbreviation' => 'ML', 'decimal_places' => 0],
        ['name' => 'Meter', 'abbreviation' => 'M', 'decimal_places' => 3],
        ['name' => 'Box', 'abbreviation' => 'BOX', 'decimal_places' => 0],
    ];

    public function run()
    {
        $now = date('Y-m-d H:i:s');

        foreach ($this->units as $unit) {
            $existing = $this->db->table('units')
                ->where('abbreviation', $unit['abbreviation'])
                ->get()->getFirstRow();

            if ($existing) {
                $this->db->table('units')->where('id', $existing->id)->update([
                    'decimal_places' => $unit['decimal_places'],
                    'updated_at' => $now,
                ]);
                continue;
            }

            $this->db->table('units')->insert([
                'name' => $unit['name'],
                'abbreviation' => $unit['abbreviation'],
                'decimal_places' => $unit['decimal_places'],
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }
}
