<?php

namespace App\Models;

use CodeIgniter\Model;

/**
 * Issued Z-readings — see CreateZReadings for why these are stored rather
 * than recomputed. Deliberately has no update or delete path exposed
 * anywhere: a Z-reading is a statement of what a terminal reported on a
 * date, and correcting one after the fact by editing it is precisely the
 * thing the record exists to make impossible.
 */
class ZReadingModel extends Model
{
    protected $table = 'z_readings';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'object';
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';

    protected $allowedFields = [
        'company_id', 'store_id', 'register_id', 'z_counter', 'reset_counter',
        'business_date', 'covers_from', 'covers_to',
        'min_no', 'pos_serial_no', 'ptu_number',
        'beginning_invoice_number', 'ending_invoice_number',
        'beginning_grand_total', 'ending_grand_total',
        'transaction_count', 'gross_sales', 'discount_total', 'net_sales',
        'vatable_sales', 'vat_amount', 'vat_exempt_sales', 'zero_rated_sales', 'non_vat_sales',
        'sc_discount_total', 'pwd_discount_total', 'bnpc_discount_total', 'other_discount_total',
        'void_count', 'void_total', 'return_count', 'return_total',
        'generated_by',
    ];
}
