<?php

namespace App\Models;

use CodeIgniter\Model;

class RegisterModel extends Model
{
    protected $table = 'registers';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'object';
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';

    public const OPENING_FLOAT_MANUAL = 'manual';
    public const OPENING_FLOAT_FIXED = 'fixed';
    public const OPENING_FLOAT_FIXED_CONFIRM = 'fixed_confirm';

    // grand_total/z_counter/reset_counter are BIR machine counters (see
    // AddBirAccreditationFields) and are deliberately NOT here: they move
    // only through BirReadingService and ReadingsController, never
    // through an ordinary update of a register's name or float. Leaving
    // them out is what stops an accredited terminal's lifetime total from
    // being editable in a settings form.
    protected $allowedFields = ['store_id', 'name', 'code', 'is_active', 'opening_float_mode', 'default_opening_float', 'is_training_mode'];

    protected $validationRules = [
        'store_id' => ['label' => 'Store', 'rules' => 'required|is_natural_no_zero'],
        'name' => ['label' => 'Name', 'rules' => 'required|max_length[100]'],
        'code' => ['label' => 'Code', 'rules' => 'required|max_length[30]'],
        'is_active' => ['label' => 'Active status', 'rules' => 'permit_empty|in_list[0,1]'],
        'opening_float_mode' => ['label' => 'Opening float mode', 'rules' => 'permit_empty|in_list[manual,fixed,fixed_confirm]'],
        // permit_empty here on purpose, not required-when-non-manual — a
        // DECIMAL column/single-field rule can't express "required only
        // sometimes", so that relationship is enforced in
        // RegistersController instead (see its own note).
        'default_opening_float' => ['label' => 'Opening float', 'rules' => 'permit_empty|decimal|greater_than_equal_to[0]'],
    ];
}
