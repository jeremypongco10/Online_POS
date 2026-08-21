<?php

namespace App\Models;

use CodeIgniter\Model;

class StoreProductPriceModel extends Model
{
    protected $table = 'store_product_prices';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'object';
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';

    protected $allowedFields = [
        'product_id', 'store_id', 'cost_price', 'selling_price',
    ];

    protected $validationRules = [
        'product_id' => 'required|is_natural_no_zero',
        'store_id' => 'required|is_natural_no_zero',
        'cost_price' => 'required|decimal',
        'selling_price' => 'required|decimal',
    ];

    /** One row per (product_id, store_id) — inserts or overwrites in a single upsert per store. */
    public function upsertPrice(int $productId, int $storeId, float $costPrice, float $sellingPrice): void
    {
        $this->builder()->upsert([
            'product_id' => $productId,
            'store_id' => $storeId,
            'cost_price' => $costPrice,
            'selling_price' => $sellingPrice,
        ]);
    }
}
