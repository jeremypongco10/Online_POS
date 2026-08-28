<?php

namespace App\Controllers\Api\V1;

use App\Controllers\Api\BaseCrudController;
use App\Models\InventoryModel;
use App\Models\InventoryTransactionModel;
use App\Models\InvoiceSequenceModel;
use App\Models\ProductModel;
use App\Models\PurchaseOrderItemModel;
use App\Models\PurchaseOrderModel;
use App\Models\UnitModel;
use Config\Database;
use Config\Services;

/**
 * /api/v1/purchases — purchase orders and their line items.
 *
 * Line items accept `tax_rate_id` (resolved through TaxRateModel, same
 * as sales) rather than a raw percentage, so tax math is never
 * duplicated or hard-coded — see App\Libraries\TaxService.
 *
 * Lifecycle: draft -[approve]-> approved -[receive]-> received
 * (or cancelled from draft/approved). Receiving is the only state
 * change that touches inventory, and it — like every other multi-step
 * write here — runs inside a single DB transaction.
 */
class PurchasesController extends BaseCrudController
{
    protected string $modelClass = PurchaseOrderModel::class;
    protected array $allowedFilters = ['company_id', 'store_id', 'supplier_id', 'status'];
    protected array $allowedSorts = ['id', 'po_number', 'order_date', 'total', 'created_at'];
    protected array $searchableFields = ['po_number', 'notes'];
    protected string $defaultSort = '-created_at';
    protected ?string $storeColumn = 'store_id';

    /**
     * GET /api/v1/purchases/{id}/items
     * Each item comes back with product_name/product_sku already resolved
     * so the PO detail view never needs its own full-catalog fetch just
     * to label a handful of line items.
     */
    public function items($id = null)
    {
        if (! $this->applyScope()->find($id)) {
            return $this->notFound();
        }

        $items = model(PurchaseOrderItemModel::class)->where('purchase_order_id', $id)->findAll();

        $productIds = array_values(array_unique(array_map(static fn ($i) => (int) $i->product_id, $items)));
        $productsById = [];
        if ($productIds !== []) {
            foreach (model(ProductModel::class)->whereIn('id', $productIds)->findAll() as $product) {
                $productsById[(int) $product->id] = $product;
            }
        }

        foreach ($items as $item) {
            $product = $productsById[(int) $item->product_id] ?? null;
            $item->product_name = $product->name ?? null;
            $item->product_sku = $product->sku ?? null;
        }

        return $this->ok($items);
    }

    /**
     * Status only ever moves through approve()/receive()/cancel() — never
     * a raw field edit — so the generic update() can't be used to jump
     * straight to "received" and leave inventory/audit rows out of sync.
     */
    public function update($id = null)
    {
        $payload = $this->payload();

        if (array_key_exists('status', $payload)) {
            return $this->apiFail('status cannot be set directly — use approve/receive/cancel', 422);
        }

        return parent::update($id);
    }

    /**
     * POST /api/v1/purchases
     * body includes nested "items": [{product_id, quantity, unit_cost, tax_rate_id?}]
     * and optional "prices_include_tax": bool (default false).
     * Overrides the generic create() to persist the order + its items atomically.
     */
    public function create()
    {
        $payload = $this->payload();
        $items = $payload['items'] ?? [];
        $inclusive = (bool) ($payload['prices_include_tax'] ?? false);
        unset($payload['items'], $payload['prices_include_tax']);

        if (! is_array($items) || $items === []) {
            return $this->apiFail('At least one line item is required', 422);
        }

        $auth = Services::authContext();
        $payload['company_id'] = $auth->companyId;
        if (! empty($payload['store_id']) && ! $auth->canAccessStore((int) $payload['store_id'])) {
            return $this->apiFail('You do not have access to this store', 403);
        }

        $taxService = Services::taxService();
        $productModel = model(ProductModel::class);
        $unitModel = model(UnitModel::class);
        $productsById = [];
        $lineData = [];
        $taxResults = [];

        foreach ($items as $item) {
            $product = $productsById[$item['product_id']] ??= $productModel->find($item['product_id']);
            if (! $product) {
                return $this->apiFail("Unknown product_id: {$item['product_id']}", 422);
            }

            $quantity = (float) $item['quantity'];
            if ($product->unit_id !== null) {
                $quantity = $unitModel->roundToPrecision((int) $product->unit_id, $quantity);
            }
            $unitCost = (float) $item['unit_cost'];

            $taxRate = $taxService->resolveRate($item['tax_rate_id'] ?? null);
            $result = $taxService->calculateLine($quantity, $unitCost, 0.0, $taxRate, $inclusive);

            $taxResults[] = $result;
            $lineData[] = [
                'product_id' => $item['product_id'],
                'tax_rate_id' => $taxRate->id ?? null,
                'quantity' => $quantity,
                'unit_cost' => $unitCost,
                'tax_rate' => $result['rate'],
                'line_total' => $result['gross_amount'],
            ];
        }

        $summary = $taxService->summarize($taxResults);
        $payload['subtotal'] = $summary['net_amount'];
        $payload['tax_total'] = $summary['tax_amount'];
        $payload['total'] = $summary['gross_amount'];
        $payload['status'] = PurchaseOrderModel::STATUS_DRAFT;
        $payload['order_date'] ??= date('Y-m-d');
        $payload['user_id'] ??= Services::authContext()->userId;

        $db = Database::connect();
        $db->transStart();

        if (empty($payload['po_number'])) {
            $payload['po_number'] = model(InvoiceSequenceModel::class)->nextNumber(
                (int) $payload['company_id'],
                (int) $payload['store_id'],
                'purchase_order',
                'PO-'
            );
        }

        $poId = $this->model->insert($payload, true);

        if ($poId === false) {
            $db->transComplete();

            return $this->validationFail($this->model->errors());
        }

        $itemModel = model(PurchaseOrderItemModel::class);
        foreach ($lineData as $line) {
            $itemModel->insert(['purchase_order_id' => $poId, ...$line]);
        }

        $db->transComplete();

        if ($db->transStatus() === false) {
            return $this->apiFail('Failed to create purchase order', 500);
        }

        $po = $this->model->find($poId);
        Services::auditLogger()->log('create', 'Purchase Order', $poId, $po->po_number, (array) $po);

        return $this->created($po);
    }

    /** POST /api/v1/purchases/{id}/approve — draft only. Required before a PO can be received. */
    public function approve($id = null)
    {
        $po = $this->applyScope()->find($id);

        if (! $po) {
            return $this->notFound();
        }

        if ($po->status !== PurchaseOrderModel::STATUS_DRAFT) {
            return $this->apiFail("Only a draft purchase order can be approved (current status: {$po->status})", 422);
        }

        $db = Database::connect();
        $db->transStart();

        $this->model->update($id, [
            'status' => PurchaseOrderModel::STATUS_APPROVED,
            'approved_by' => Services::authContext()->userId,
            'approved_at' => date('Y-m-d H:i:s'),
        ]);

        $db->transComplete();

        Services::auditLogger()->log('approve', 'Purchase Order', (int) $id, $po->po_number, [
            'status' => ['old' => $po->status, 'new' => PurchaseOrderModel::STATUS_APPROVED],
        ]);

        return $this->ok($this->model->find($id), 'Purchase order approved');
    }

    /** POST /api/v1/purchases/{id}/cancel — draft or approved only; a received PO can't be cancelled. */
    public function cancel($id = null)
    {
        $po = $this->applyScope()->find($id);

        if (! $po) {
            return $this->notFound();
        }

        if (! in_array($po->status, [PurchaseOrderModel::STATUS_DRAFT, PurchaseOrderModel::STATUS_APPROVED], true)) {
            return $this->apiFail("Cannot cancel a purchase order with status: {$po->status}", 422);
        }

        $this->model->update($id, ['status' => PurchaseOrderModel::STATUS_CANCELLED]);

        Services::auditLogger()->log('cancel', 'Purchase Order', (int) $id, $po->po_number, [
            'status' => ['old' => $po->status, 'new' => PurchaseOrderModel::STATUS_CANCELLED],
        ]);

        return $this->ok($this->model->find($id), 'Purchase order cancelled');
    }

    /**
     * POST /api/v1/purchases/{id}/receive
     * Approved only — enforces Create -> Approve -> Receive. Marks the
     * PO received and, in the same DB transaction, updates inventory
     * and writes the paired inventory_transactions audit rows.
     */
    public function receive($id = null)
    {
        $po = $this->applyScope()->find($id);

        if (! $po) {
            return $this->notFound();
        }

        if ($po->status !== PurchaseOrderModel::STATUS_APPROVED) {
            return $this->apiFail("Only an approved purchase order can be received (current status: {$po->status})", 422);
        }

        $itemModel = model(PurchaseOrderItemModel::class);
        $inventoryModel = model(InventoryModel::class);
        $transactionModel = model(InventoryTransactionModel::class);
        $userId = Services::authContext()->userId;

        $items = $itemModel->where('purchase_order_id', $id)->findAll();

        $db = Database::connect();
        $db->transStart();

        $productModel = model(ProductModel::class);

        foreach ($items as $item) {
            $inventory = $inventoryModel->forProductAtStore((int) $item->product_id, (int) $po->store_id);
            $qty = (float) $item->quantity;

            if (! $inventory) {
                $product = $productModel->find($item->product_id);
                $inventoryId = $inventoryModel->insert([
                    'product_id' => $item->product_id,
                    'store_id' => $po->store_id,
                    'quantity' => $qty,
                    'reorder_level' => $product->minimum_stock ?? 0,
                ], true);
                $balance = $qty;
            } else {
                $inventoryId = $inventory->id;
                $balance = Services::inventoryCalculator()->applyDelta((float) $inventory->quantity, $qty);
                $inventoryModel->update($inventoryId, ['quantity' => $balance]);
            }

            $transactionModel->insert([
                'inventory_id' => $inventoryId,
                'product_id' => $item->product_id,
                'store_id' => $po->store_id,
                'type' => InventoryTransactionModel::TYPE_PURCHASE,
                'quantity' => $qty,
                'balance_after' => $balance,
                'reference_type' => 'purchase_order',
                'reference_id' => $po->id,
                'user_id' => $userId,
            ]);

            $itemModel->update($item->id, ['received_quantity' => $qty]);
        }

        $this->model->update($id, [
            'status' => PurchaseOrderModel::STATUS_RECEIVED,
            'received_date' => date('Y-m-d'),
        ]);

        $db->transComplete();

        Services::auditLogger()->log('receive', 'Purchase Order', (int) $id, $po->po_number, [
            'status' => ['old' => $po->status, 'new' => PurchaseOrderModel::STATUS_RECEIVED],
        ]);

        return $this->ok($this->model->find($id), 'Purchase order received into inventory');
    }
}
