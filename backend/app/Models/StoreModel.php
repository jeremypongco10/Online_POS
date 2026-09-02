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

    protected $allowedFields = [
        'company_id', 'name', 'code', 'address', 'phone', 'email', 'is_active', 'receipt_footer_note',
        'vat_reg_tin', 'pos_serial_no', 'min_no', 'show_bir_details',
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
    ];
}
