<?php

namespace App\Models;

use CodeIgniter\Model;

class ReturnItemModel extends Model
{
    protected $table = 'return_items';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'object';
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';

    protected $allowedFields = [
        'return_id', 'sale_item_id', 'product_id', 'quantity',
        'unit_price', 'refund_amount',
    ];

    protected $validationRules = [
        'return_id' => 'required|is_natural_no_zero',
        'sale_item_id' => 'required|is_natural_no_zero',
        'product_id' => 'required|is_natural_no_zero',
        'quantity' => 'required|decimal',
        'unit_price' => 'required|decimal',
        'refund_amount' => 'required|decimal',
    ];

    /**
     * How much of a sale line has already been returned — only counts
     * COMPLETED (i.e. approved/refunded) returns, so a pending or
     * cancelled request never blocks or counts against the sold quantity.
     * $excludingReturnId lets a re-check during approve() ignore the
     * very return being approved.
     */
    public function returnedQuantityForSaleItem(int $saleItemId, ?int $excludingReturnId = null): float
    {
        $builder = $this->db->table('return_items ri')
            ->selectSum('ri.quantity')
            ->join('returns r', 'r.id = ri.return_id')
            ->where('ri.sale_item_id', $saleItemId)
            ->where('r.status', 'completed');

        if ($excludingReturnId !== null) {
            $builder->where('ri.return_id !=', $excludingReturnId);
        }

        return (float) ($builder->get()->getRow()->quantity ?? 0);
    }
}
