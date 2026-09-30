<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * A NEW register should centralize by default now that a store can carry
 * its own opening-float configuration (see AddOpeningFloatToStores) —
 * RegistersController::create() already falls back to 'inherit' when a
 * request omits opening_float_mode entirely for ITS OWN validation check,
 * but that check happens before parent::create() re-reads and inserts the
 * payload straight from the request body: an omitted field never makes it
 * into the INSERT at all, so it's the column's own DEFAULT — not
 * anything in the controller — that actually decides what an omitted
 * field becomes. This is that fix.
 *
 * Existing rows are untouched — a DEFAULT only ever applies to a new row
 * that doesn't specify the column, never retroactively.
 */
class ChangeRegistersOpeningFloatDefaultToInherit extends Migration
{
    public function up()
    {
        $this->forge->modifyColumn('registers', [
            'opening_float_mode' => [
                'name' => 'opening_float_mode',
                'type' => 'VARCHAR',
                'constraint' => 20,
                'null' => false,
                'default' => 'inherit',
            ],
        ]);
    }

    public function down()
    {
        $this->forge->modifyColumn('registers', [
            'opening_float_mode' => [
                'name' => 'opening_float_mode',
                'type' => 'VARCHAR',
                'constraint' => 20,
                'null' => false,
                'default' => 'manual',
            ],
        ]);
    }
}
