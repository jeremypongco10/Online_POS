<?php

namespace App\Models;

use CodeIgniter\Model;

class InventoryModel extends Model
{
    protected $table = 'inventory';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'object';
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';

    protected $allowedFields = [
        'product_id', 'store_id', 'quantity', 'reorder_level',
    ];

    protected $validationRules = [
        'product_id' => ['label' => 'Product', 'rules' => 'required|is_natural_no_zero'],
        'store_id' => ['label' => 'Store', 'rules' => 'required|is_natural_no_zero'],
        'quantity' => ['label' => 'Quantity', 'rules' => 'permit_empty|decimal'],
        'reorder_level' => ['label' => 'Reorder level', 'rules' => 'permit_empty|decimal'],
    ];

    public function forProductAtStore(int $productId, int $storeId): ?object
    {
        return $this->where('product_id', $productId)->where('store_id', $storeId)->first();
    }

    /**
     * Stock for one product across every store it's stocked at — e.g.
     * Coke: Angeles -> 100, Manila -> 50, Tarlac -> 80. Inventory is
     * store-specific, so this is the natural read for "how much do we
     * have of X" across a company's stores.
     */
    public function forProductAcrossStores(int $productId): array
    {
        return $this->db->table('inventory i')
            ->select('i.id, i.store_id, s.name AS store_name, s.code AS store_code, i.quantity, i.reorder_level, i.updated_at')
            ->join('stores s', 's.id = i.store_id')
            ->where('i.product_id', $productId)
            ->orderBy('s.name', 'ASC')
            ->get()->getResult();
    }
}
