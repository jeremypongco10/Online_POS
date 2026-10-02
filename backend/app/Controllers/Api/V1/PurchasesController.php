<?php

namespace App\Controllers\Api\V1;

use App\Controllers\Api\BaseCrudController;
use App\Models\CompanyModel;
use App\Models\InventoryModel;
use App\Models\InventoryTransactionModel;
use App\Models\InvoiceSequenceModel;
use App\Models\ProductModel;
use App\Models\PurchaseOrderItemModel;
use App\Models\PurchaseOrderModel;
use App\Models\StoreModel;
use App\Models\SupplierModel;
use App\Models\UnitModel;
use App\Models\UserModel;
use CodeIgniter\HTTP\ResponseInterface;
use Config\Database;
use Config\Services;

/**
 * /api/v1/purchases — purchase orders and their line items.
 *
 * Purchase orders carry no tax: each line is quantity × unit cost, and
 * any `tax_rate_id` a client sends is ignored. The cost a buyer enters
 * is the cost they agreed with the supplier. The tax columns on the
 * tables stay (always 0 / null) so older orders still read correctly.
 *
 * Lifecycle: draft -[approve]-> approved -[receive]-> received
 * (or cancelled from draft/approved). Receiving is the only state
 * change that touches inventory, and it — like every other multi-step
 * write here — runs inside a single DB transaction. Only a draft can be
 * edited; once approved, the order is what the supplier was sent.
 */
class PurchasesController extends BaseCrudController
{
    protected string $modelClass = PurchaseOrderModel::class;
    // po_number is an exact match — what a scanned PO barcode looks the order up by.
    protected array $allowedFilters = ['company_id', 'store_id', 'supplier_id', 'status', 'po_number'];
    protected array $allowedSorts = ['id', 'po_number', 'order_date', 'expected_date', 'total', 'created_at'];
    protected array $searchableFields = ['po_number', 'notes'];
    protected string $defaultSort = '-created_at';
    protected ?string $storeColumn = 'store_id';

    /** Header fields a draft may change. Everything else is derived or set by a lifecycle action. */
    private const EDITABLE_FIELDS = ['store_id', 'supplier_id', 'order_date', 'expected_date', 'notes'];

    /**
     * List rows carry supplier_name, store_name and item_count so the
     * table never needs the full supplier/store catalogs just to label
     * one page of orders.
     */
    public function index()
    {
        $result = $this->listResource(
            $this->applyScope(),
            $this->allowedFilters,
            $this->allowedSorts,
            $this->searchableFields,
            $this->defaultSort
        );

        return $this->ok($this->withNames($result['data']), '', $result['meta']);
    }

    /**
     * GET /api/v1/purchases/{id} — the order plus everything its detail
     * view and printed copy show: supplier and ship-to store details, the
     * company letterhead, who prepared/approved it, and its line items.
     * One call, so the printed PO can never disagree with the screen.
     */
    public function show($id = null)
    {
        $po = $this->applyScope()->find($id);
        if (! $po) {
            return $this->notFound();
        }

        [$po] = $this->withNames([$po]);

        $supplier = model(SupplierModel::class)->find($po->supplier_id);
        $store = model(StoreModel::class)->find($po->store_id);
        $company = model(CompanyModel::class)->find($po->company_id);
        $userModel = model(UserModel::class);
        $creator = $po->user_id ? $userModel->find($po->user_id) : null;
        $approver = $po->approved_by ? $userModel->find($po->approved_by) : null;

        $po->supplier = $supplier ? [
            'id' => (int) $supplier->id,
            'name' => $supplier->name,
            'contact_name' => $supplier->contact_name,
            'email' => $supplier->email,
            'phone' => $supplier->phone,
            'address' => $supplier->address,
            'tax_id' => $supplier->tax_id,
        ] : null;
        $po->store = $store ? [
            'id' => (int) $store->id,
            'name' => $store->name,
            'code' => $store->code,
            'address' => $store->address,
            'phone' => $store->phone,
            'email' => $store->email,
        ] : null;
        $po->company = $company ? [
            'trade_name' => $company->trade_name,
            'legal_name' => $company->legal_name,
            'address' => $company->address,
            'phone' => $company->phone,
            'email' => $company->email,
            'tax_id' => $company->tax_id,
            'logo_path' => $company->logo_path,
        ] : null;
        $po->created_by_name = $creator->name ?? null;
        $po->approved_by_name = $approver->name ?? null;
        $po->items = $this->itemsFor((int) $po->id);

        return $this->ok($po);
    }

    /**
     * GET /api/v1/purchases/suppliers?q=
     * The PO form's supplier picker. Lives here, gated on purchases.view,
     * rather than reusing /suppliers (suppliers.view): a buyer who may
     * raise orders shouldn't also need the supplier admin screen just to
     * pick who they're ordering from. Active suppliers only.
     *
     * No q: the suppliers this caller's branches ordered from most
     * recently (flagged recent=true), topped up alphabetically so a new
     * company with no orders yet still sees something. With q: up to 10
     * matches on name, contact person, phone or email.
     */
    public function supplierOptions()
    {
        $companyId = Services::authContext()->companyId;
        $q = trim((string) $this->request->getGet('q'));
        $limit = 10;
        $columns = 'id, name, contact_name, phone, email';

        if ($q !== '') {
            $rows = model(SupplierModel::class)
                ->select($columns)
                ->where('company_id', $companyId)
                ->where('is_active', 1)
                ->groupStart()->like('name', $q)->orLike('contact_name', $q)->orLike('phone', $q)->orLike('email', $q)->groupEnd()
                ->orderBy('name')
                ->findAll($limit);

            return $this->ok($rows);
        }

        $recentIds = array_map(
            static fn ($r) => (int) $r->supplier_id,
            $this->applyScope()
                ->select('supplier_id, MAX(created_at) AS last_ordered_at')
                ->groupBy('supplier_id')
                ->orderBy('last_ordered_at', 'DESC')
                ->findAll(8)
        );

        $rows = [];
        if ($recentIds !== []) {
            $byId = [];
            foreach (model(SupplierModel::class)->select($columns)->where('company_id', $companyId)->where('is_active', 1)->whereIn('id', $recentIds)->findAll() as $s) {
                $byId[(int) $s->id] = $s;
            }
            foreach ($recentIds as $id) {
                if (isset($byId[$id])) {
                    $byId[$id]->recent = true;
                    $rows[] = $byId[$id];
                }
            }
        }

        if (count($rows) < $limit) {
            $fill = model(SupplierModel::class)->select($columns)->where('company_id', $companyId)->where('is_active', 1);
            if ($recentIds !== []) {
                $fill->whereNotIn('id', $recentIds);
            }
            foreach ($fill->orderBy('name')->findAll($limit - count($rows)) as $s) {
                $s->recent = false;
                $rows[] = $s;
            }
        }

        return $this->ok($rows);
    }

    /**
     * GET /api/v1/purchases/summary — order count and value per status,
     * within the caller's store scope, for the summary cards above the list.
     */
    public function summary()
    {
        $rows = $this->applyScope()
            ->select('status, COUNT(*) AS order_count, COALESCE(SUM(total), 0) AS total_value')
            ->groupBy('status')
            ->findAll();

        $summary = [];
        foreach ([PurchaseOrderModel::STATUS_DRAFT, PurchaseOrderModel::STATUS_APPROVED, PurchaseOrderModel::STATUS_RECEIVED, PurchaseOrderModel::STATUS_CANCELLED] as $status) {
            $summary[$status] = ['count' => 0, 'value' => '0.00'];
        }
        foreach ($rows as $row) {
            $summary[$row->status] = ['count' => (int) $row->order_count, 'value' => number_format((float) $row->total_value, 2, '.', '')];
        }

        return $this->ok($summary);
    }

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

        return $this->ok($this->itemsFor((int) $id));
    }

    /**
     * PUT /api/v1/purchases/{id} — drafts only. Accepts the editable
     * header fields and, optionally, a replacement "items" array (same
     * shape as create). Status only ever moves through approve()/
     * receive()/cancel(), never a raw field edit, so inventory and audit
     * rows can't fall out of sync.
     */
    public function update($id = null)
    {
        $po = $this->applyScope()->find($id);
        if (! $po) {
            return $this->notFound();
        }

        $payload = $this->payload();

        if (array_key_exists('status', $payload)) {
            return $this->apiFail('status cannot be set directly — use approve/receive/cancel', 422);
        }
        if ($po->status !== PurchaseOrderModel::STATUS_DRAFT) {
            return $this->apiFail("Only a draft purchase order can be edited (current status: {$po->status})", 422);
        }

        $items = $payload['items'] ?? null;
        $inclusive = (bool) ($payload['prices_include_tax'] ?? false);
        $header = array_intersect_key($payload, array_flip(self::EDITABLE_FIELDS));

        if ($error = $this->checkReferences($header)) {
            return $error;
        }

        $lines = null;
        if ($items !== null) {
            $lines = $this->buildLines($items, $inclusive);
            if ($lines instanceof ResponseInterface) {
                return $lines;
            }
            $header['subtotal'] = $lines['summary']['net_amount'];
            $header['tax_total'] = $lines['summary']['tax_amount'];
            $header['total'] = $lines['summary']['gross_amount'];
        }

        if ($header === []) {
            return $this->apiFail('Nothing to update', 422);
        }

        $db = Database::connect();
        $db->transStart();

        if (! $this->model->update($id, $header)) {
            $db->transComplete();

            return $this->validationFail($this->model->errors());
        }

        if ($lines !== null) {
            $itemModel = model(PurchaseOrderItemModel::class);
            $itemModel->where('purchase_order_id', $id)->delete();
            foreach ($lines['lines'] as $line) {
                $itemModel->insert(['purchase_order_id' => $id, ...$line]);
            }
        }

        $db->transComplete();

        if ($db->transStatus() === false) {
            return $this->apiFail('Failed to update purchase order', 500);
        }

        $after = $this->model->find($id);
        Services::auditLogger()->log('update', 'Purchase Order', (int) $id, $after->po_number, Services::auditLogger()->diff((array) $po, (array) $after));

        return $this->ok($after, 'Purchase order updated');
    }

    /**
     * POST /api/v1/purchases
     * body includes nested "items": [{product_id, quantity, unit_cost}].
     * Overrides the generic create() to persist the order + its items atomically.
     */
    public function create()
    {
        $payload = $this->payload();
        $items = $payload['items'] ?? [];
        $inclusive = (bool) ($payload['prices_include_tax'] ?? false);
        unset($payload['items'], $payload['prices_include_tax']);

        $auth = Services::authContext();
        $payload['company_id'] = $auth->companyId;

        if ($error = $this->checkReferences($payload)) {
            return $error;
        }

        $lines = $this->buildLines($items, $inclusive);
        if ($lines instanceof ResponseInterface) {
            return $lines;
        }

        $payload['subtotal'] = $lines['summary']['net_amount'];
        $payload['tax_total'] = $lines['summary']['tax_amount'];
        $payload['total'] = $lines['summary']['gross_amount'];
        $payload['status'] = PurchaseOrderModel::STATUS_DRAFT;
        $payload['order_date'] = ($payload['order_date'] ?? '') ?: date('Y-m-d');
        $payload['expected_date'] = ($payload['expected_date'] ?? '') ?: null;
        $payload['user_id'] = $auth->userId;

        $db = Database::connect();
        $db->transStart();

        if (empty($payload['po_number'])) {
            // The counter is kept per store, but PO numbers must be unique
            // across the whole company — so a second branch's first order
            // would otherwise come out as another "PO-000001". Advance past
            // any number another branch already used.
            $sequence = model(InvoiceSequenceModel::class);
            for ($attempt = 0; $attempt < 1000; $attempt++) {
                $candidate = $sequence->nextNumber((int) $payload['company_id'], (int) $payload['store_id'], 'purchase_order', 'PO-');
                $taken = $this->model->where('company_id', $payload['company_id'])->where('po_number', $candidate)->countAllResults();
                if ($taken === 0) {
                    $payload['po_number'] = $candidate;
                    break;
                }
            }
        }

        $poId = $this->model->insert($payload, true);

        if ($poId === false) {
            $db->transComplete();

            return $this->validationFail($this->model->errors());
        }

        $itemModel = model(PurchaseOrderItemModel::class);
        foreach ($lines['lines'] as $line) {
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

    /**
     * DELETE /api/v1/purchases/{id} — drafts only. Anything approved was
     * already sent to a supplier (cancel it instead), and a received order
     * is referenced by the inventory movements it created.
     */
    public function delete($id = null)
    {
        $po = $this->applyScope()->find($id);
        if (! $po) {
            return $this->notFound();
        }

        if ($po->status !== PurchaseOrderModel::STATUS_DRAFT) {
            return $this->apiFail('Only a draft purchase order can be deleted — cancel it instead', 422);
        }

        $db = Database::connect();
        $db->transStart();
        model(PurchaseOrderItemModel::class)->where('purchase_order_id', $id)->delete();
        $this->model->delete($id);
        $db->transComplete();

        if ($db->transStatus() === false) {
            return $this->apiFail('Failed to delete purchase order', 500);
        }

        Services::auditLogger()->log('delete', 'Purchase Order', (int) $id, $po->po_number, (array) $po);

        return $this->ok(null, 'Purchase order deleted');
    }

    /**
     * Validates and prices a set of line items. Returns ['lines' => rows
     * ready to insert, 'summary' => TaxService totals], or a 422 response.
     * Products must belong to the caller's company — a raw product_id from
     * another tenant is rejected rather than silently ordered.
     */
    private function buildLines($items, bool $inclusive)
    {
        if (! is_array($items) || $items === []) {
            return $this->apiFail('At least one line item is required', 422);
        }

        $companyId = Services::authContext()->companyId;
        $taxService = Services::taxService();
        $productModel = model(ProductModel::class);
        $unitModel = model(UnitModel::class);
        $productsById = [];
        $lineData = [];
        $taxResults = [];

        foreach ($items as $item) {
            $productId = (int) ($item['product_id'] ?? 0);
            $product = $productsById[$productId] ??= $productModel->find($productId);
            if (! $product || (int) $product->company_id !== (int) $companyId) {
                return $this->apiFail("Unknown product_id: {$productId}", 422);
            }

            $quantity = (float) ($item['quantity'] ?? 0);
            if ($product->unit_id !== null) {
                $quantity = $unitModel->roundToPrecision((int) $product->unit_id, $quantity);
            }
            if ($quantity <= 0) {
                return $this->apiFail("Quantity for {$product->name} must be greater than zero", 422);
            }

            $unitCost = (float) ($item['unit_cost'] ?? 0);
            if ($unitCost < 0) {
                return $this->apiFail("Unit cost for {$product->name} cannot be negative", 422);
            }

            $taxRate = null;
            $result = $taxService->calculateLine($quantity, $unitCost, 0.0, $taxRate, $inclusive);

            $taxResults[] = $result;
            $lineData[] = [
                'product_id' => $productId,
                'tax_rate_id' => $taxRate->id ?? null,
                'quantity' => $quantity,
                'unit_cost' => $unitCost,
                'tax_rate' => $result['rate'],
                'line_total' => $result['gross_amount'],
            ];
        }

        return ['lines' => $lineData, 'summary' => $taxService->summarize($taxResults)];
    }

    /** Store must be one the caller can access; supplier must be the caller's own company's. */
    private function checkReferences(array $payload): ?ResponseInterface
    {
        $auth = Services::authContext();

        if (! empty($payload['store_id'])) {
            $store = model(StoreModel::class)->find((int) $payload['store_id']);
            if (! $store || (int) $store->company_id !== (int) $auth->companyId || ! $auth->canAccessStore((int) $payload['store_id'])) {
                return $this->apiFail('You do not have access to this store', 403);
            }
        }

        if (! empty($payload['supplier_id'])) {
            $supplier = model(SupplierModel::class)->find((int) $payload['supplier_id']);
            if (! $supplier || (int) $supplier->company_id !== (int) $auth->companyId) {
                return $this->validationFail(['supplier_id' => 'Pick one of your own suppliers']);
            }
        }

        return null;
    }

    /** Line items with product name, SKU and unit abbreviation resolved. */
    private function itemsFor(int $poId): array
    {
        $items = model(PurchaseOrderItemModel::class)->where('purchase_order_id', $poId)->orderBy('id')->findAll();

        $productIds = array_values(array_unique(array_map(static fn ($i) => (int) $i->product_id, $items)));
        $productsById = [];
        $unitsById = [];
        if ($productIds !== []) {
            foreach (model(ProductModel::class)->whereIn('id', $productIds)->findAll() as $product) {
                $productsById[(int) $product->id] = $product;
            }
            $unitIds = array_values(array_filter(array_unique(array_map(static fn ($p) => (int) $p->unit_id, $productsById))));
            if ($unitIds !== []) {
                foreach (model(UnitModel::class)->whereIn('id', $unitIds)->findAll() as $unit) {
                    $unitsById[(int) $unit->id] = $unit;
                }
            }
        }

        foreach ($items as $item) {
            $product = $productsById[(int) $item->product_id] ?? null;
            $unit = $product && $product->unit_id ? ($unitsById[(int) $product->unit_id] ?? null) : null;
            $item->product_name = $product->name ?? null;
            $item->product_sku = $product->sku ?? null;
            $item->unit_abbreviation = $unit->abbreviation ?? null;
        }

        return $items;
    }

    /** Adds supplier_name, store_name, item_count and total_quantity to each order row. */
    private function withNames(array $rows): array
    {
        if ($rows === []) {
            return $rows;
        }

        $supplierIds = array_values(array_unique(array_map(static fn ($r) => (int) $r->supplier_id, $rows)));
        $storeIds = array_values(array_unique(array_map(static fn ($r) => (int) $r->store_id, $rows)));
        $poIds = array_map(static fn ($r) => (int) $r->id, $rows);

        $suppliers = [];
        foreach (model(SupplierModel::class)->whereIn('id', $supplierIds)->findAll() as $s) {
            $suppliers[(int) $s->id] = $s->name;
        }
        $stores = [];
        foreach (model(StoreModel::class)->whereIn('id', $storeIds)->findAll() as $s) {
            $stores[(int) $s->id] = $s->name;
        }
        $counts = [];
        $quantities = [];
        $countRows = model(PurchaseOrderItemModel::class)
            ->select('purchase_order_id, COUNT(*) AS item_count, COALESCE(SUM(quantity), 0) AS total_quantity')
            ->whereIn('purchase_order_id', $poIds)
            ->groupBy('purchase_order_id')
            ->findAll();
        foreach ($countRows as $c) {
            $counts[(int) $c->purchase_order_id] = (int) $c->item_count;
            $quantities[(int) $c->purchase_order_id] = (string) $c->total_quantity;
        }

        foreach ($rows as $row) {
            $row->supplier_name = $suppliers[(int) $row->supplier_id] ?? null;
            $row->store_name = $stores[(int) $row->store_id] ?? null;
            $row->item_count = $counts[(int) $row->id] ?? 0;
            $row->total_quantity = $quantities[(int) $row->id] ?? '0';
        }

        return $rows;
    }
}
