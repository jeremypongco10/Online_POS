<?php

namespace App\Models;

use CodeIgniter\Model;

/**
 * The append-only audit trail behind every stock change. Every write
 * to `inventory.quantity` anywhere in the app must be paired with an
 * insert here in the same transaction — stock is never changed
 * silently. `type` is one of exactly: purchase, sale, return,
 * adjustment, transfer_in, transfer_out.
 */
class InventoryTransactionModel extends Model
{
    public const TYPE_PURCHASE = 'purchase';
    public const TYPE_SALE = 'sale';
    public const TYPE_RETURN = 'return';
    public const TYPE_ADJUSTMENT = 'adjustment';
    public const TYPE_TRANSFER_IN = 'transfer_in';
    public const TYPE_TRANSFER_OUT = 'transfer_out';

    protected $table = 'inventory_transactions';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'object';
    protected $useTimestamps = false;

    protected $allowedFields = [
        'inventory_id', 'product_id', 'store_id', 'type', 'quantity',
        'balance_after', 'reference_type', 'reference_id', 'user_id',
        'notes', 'created_at',
    ];

    protected $validationRules = [
        'inventory_id' => ['label' => 'Inventory record', 'rules' => 'required|is_natural_no_zero'],
        'product_id' => ['label' => 'Product', 'rules' => 'required|is_natural_no_zero'],
        'store_id' => ['label' => 'Store', 'rules' => 'required|is_natural_no_zero'],
        'type' => ['label' => 'Type', 'rules' => 'required|in_list[purchase,sale,return,adjustment,transfer_in,transfer_out]'],
        'quantity' => ['label' => 'Quantity', 'rules' => 'required|decimal'],
        'balance_after' => ['label' => 'Balance after', 'rules' => 'required|decimal'],
    ];

    protected $beforeInsert = ['setCreatedAt'];

    protected function setCreatedAt(array $data): array
    {
        $data['data']['created_at'] ??= date('Y-m-d H:i:s');

        return $data;
    }
}
