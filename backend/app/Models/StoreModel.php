<?php

namespace App\Models;

use CodeIgniter\Model;

class StoreModel extends Model
{
    protected $table = 'stores';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'object';
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';

    /**
     * The three ways a cash session can start on any register in this
     * store — see AddOpeningFloatToStores. Every register uses ITS
     * store's setting unconditionally now (no per-register override —
     * see DropOpeningFloatFromRegisters and RegisterModel::
     * resolveOpeningFloat()), so this is the one and only place these
     * modes are configured.
     */
    public const OPENING_FLOAT_MANUAL = 'manual';
    public const OPENING_FLOAT_FIXED = 'fixed';
    public const OPENING_FLOAT_FIXED_CONFIRM = 'fixed_confirm';

    protected $allowedFields = [
        'company_id', 'name', 'code', 'address', 'phone', 'email', 'is_active', 'receipt_footer_note',
        'vat_reg_tin', 'pos_serial_no', 'min_no', 'show_bir_details',
        'ptu_number', 'ptu_date_issued', 'ptu_valid_until',
        'opening_float_mode', 'default_opening_float',
    ];

    protected $validationRules = [
        'company_id' => ['label' => 'Company', 'rules' => 'required|is_natural_no_zero'],
        'name' => ['label' => 'Name', 'rules' => 'required|min_length[2]|max_length[150]'],
        'code' => ['label' => 'Code', 'rules' => 'required|max_length[30]'],
        'address' => ['label' => 'Address', 'rules' => 'permit_empty|max_length[255]'],
        'phone' => ['label' => 'Phone', 'rules' => 'permit_empty|max_length[30]'],
        'email' => ['label' => 'Email', 'rules' => 'permit_empty|valid_email|max_length[150]'],
        'is_active' => ['label' => 'Active status', 'rules' => 'permit_empty|in_list[0,1]'],
        // A closing message printed at the BOTTOM of this store's own
        // receipts — "Thank you, come again", a return policy, a promo,
        // etc. The header above it is a fixed structured block (name,
        // address, TIN, VAT Reg TIN, POS Serial No, MIN No — see the
        // fields below), so free text has no place there; this is the
        // one spot on the receipt meant for it. Copied onto `sales` at
        // checkout time (see RenameReceiptHeaderNoteToFooter), so editing
        // this never rewrites a receipt already issued.
        'receipt_footer_note' => ['label' => 'Receipt footer note', 'rules' => 'permit_empty|max_length[2000]'],
        // BIR-mandated identifiers printed in the receipt's header — see
        // AddBirPosFieldsToStores. Same frozen-at-checkout treatment as
        // receipt_footer_note.
        'vat_reg_tin' => ['label' => 'VAT Reg TIN', 'rules' => 'permit_empty|max_length[30]'],
        'pos_serial_no' => ['label' => 'POS Serial No', 'rules' => 'permit_empty|max_length[50]'],
        'min_no' => ['label' => 'MIN No', 'rules' => 'permit_empty|max_length[50]'],
        // Whether the three fields above actually print on this store's
        // receipts — see AddShowBirDetailsToStores. Independent of
        // whether they're filled in.
        'show_bir_details' => ['label' => 'Show BIR details on receipt', 'rules' => 'permit_empty|in_list[0,1]'],
        // This store's own opening-float default — see AddOpeningFloatToStores.
        // No 'inherit' option here, unlike a register's own version of this
        // field: a store is the top of that hierarchy, nothing further up
        // for it to inherit from.
        'opening_float_mode' => ['label' => 'Opening float mode', 'rules' => 'permit_empty|in_list[manual,fixed,fixed_confirm]'],
        'default_opening_float' => ['label' => 'Opening float', 'rules' => 'permit_empty|decimal|greater_than_equal_to[0]'],
    ];
}
