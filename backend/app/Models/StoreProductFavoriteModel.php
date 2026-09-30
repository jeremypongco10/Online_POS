<?php

namespace App\Models;

use CodeIgniter\Model;

/** A store's starred products — see CreateStoreProductFavorites for why this is its own table. */
class StoreProductFavoriteModel extends Model
{
    protected $table = 'store_product_favorites';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'object';
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';

    protected $allowedFields = ['store_id', 'product_id'];

    /**
     * Idempotent both ways: starring an already-starred product, or
     * un-starring one that isn't, is a no-op rather than an error — two
     * managers tapping the same star at once shouldn't turn one of them into
     * a failure. INSERT IGNORE leans on the (store_id, product_id) unique key
     * for the race; the builder bypasses model timestamps, so they're set here.
     */
    public function setFavorite(int $storeId, int $productId, bool $favorite): void
    {
        if (! $favorite) {
            $this->builder()->where('store_id', $storeId)->where('product_id', $productId)->delete();

            return;
        }

        $now = date('Y-m-d H:i:s');
        $this->builder()->ignore(true)->insert([
            'store_id' => $storeId,
            'product_id' => $productId,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
    }

    /** @return int[] ids of the stores that have starred this product */
    public function storeIdsFor(int $productId): array
    {
        return array_map('intval', $this->where('product_id', $productId)->findColumn('store_id') ?: []);
    }
}
