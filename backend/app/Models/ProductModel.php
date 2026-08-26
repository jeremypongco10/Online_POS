<?php

namespace App\Models;

use CodeIgniter\Model;

class ProductModel extends Model
{
    protected $table = 'products';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'object';
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';

    protected $allowedFields = [
        'company_id', 'category_id', 'unit_id', 'tax_rate_id',
        'sku', 'barcode', 'name', 'description', 'image_path',
        'minimum_stock', 'is_active', 'track_inventory',
    ];

    protected $validationRules = [
        'id' => 'permit_empty|is_natural', // used only to resolve the {id} placeholder below
        'company_id' => ['label' => 'Company', 'rules' => 'required|is_natural_no_zero'],
        'category_id' => ['label' => 'Category', 'rules' => 'permit_empty|is_natural_no_zero'],
        'unit_id' => ['label' => 'Unit', 'rules' => 'permit_empty|is_natural_no_zero'],
        'tax_rate_id' => ['label' => 'Tax rate', 'rules' => 'permit_empty|is_natural_no_zero'],
        // Uniqueness on SKU is (company_id, sku) at the DB level, not
        // global — deliberately not validated here to avoid rejecting a
        // SKU that's merely reused by a different company.
        'sku' => ['label' => 'SKU', 'rules' => 'required|max_length[60]'],
        'barcode' => ['label' => 'Barcode', 'rules' => 'permit_empty|max_length[60]'],
        'name' => ['label' => 'Name', 'rules' => 'required|max_length[150]'],
        'minimum_stock' => ['label' => 'Minimum stock', 'rules' => 'permit_empty|decimal'],
        'is_active' => ['label' => 'Active status', 'rules' => 'permit_empty|in_list[0,1]'],
        'track_inventory' => ['label' => 'Track inventory', 'rules' => 'permit_empty|in_list[0,1]'],
    ];
}
