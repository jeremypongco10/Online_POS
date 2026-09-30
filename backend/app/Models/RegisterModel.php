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

    // grand_total/z_counter/reset_counter are BIR machine counters (see
    // AddBirAccreditationFields) and are deliberately NOT here: they move
    // only through BirReadingService and ReadingsController, never
    // through an ordinary update of a register's name or float. Leaving
    // them out is what stops an accredited terminal's lifetime total from
    // being editable in a settings form.
    protected $allowedFields = ['store_id', 'name', 'code', 'is_active', 'is_training_mode'];

    protected $validationRules = [
        'store_id' => ['label' => 'Store', 'rules' => 'required|is_natural_no_zero'],
        'name' => ['label' => 'Name', 'rules' => 'required|max_length[100]'],
        'code' => ['label' => 'Code', 'rules' => 'required|max_length[30]'],
        'is_active' => ['label' => 'Active status', 'rules' => 'permit_empty|in_list[0,1]'],
    ];

    /**
     * The (mode, float) this register actually opens at — always its own
     * store's configuration (see AddOpeningFloatToStores), unconditionally.
     * A register carries no opening-float configuration of its own at all
     * (see DropOpeningFloatFromRegisters) — this is what
     * CashSessionsController::open() (what a shift really opens at) and
     * RegistersController's own list/show (what the POS's register picker
     * shows the cashier before they've even opened one, via the
     * effective_* fields it adds) both read, so the two can never
     * disagree about what a register opens at.
     *
     * @return array{0: string, 1: string|null} [mode, float]
     */
    public function resolveOpeningFloat(object $register): array
    {
        $store = model(StoreModel::class)->find($register->store_id);
        if ($store === null) {
            return [StoreModel::OPENING_FLOAT_MANUAL, null];
        }

        return [$store->opening_float_mode ?? StoreModel::OPENING_FLOAT_MANUAL, $store->default_opening_float ?? null];
    }
}
