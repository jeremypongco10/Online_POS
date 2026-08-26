<?php

namespace App\Controllers\Api\V1;

use App\Controllers\Api\BaseCrudController;
use App\Models\InventoryModel;
use App\Models\InventoryTransactionModel;
use App\Models\ProductModel;
use App\Models\ReturnItemModel;
use App\Models\SaleItemModel;
use App\Models\SaleModel;
use App\Models\SalesReturnModel;
use CodeIgniter\Model;
use Config\Database;
use Config\Services;

/**
 * Phase 19 flow: Search Invoice -> Select Product -> Select Quantity ->
 * Reason -> Approve -> Refund -> Return inventory.
 *
 * create() only ever produces a PENDING return — it validates and
 * records the request but touches neither money nor stock. approve()
 * is the one place a refund is issued and inventory is restocked, and
 * it requires returns.approve (a separate permission from
 * returns.create), so the person requesting a return can never also be
 * the one who authorizes it through this endpoint alone.
 */
class ReturnsController extends BaseCrudController
{
    protected string $modelClass = SalesReturnModel::class;
    protected array $allowedFilters = ['sale_id', 'store_id', 'customer_id', 'status'];
    protected array $allowedSorts = ['id', 'return_number', 'return_date', 'total_refund', 'created_at'];
    protected array $searchableFields = ['return_number', 'reason'];
    protected string $defaultSort = '-return_date';

    /** returns has no company_id column of its own — scope indirectly through store_id. */
    protected function applyScope(): Model
    {
        return $this->scopeByStoreIds('store_id');
    }

    /** GET /api/v1/returns/{id}/items */
    public function items($id = null)
    {
        if (! $this->applyScope()->find($id)) {
            return $this->notFound();
        }

        return $this->ok(model(ReturnItemModel::class)->where('return_id', $id)->findAll());
    }

    /**
     * GET /api/v1/returns/eligible-items?sale_id=X
     * "Select Product" / "Select Quantity": every line on the invoice
     * with however much of it is still returnable (sold minus already
     * completed-returned), so the UI can bound the quantity picker and
     * hide lines that are already fully returned.
     */
    public function eligibleItems()
    {
        $saleId = (int) $this->request->getGet('sale_id');

        if ($saleId === 0) {
            return $this->apiFail('sale_id is required', 422);
        }

        $sale = model(SaleModel::class)->where('company_id', Services::authContext()->companyId)->find($saleId);
        if (! $sale || ! Services::authContext()->canAccessStore((int) $sale->store_id)) {
            return $this->apiFail('Unknown sale_id', 422);
        }

        $returnItemModel = model(ReturnItemModel::class);
        $items = model(SaleItemModel::class)->where('sale_id', $saleId)->findAll();

        $result = array_map(static function ($item) use ($returnItemModel) {
            $returned = $returnItemModel->returnedQuantityForSaleItem((int) $item->id);
            $item->returned_quantity = $returned;
            $item->remaining_quantity = max(0, (float) $item->quantity - $returned);

            return $item;
        }, $items);

        return $this->ok($result);
    }

    /**
     * POST /api/v1/returns
     * body: { sale_id, store_id, customer_id?, reason?, items: [{ sale_item_id, quantity }] }
     *
     * product_id and unit_price are never taken from the client — both
     * are read from the referenced sale_item, so a return can't be used
     * to refund a different product or a manipulated price than what
     * was actually sold. Creates a PENDING return only; no money moves
     * and no stock changes until approve().
     */
    public function create()
    {
        $payload = $this->payload();
        $items = $payload['items'] ?? [];
        unset($payload['items']);

        if (! is_array($items) || $items === []) {
            return $this->apiFail('At least one return item is required', 422);
        }

        foreach (['sale_id', 'store_id'] as $required) {
            if (empty($payload[$required])) {
                return $this->apiFail("{$required} is required", 422);
            }
        }

        $sale = model(SaleModel::class)
            ->where('company_id', Services::authContext()->companyId)
            ->find((int) $payload['sale_id']);
        if (! $sale || ! Services::authContext()->canAccessStore((int) $sale->store_id)) {
            return $this->apiFail('Unknown sale_id', 422);
        }
        if ((int) $payload['store_id'] !== (int) $sale->store_id) {
            return $this->apiFail('store_id must match the sale\'s own store', 422);
        }
        if ($sale->status !== 'completed') {
            return $this->apiFail("Cannot return items from a sale with status: {$sale->status}", 422);
        }

        $saleItemModel = model(SaleItemModel::class);
        $returnItemModel = model(ReturnItemModel::class);
        $lineData = [];
        $totalRefund = 0.0;

        foreach ($items as $item) {
            $saleItem = $saleItemModel->find((int) ($item['sale_item_id'] ?? 0));

            if (! $saleItem || (int) $saleItem->sale_id !== (int) $sale->id) {
                return $this->apiFail("sale_item_id {$item['sale_item_id']} does not belong to this sale", 422);
            }

            $quantity = (float) ($item['quantity'] ?? 0);
            if ($quantity <= 0) {
                return $this->apiFail('Return quantity must be greater than zero', 422);
            }

            // Prevent returning more than sold, and prevent returning
            // already-returned quantity — both checked against the same
            // "remaining" figure: sold minus whatever's already completed-returned.
            $alreadyReturned = $returnItemModel->returnedQuantityForSaleItem((int) $saleItem->id);
            $remaining = (float) $saleItem->quantity - $alreadyReturned;

            if ($quantity > $remaining + 0.0001) {
                return $this->apiFail(
                    "Cannot return {$quantity} of this item: sold {$saleItem->quantity}, already returned {$alreadyReturned}, {$remaining} remaining",
                    422
                );
            }

            $refundAmount = round($quantity * (float) $saleItem->unit_price, 2);
            $totalRefund += $refundAmount;

            $lineData[] = [
                'sale_item_id' => $saleItem->id,
                'product_id' => $saleItem->product_id,
                'quantity' => $quantity,
                'unit_price' => $saleItem->unit_price,
                'refund_amount' => $refundAmount,
            ];
        }

        $db = Database::connect();
        $db->transStart();

        $returnId = $this->model->insert([
            'sale_id' => $sale->id,
            'store_id' => $payload['store_id'],
            'customer_id' => $payload['customer_id'] ?? null,
            'user_id' => Services::authContext()->userId,
            'reason' => $payload['reason'] ?? null,
            'status' => SalesReturnModel::STATUS_PENDING,
            'total_refund' => round($totalRefund, 2),
            'return_date' => date('Y-m-d H:i:s'),
            'return_number' => 'RET-' . strtoupper(bin2hex(random_bytes(4))),
        ], true);

        if ($returnId === false) {
            $db->transRollback();

            return $this->validationFail($this->model->errors());
        }

        foreach ($lineData as $line) {
            if ($returnItemModel->insert(['return_id' => $returnId, ...$line]) === false) {
                $db->transRollback();

                return $this->validationFail($returnItemModel->errors());
            }
        }

        $db->transComplete();

        if ($db->transStatus() === false) {
            return $this->apiFail('Failed to create return', 500);
        }

        return $this->created($this->model->find($returnId), 'Return requested — awaiting approval');
    }

    /**
     * POST /api/v1/returns/{id}/approve
     * Pending only. This is the one place a refund is issued and stock
     * comes back — gated on returns.approve, a permission distinct from
     * returns.create, so the requester alone can't authorize their own
     * refund.
     */
    public function approve($id = null)
    {
        $return = $this->applyScope()->find($id);

        if (! $return) {
            return $this->notFound();
        }

        if ($return->status !== SalesReturnModel::STATUS_PENDING) {
            return $this->apiFail("Only a pending return can be approved (current status: {$return->status})", 422);
        }

        $returnItemModel = model(ReturnItemModel::class);
        $lines = $returnItemModel->where('return_id', $id)->findAll();

        // Re-validate against the current state, not the state at request
        // time — another return on the same sale item could have been
        // approved in the meantime.
        $saleItemModel = model(SaleItemModel::class);
        foreach ($lines as $line) {
            $saleItem = $saleItemModel->find($line->sale_item_id);
            $alreadyReturned = $returnItemModel->returnedQuantityForSaleItem((int) $line->sale_item_id, (int) $id);
            $remaining = (float) $saleItem->quantity - $alreadyReturned;

            if ((float) $line->quantity > $remaining + 0.0001) {
                return $this->apiFail(
                    "Cannot approve: requested {$line->quantity} of {$saleItem->product_name} but only {$remaining} is still returnable now",
                    422
                );
            }
        }

        $db = Database::connect();
        $db->transStart();

        // --- Refund + Return inventory ---
        $inventoryModel = model(InventoryModel::class);
        $transactionModel = model(InventoryTransactionModel::class);

        foreach ($lines as $line) {
            $product = model(ProductModel::class)->find($line->product_id);
            if (! $product || ! (bool) $product->track_inventory) {
                continue;
            }

            $inventory = $inventoryModel->forProductAtStore((int) $line->product_id, (int) $return->store_id);
            $balance = Services::inventoryCalculator()->applyDelta((float) ($inventory->quantity ?? 0), (float) $line->quantity);
            $inventoryId = $inventory
                ? $inventory->id
                : $inventoryModel->insert([
                    'product_id' => $line->product_id,
                    'store_id' => $return->store_id,
                    'quantity' => 0,
                    'reorder_level' => $product->minimum_stock ?? 0,
                ], true);

            $inventoryModel->update($inventoryId, ['quantity' => $balance]);

            $transactionModel->insert([
                'inventory_id' => $inventoryId,
                'product_id' => $line->product_id,
                'store_id' => $return->store_id,
                'type' => InventoryTransactionModel::TYPE_RETURN,
                'quantity' => $line->quantity,
                'balance_after' => $balance,
                'reference_type' => 'return',
                'reference_id' => $return->id,
                'user_id' => Services::authContext()->userId,
            ]);
        }

        $this->model->update($id, [
            'status' => SalesReturnModel::STATUS_COMPLETED,
            'approved_by' => Services::authContext()->userId,
            'approved_at' => date('Y-m-d H:i:s'),
        ]);

        $db->transComplete();

        if ($db->transStatus() === false) {
            return $this->apiFail('Failed to approve return', 500);
        }

        return $this->ok($this->model->find($id), 'Return approved, refunded, and inventory restocked');
    }

    /** POST /api/v1/returns/{id}/reject — pending only. */
    public function reject($id = null)
    {
        $return = $this->applyScope()->find($id);

        if (! $return) {
            return $this->notFound();
        }

        if ($return->status !== SalesReturnModel::STATUS_PENDING) {
            return $this->apiFail("Only a pending return can be rejected (current status: {$return->status})", 422);
        }

        $payload = $this->request->getJSON(true) ?? [];

        $this->model->update($id, [
            'status' => SalesReturnModel::STATUS_CANCELLED,
            'reason' => trim(($return->reason ?? '') . ' [REJECTED] ' . ($payload['reason'] ?? '')),
        ]);

        return $this->ok($this->model->find($id), 'Return rejected');
    }

    /**
     * Status only ever moves through approve()/reject() — never a raw
     * field edit — same reasoning as PurchasesController::update().
     */
    public function update($id = null)
    {
        $payload = $this->payload();

        if (array_key_exists('status', $payload)) {
            return $this->apiFail('status cannot be set directly — use approve/reject', 422);
        }

        return parent::update($id);
    }
}
