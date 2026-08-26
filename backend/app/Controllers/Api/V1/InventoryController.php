<?php

namespace App\Controllers\Api\V1;

use App\Controllers\BaseApiController;
use App\Models\InventoryModel;
use App\Models\InventoryTransactionModel;
use App\Models\ProductModel;
use App\Models\StoreModel;
use App\Models\UnitModel;
use Config\Services;

class InventoryController extends BaseApiController
{
    /**
     * Store IDs belonging to the caller's own company, narrowed further
     * to their assigned stores if they're store-restricted. Inventory
     * has no company_id column of its own, so every method here scopes
     * through store_id instead.
     */
    private function allowedStoreIds(): array
    {
        $auth = Services::authContext();
        // findColumn() returns the raw driver values (strings, for MySQLi)
        // — cast to int so the in_array(..., true) strict checks below
        // actually match against the (int) payload store IDs.
        $storeIds = array_map('intval', model(StoreModel::class)->where('company_id', $auth->companyId)->findColumn('id') ?: []);

        if ($auth->allowedStoreIds !== null) {
            $storeIds = array_values(array_intersect($storeIds, $auth->allowedStoreIds));
        }

        return $storeIds;
    }

    /** GET /api/v1/inventory */
    public function index()
    {
        $result = $this->listResource(
            model(InventoryModel::class)->whereIn('store_id', $this->allowedStoreIds() ?: [0]),
            ['product_id', 'store_id'],
            ['id', 'quantity', 'reorder_level', 'updated_at'],
            [],
            'id'
        );

        return $this->ok($result['data'], '', $result['meta']);
    }

    /** GET /api/v1/inventory/{id} */
    public function show($id = null)
    {
        $row = model(InventoryModel::class)->whereIn('store_id', $this->allowedStoreIds() ?: [0])->find($id);

        if (! $row) {
            return $this->notFound();
        }

        return $this->ok($row);
    }

    /**
     * GET /api/v1/inventory/by-product/{productId}
     * Stock for one product across every store — the store-specific
     * view: Coke: Angeles -> 100, Manila -> 50, Tarlac -> 80.
     */
    public function byProduct($productId = null)
    {
        $auth = Services::authContext();
        if (! model(ProductModel::class)->where('company_id', $auth->companyId)->find($productId)) {
            return $this->notFound('Unknown product');
        }

        $allowed = $this->allowedStoreIds();
        $rows = array_values(array_filter(
            model(InventoryModel::class)->forProductAcrossStores((int) $productId),
            static fn ($row) => in_array((int) $row->store_id, $allowed, true)
        ));

        return $this->ok($rows);
    }

    /**
     * GET /api/v1/inventory/movements
     * The append-only audit trail: every PURCHASE/SALE/RETURN/ADJUSTMENT/
     * TRANSFER_IN/TRANSFER_OUT that ever touched stock, filterable and
     * paginated. Read-only — rows are never edited or deleted.
     */
    public function movements()
    {
        $result = $this->listResource(
            model(InventoryTransactionModel::class)->whereIn('store_id', $this->allowedStoreIds() ?: [0]),
            ['product_id', 'store_id', 'type', 'reference_type', 'reference_id', 'user_id'],
            ['id', 'created_at', 'quantity'],
            [],
            '-created_at'
        );

        return $this->ok($result['data'], '', $result['meta']);
    }

    /** POST /api/v1/inventory/adjust  body: { product_id, store_id, quantity_delta, notes? } */
    public function adjust()
    {
        $payload = $this->request->getJSON(true) ?? [];

        $rules = [
            'product_id' => ['label' => 'Product', 'rules' => 'required|is_natural_no_zero'],
            'store_id' => ['label' => 'Store', 'rules' => 'required|is_natural_no_zero'],
            'quantity_delta' => ['label' => 'Quantity adjustment', 'rules' => 'required|decimal'],
        ];

        if (! $this->validateData($payload, $rules)) {
            return $this->validationFail($this->validator->getErrors());
        }

        $product = model(ProductModel::class)->where('company_id', Services::authContext()->companyId)->find($payload['product_id']);
        if (! $product) {
            return $this->apiFail('Unknown product_id', 422);
        }
        if (! in_array((int) $payload['store_id'], $this->allowedStoreIds(), true)) {
            return $this->apiFail('Unknown store_id', 422);
        }

        $inventoryModel = model(InventoryModel::class);
        $db = \Config\Database::connect();
        $db->transStart();

        $inventory = $inventoryModel->forProductAtStore((int) $payload['product_id'], (int) $payload['store_id']);
        $delta = (float) $payload['quantity_delta'];
        if ($product->unit_id !== null) {
            $delta = model(UnitModel::class)->roundToPrecision((int) $product->unit_id, $delta);
        }

        if (! $inventory) {
            $inventoryId = $inventoryModel->insert([
                'product_id' => $payload['product_id'],
                'store_id' => $payload['store_id'],
                'quantity' => $delta,
                'reorder_level' => $product->minimum_stock ?? 0,
            ], true);
            $newQuantity = $delta;
        } else {
            $inventoryId = $inventory->id;
            $newQuantity = Services::inventoryCalculator()->applyDelta((float) $inventory->quantity, $delta);
            $inventoryModel->update($inventoryId, ['quantity' => $newQuantity]);
        }

        model(InventoryTransactionModel::class)->insert([
            'inventory_id' => $inventoryId,
            'product_id' => $payload['product_id'],
            'store_id' => $payload['store_id'],
            'type' => InventoryTransactionModel::TYPE_ADJUSTMENT,
            'quantity' => $delta,
            'balance_after' => $newQuantity,
            'user_id' => Services::authContext()->userId,
            'notes' => $payload['notes'] ?? null,
        ]);

        $db->transComplete();

        return $this->ok(model(InventoryModel::class)->find($inventoryId), 'Inventory adjusted');
    }

    /** POST /api/v1/inventory/transfer  body: { product_id, from_store_id, to_store_id, quantity, notes? } */
    public function transfer()
    {
        $payload = $this->request->getJSON(true) ?? [];

        $rules = [
            'product_id' => ['label' => 'Product', 'rules' => 'required|is_natural_no_zero'],
            'from_store_id' => ['label' => 'Source store', 'rules' => 'required|is_natural_no_zero'],
            'to_store_id' => ['label' => 'Destination store', 'rules' => 'required|is_natural_no_zero|differs[from_store_id]'],
            'quantity' => ['label' => 'Quantity', 'rules' => 'required|decimal|greater_than[0]'],
        ];

        if (! $this->validateData($payload, $rules)) {
            return $this->validationFail($this->validator->getErrors());
        }

        $product = model(ProductModel::class)->where('company_id', Services::authContext()->companyId)->find($payload['product_id']);
        if (! $product) {
            return $this->apiFail('Unknown product_id', 422);
        }

        $allowedStores = $this->allowedStoreIds();
        if (! in_array((int) $payload['from_store_id'], $allowedStores, true)) {
            return $this->apiFail('Unknown from_store_id', 422);
        }
        if (! in_array((int) $payload['to_store_id'], $allowedStores, true)) {
            return $this->apiFail('Unknown to_store_id', 422);
        }

        $inventoryModel = model(InventoryModel::class);
        $qty = (float) $payload['quantity'];
        if ($product->unit_id !== null) {
            $qty = model(UnitModel::class)->roundToPrecision((int) $product->unit_id, $qty);
        }

        $source = $inventoryModel->forProductAtStore((int) $payload['product_id'], (int) $payload['from_store_id']);
        $inventoryCalc = Services::inventoryCalculator();

        if (! $source || ! $inventoryCalc->hasSufficientStock((float) $source->quantity, $qty)) {
            $available = $source->quantity ?? 0;
            return $this->apiFail("Insufficient stock at source store: available {$available}, requested {$qty}", 422);
        }

        $db = \Config\Database::connect();
        $db->transStart();

        $sourceBalance = $inventoryCalc->applyDelta((float) $source->quantity, -$qty);
        $inventoryModel->update($source->id, ['quantity' => $sourceBalance]);

        model(InventoryTransactionModel::class)->insert([
            'inventory_id' => $source->id,
            'product_id' => $payload['product_id'],
            'store_id' => $payload['from_store_id'],
            'type' => InventoryTransactionModel::TYPE_TRANSFER_OUT,
            'quantity' => -$qty,
            'balance_after' => $sourceBalance,
            'reference_type' => 'transfer',
            'reference_id' => (int) $payload['to_store_id'],
            'user_id' => Services::authContext()->userId,
            'notes' => $payload['notes'] ?? 'Transfer out',
        ]);

        $destination = $inventoryModel->forProductAtStore((int) $payload['product_id'], (int) $payload['to_store_id']);

        if (! $destination) {
            $destinationId = $inventoryModel->insert([
                'product_id' => $payload['product_id'],
                'store_id' => $payload['to_store_id'],
                'quantity' => $qty,
                'reorder_level' => $product->minimum_stock ?? 0,
            ], true);
            $destinationBalance = $qty;
        } else {
            $destinationId = $destination->id;
            $destinationBalance = $inventoryCalc->applyDelta((float) $destination->quantity, $qty);
            $inventoryModel->update($destinationId, ['quantity' => $destinationBalance]);
        }

        model(InventoryTransactionModel::class)->insert([
            'inventory_id' => $destinationId,
            'product_id' => $payload['product_id'],
            'store_id' => $payload['to_store_id'],
            'type' => InventoryTransactionModel::TYPE_TRANSFER_IN,
            'quantity' => $qty,
            'balance_after' => $destinationBalance,
            'reference_type' => 'transfer',
            'reference_id' => (int) $payload['from_store_id'],
            'user_id' => Services::authContext()->userId,
            'notes' => $payload['notes'] ?? 'Transfer in',
        ]);

        $db->transComplete();

        return $this->ok([
            'source' => $inventoryModel->find($source->id),
            'destination' => $inventoryModel->find($destinationId),
        ], 'Stock transferred');
    }
}
