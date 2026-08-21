<?php

namespace App\Models;

use App\Libraries\WeightCalculator;
use CodeIgniter\Model;

class UnitModel extends Model
{
    protected $table = 'units';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'object';
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';

    protected $allowedFields = ['name', 'abbreviation', 'decimal_places'];

    protected $validationRules = [
        'id' => 'permit_empty|is_natural', // used only to resolve the {id} placeholder below
        'name' => 'required|max_length[50]',
        'abbreviation' => 'required|max_length[10]|is_unique[units.abbreviation,id,{id}]',
        'decimal_places' => 'permit_empty|is_natural|less_than_equal_to[4]',
    ];

    /** Rounds a quantity to the precision this unit actually supports (e.g. whole PCS, 0.001 KG). */
    public function roundToPrecision(int $unitId, float $quantity): float
    {
        $unit = $this->find($unitId);

        return (new WeightCalculator())->roundQuantity($quantity, $unit->decimal_places ?? 2);
    }
}
