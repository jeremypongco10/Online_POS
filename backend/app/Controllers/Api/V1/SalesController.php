<?php

namespace App\Controllers\Api\V1;

use App\Controllers\Api\BaseCrudController;
use App\Models\CompanyModel;
use App\Models\CustomerModel;
use App\Models\InventoryModel;
use App\Models\InventoryTransactionModel;
use App\Models\InvoiceSequenceModel;
use App\Models\LoyaltyCardModel;
use App\Models\LoyaltyPointTransactionModel;
use App\Models\PaymentMethodModel;
use App\Models\PaymentModel;
use App\Models\ProductModel;
use App\Models\SaleItemModel;
use App\Models\SaleModel;
use App\Models\StoreModel;
use App\Models\UnitModel;
use App\Models\UserModel;
use App\Models\UserStoreModel;
use Config\Database;
use Config\Services;

/**
 * /api/v1/sales — ringing up sales, voiding, and reading sale history.
 * Refunds are handled by /api/v1/returns, which references a sale.
 */
class SalesController extends BaseCrudController
{
    protected string $modelClass = SaleModel::class;
    protected array $allowedFilters = ['company_id', 'store_id', 'register_id', 'customer_id', 'status', 'cash_session_id'];
    protected array $allowedSorts = ['id', 'invoice_number', 'sale_date', 'total', 'created_at'];
    protected array $searchableFields = ['invoice_number', 'notes'];
    protected string $defaultSort = '-sale_date';
    protected ?string $storeColumn = 'store_id';

    /** GET /api/v1/sales/{id}/items */
    public function items($id = null)
    {
        if (! $this->applyScope()->find($id)) {
            return $this->notFound();
        }

        return $this->ok(model(SaleItemModel::class)->where('sale_id', $id)->findAll());
    }

    /**
     * GET /api/v1/sales/{id}/receipt
     *
     * Phase 18: the full invoice/receipt. Built entirely from the
     * snapshot fields captured on `sales`/`sale_items` at the moment of
     * sale — never from a live join to companies/stores/products/
     * customers/tax_rates, so this looks identical today, next year, or
     * after those records are renamed, re-priced, or deleted.
     */
    public function receipt($id = null)
    {
        $sale = $this->applyScope()->find($id);

        if (! $sale) {
            return $this->notFound();
        }

        $items = model(SaleItemModel::class)->where('sale_id', $id)->findAll();
        $payments = model(PaymentModel::class)->where('sale_id', $id)->findAll();

        $vatAmount = 0.0;
        $vatExemptAmount = 0.0;
        $zeroRatedAmount = 0.0;
        $nonVatAmount = 0.0;

        foreach ($items as $item) {
            $net = (float) $item->line_total - (float) $item->tax_amount;
            switch ($item->tax_type) {
                case 'vat':
                    $vatAmount += (float) $item->tax_amount;
                    break;
                case 'vat_exempt':
                    $vatExemptAmount += $net;
                    break;
                case 'zero_rated':
                    $zeroRatedAmount += $net;
                    break;
                default:
                    $nonVatAmount += $net;
            }
        }

        return $this->ok([
            'company' => [
                'name' => $sale->company_name,
                'tin' => $sale->company_tin,
            ],
            'store' => [
                'name' => $sale->store_name,
                'address' => $sale->store_address,
            ],
            'invoice_number' => $sale->invoice_number,
            'date' => $sale->sale_date,
            'cashier' => $sale->cashier_name,
            'bagger' => $sale->bagger_name,
            'customer' => $sale->customer_name,
            'loyalty_card_number' => $sale->loyalty_card_number,
            'items' => array_map(static fn ($item) => [
                'name' => $item->product_name,
                'sku' => $item->product_sku,
                'quantity' => $item->quantity,
                'unit_price' => $item->unit_price,
                'discount' => $item->discount,
                'tax_amount' => $item->tax_amount,
                'line_total' => $item->line_total,
            ], $items),
            'subtotal' => $sale->subtotal,
            'discount_total' => $sale->discount_total,
            'vat_amount' => round($vatAmount, 2),
            'vat_exempt_amount' => round($vatExemptAmount, 2),
            'zero_rated_amount' => round($zeroRatedAmount, 2),
            'non_vat_amount' => round($nonVatAmount, 2),
            'total' => $sale->total,
            'payments' => array_map(static fn ($p) => [
                'method' => $p->method,
                'amount' => $p->amount,
                'reference' => $p->reference,
            ], $payments),
            'amount_paid' => $sale->amount_paid,
            'change_due' => $sale->change_due,
            'status' => $sale->status,
        ]);
    }

    /**
     * POST /api/v1/sales
     * body: {
     *   company_id, store_id, register_id, cash_session_id?, customer_id?,
     *   bagger_id?, loyalty_card_id?,
     *   prices_include_tax?: bool (default false — see TaxService),
     *   items: [{ product_id, quantity, unit_price, discount?, tax_rate_id? }],
     *   payments: [{ method, amount, reference? }]
     * }
     *
     * Phase 15 checkout flow, in order:
     *   Cart -> Validate products -> Validate stock -> Calculate subtotal ->
     *   Apply discount -> Calculate tax -> Calculate total -> Validate
     *   payment -> Create sale -> Create sale items -> Create payments ->
     *   Update inventory -> Create inventory transactions -> Generate
     *   invoice number -> COMMIT.
     *
     * The one deliberate reordering: the invoice number is generated
     * just before the sale row is created rather than at the very end,
     * because `sales.invoice_number` is NOT NULL — the row can't exist
     * without it. Everything from "Create sale" through "COMMIT" happens
     * inside a single DB transaction; every write's return value is
     * checked and any failure rolls the whole thing back, so a sale
     * that "succeeds" can never be missing its items, its payments, or
     * an inventory movement.
     */
    public function create()
    {
        $payload = $this->payload();
        $items = $payload['items'] ?? [];
        $payments = $payload['payments'] ?? [];
        $inclusive = (bool) ($payload['prices_include_tax'] ?? false);
        unset($payload['items'], $payload['payments'], $payload['prices_include_tax']);

        if (! is_array($items) || $items === []) {
            return $this->apiFail('At least one line item is required', 422);
        }

        foreach (['company_id', 'store_id', 'register_id'] as $required) {
            if (empty($payload[$required])) {
                return $this->apiFail("{$required} is required", 422);
            }
        }

        // The owning tenant is always the caller's own company, never
        // trusted from the request body. A store-restricted user also
        // can't ring up a sale at a store outside their assignment.
        $auth = Services::authContext();
        $payload['company_id'] = $auth->companyId;
        if (! $auth->canAccessStore((int) $payload['store_id'])) {
            return $this->apiFail('You do not have access to this store', 403);
        }

        /**
         * Bagger is optional (Phase 14) — "No Bagger" is a valid choice —
         * but when a bagger_id is submitted it must survive every check:
         * exists, active, holds the Bagger role, and is assigned to the
         * sale's own store. Any failure here is a hard 422, never a
         * silent drop of the field.
         */
        if (! empty($payload['bagger_id'])) {
            $bagger = model(UserModel::class)->find((int) $payload['bagger_id']);

            if (! $bagger) {
                return $this->apiFail('bagger_id does not exist', 422);
            }
            if (! (bool) $bagger->is_active) {
                return $this->apiFail('Selected bagger is not active', 422);
            }
            if (! model(UserStoreModel::class)->isEligibleBagger((int) $payload['bagger_id'], (int) $payload['store_id'])) {
                return $this->apiFail('Selected bagger does not have the Bagger role at this store', 422);
            }
        } else {
            $payload['bagger_id'] = null;
        }

        /**
         * Loyalty card is likewise optional. When present it must exist,
         * be usable (active, not expired), and — if a customer is also
         * attached — belong to that customer, so the receipt's loyalty
         * line can never point at a card unrelated to the sale.
         */
        $loyaltyCard = null;
        if (! empty($payload['loyalty_card_id'])) {
            $loyaltyCardModel = model(LoyaltyCardModel::class);
            $loyaltyCard = $loyaltyCardModel->find((int) $payload['loyalty_card_id']);

            if (! $loyaltyCard) {
                return $this->apiFail('loyalty_card_id does not exist', 422);
            }
            if (! $loyaltyCardModel->isUsable($loyaltyCard)) {
                return $this->apiFail('Selected loyalty card is not usable (status: ' . $loyaltyCard->status . ')', 422);
            }
            if (! empty($payload['customer_id']) && (int) $loyaltyCard->customer_id !== (int) $payload['customer_id']) {
                return $this->apiFail('loyalty_card_id does not belong to the attached customer', 422);
            }
        } else {
            $payload['loyalty_card_id'] = null;
        }

        $taxService = Services::taxService();
        $paymentService = Services::paymentService();
        $inventoryCalc = Services::inventoryCalculator();
        $productModel = model(ProductModel::class);
        $unitModel = model(UnitModel::class);
        $inventoryModel = model(InventoryModel::class);
        $discountTotal = 0.0;
        $lineData = [];
        $taxResults = [];
        $requiredQtyByProduct = [];

        // Fetch every distinct product referenced by the cart in one
        // query rather than one find() per line — a cart with many
        // distinct items would otherwise be N round trips here.
        $distinctProductIds = array_unique(array_column($items, 'product_id'));
        $productsById = $distinctProductIds === []
            ? []
            : array_column($productModel->whereIn('id', $distinctProductIds)->findAll(), null, 'id');

        // --- Validate products, roll up required quantity per product ---
        foreach ($items as $item) {
            // A custom (non-catalog) line item: no product_id, just a
            // cashier-typed name + price. No stock check, no is_active
            // lookup — there's no product to check either against.
            if (empty($item['product_id'])) {
                $name = trim((string) ($item['name'] ?? ''));
                if ($name === '') {
                    return $this->apiFail('name is required for a custom item with no product_id', 422);
                }

                $quantity = (float) ($item['quantity'] ?? 0);
                if ($quantity <= 0) {
                    return $this->apiFail("Quantity must be greater than zero for custom item: {$name}", 422);
                }

                $unitPrice = (float) ($item['unit_price'] ?? 0);
                if ($unitPrice <= 0) {
                    return $this->apiFail("unit_price must be greater than zero for custom item: {$name}", 422);
                }

                $discount = (float) ($item['discount'] ?? 0);
                if (! $taxService->isValidDiscount($quantity, $unitPrice, $discount)) {
                    return $this->apiFail("Discount must be between 0 and the line subtotal for custom item: {$name}", 422);
                }

                $taxRate = $taxService->resolveRate($item['tax_rate_id'] ?? null);
                $result = $taxService->calculateLine($quantity, $unitPrice, $discount, $taxRate, $inclusive);

                $discountTotal += $discount;
                $taxResults[] = $result;
                $lineData[] = [
                    'product_id' => null,
                    // Custom items have no catalog row to snapshot a
                    // name/SKU from — the typed name IS the snapshot.
                    'product_name' => $name,
                    'product_sku' => null,
                    'tax_rate_id' => $taxRate->id ?? null,
                    'tax_type' => $result['tax_type'],
                    'quantity' => $quantity,
                    'unit_price' => $unitPrice,
                    'discount' => $discount,
                    'tax_rate' => $result['rate'],
                    'tax_amount' => $result['tax_amount'],
                    'line_total' => $result['gross_amount'],
                ];
                continue;
            }

            $product = $productsById[$item['product_id']] ?? null;
            if (! $product) {
                return $this->apiFail("Unknown product_id: {$item['product_id']}", 422);
            }
            if (! (bool) $product->is_active) {
                return $this->apiFail("Product is not active: {$product->name}", 422);
            }

            $quantity = (float) $item['quantity'];
            if ($product->unit_id !== null) {
                // Enforce the unit's own precision — e.g. a KG line can carry
                // 0.250, but a PCS line gets rounded to a whole number.
                $quantity = $unitModel->roundToPrecision((int) $product->unit_id, $quantity);
            }
            if ($quantity <= 0) {
                return $this->apiFail("Quantity must be greater than zero for product: {$product->name}", 422);
            }

            $requiredQtyByProduct[$item['product_id']] = ($requiredQtyByProduct[$item['product_id']] ?? 0) + $quantity;

            $unitPrice = (float) $item['unit_price'];
            $discount = (float) ($item['discount'] ?? 0);

            if (! $taxService->isValidDiscount($quantity, $unitPrice, $discount)) {
                return $this->apiFail("Discount must be between 0 and the line subtotal for product: {$product->name}", 422);
            }

            $taxRate = $taxService->resolveRate($item['tax_rate_id'] ?? null);
            $result = $taxService->calculateLine($quantity, $unitPrice, $discount, $taxRate, $inclusive);

            $discountTotal += $discount;
            $taxResults[] = $result;

            $lineData[] = [
                'product_id' => $item['product_id'],
                // Snapshot the name/SKU as they are right now — a later
                // rename must not change what this receipt says was sold.
                'product_name' => $product->name,
                'product_sku' => $product->sku,
                'tax_rate_id' => $taxRate->id ?? null,
                'tax_type' => $result['tax_type'],
                'quantity' => $quantity,
                'unit_price' => $unitPrice,
                'discount' => $discount,
                'tax_rate' => $result['rate'],
                'tax_amount' => $result['tax_amount'],
                'line_total' => $result['gross_amount'],
            ];
        }

        // --- Validate stock: every tracked product must have enough on hand
        // at this store for the cumulative quantity requested (a product
        // appearing on two lines needs both added together checked at once) ---
        // One query for every distinct product's inventory row at this
        // store, rather than one forProductAtStore() call per product.
        $trackedProductIds = array_values(array_filter(
            array_keys($requiredQtyByProduct),
            static fn ($id) => (bool) $productsById[$id]->track_inventory
        ));
        $inventoryByProduct = $trackedProductIds === []
            ? []
            : array_column(
                $inventoryModel->whereIn('product_id', $trackedProductIds)->where('store_id', (int) $payload['store_id'])->findAll(),
                null,
                'product_id'
            );

        foreach ($requiredQtyByProduct as $productId => $requiredQty) {
            $product = $productsById[$productId];
            if (! (bool) $product->track_inventory) {
                continue;
            }

            $inventory = $inventoryByProduct[$productId] ?? null;
            $available = $inventory ? (float) $inventory->quantity : 0.0;

            if (! $inventoryCalc->hasSufficientStock($available, $requiredQty)) {
                return $this->apiFail(
                    "Insufficient stock for {$product->name}: available {$available}, requested {$requiredQty}",
                    422
                );
            }
        }

        // --- Calculate subtotal / apply discount / calculate tax / calculate total ---
        $summary = $taxService->summarize($taxResults);
        $subtotal = $summary['net_amount'];
        $taxTotal = $summary['tax_amount'];
        $total = $summary['gross_amount'];

        // --- Validate payment: at least one payment, valid methods, and
        // the amount tendered must cover the total — never a sale created
        // for less than what's owed. ---
        if (! is_array($payments) || $payments === []) {
            return $this->apiFail('At least one payment is required', 422);
        }

        $activeMethodCodes = model(PaymentMethodModel::class)
            ->where('company_id', $payload['company_id'])
            ->where('is_active', 1)
            ->findColumn('code') ?: [];

        foreach ($payments as $payment) {
            if (! in_array($payment['method'] ?? null, $activeMethodCodes, true)) {
                return $this->apiFail('Invalid payment method: ' . ($payment['method'] ?? '(none)'), 422);
            }
            if (! is_numeric($payment['amount'] ?? null) || (float) $payment['amount'] <= 0) {
                return $this->apiFail('Each payment amount must be a positive number', 422);
            }
        }

        $amountPaid = $paymentService->totalTendered($payments);

        if (! $paymentService->isSufficient($total, $amountPaid)) {
            return $this->apiFail("Insufficient payment: total is {$total}, tendered {$amountPaid}", 422);
        }

        // --- Snapshot everything the receipt (Phase 18) will show, as of
        // right now — a later rename of the company/store/customer, or a
        // cashier's display name changing, must never alter this invoice. ---
        $cashierId = (int) ($payload['user_id'] ?? Services::authContext()->userId);
        $company = model(CompanyModel::class)->find((int) $payload['company_id']);
        $store = model(StoreModel::class)->find((int) $payload['store_id']);
        $cashier = model(UserModel::class)->find($cashierId);
        $customerName = ! empty($payload['customer_id'])
            ? (model(CustomerModel::class)->find((int) $payload['customer_id'])->name ?? null)
            : null;

        $db = Database::connect();
        $db->transStart();

        // --- Generate invoice number (see class-level note on ordering) ---
        $invoiceNumber = model(InvoiceSequenceModel::class)->nextNumber(
            (int) $payload['company_id'],
            (int) $payload['store_id'],
            'sale',
            'INV-'
        );

        // --- Create sale ---
        $saleId = $this->model->insert([
            ...$payload,
            'invoice_number' => $invoiceNumber,
            'status' => 'completed',
            'sale_date' => date('Y-m-d H:i:s'),
            'subtotal' => $subtotal,
            'discount_total' => $discountTotal,
            'tax_total' => $taxTotal,
            'total' => $total,
            'amount_paid' => $amountPaid,
            'change_due' => $paymentService->changeDue($total, $amountPaid),
            'user_id' => $cashierId,
            'company_name' => $company->trade_name ?? null,
            'company_tin' => $company->tax_id ?? null,
            'store_name' => $store->name ?? null,
            'store_address' => $store->address ?? null,
            'cashier_name' => $cashier->name ?? null,
            'bagger_name' => $bagger->name ?? null,
            'customer_name' => $customerName,
            'loyalty_card_number' => $loyaltyCard->card_number ?? null,
        ], true);

        if ($saleId === false) {
            $db->transRollback();

            return $this->validationFail($this->model->errors());
        }

        // --- Create sale items, update inventory, create inventory transactions ---
        $saleItemModel = model(SaleItemModel::class);
        $transactionModel = model(InventoryTransactionModel::class);

        foreach ($lineData as $line) {
            if ($saleItemModel->insert(['sale_id' => $saleId, ...$line]) === false) {
                $db->transRollback();

                return $this->validationFail($saleItemModel->errors());
            }

            // A custom item's line['product_id'] is null — nothing to look
            // up, and correctly nothing to track inventory for either.
            $product = $line['product_id'] !== null ? ($productsById[$line['product_id']] ?? null) : null;
            if ($product && (bool) $product->track_inventory) {
                $inventory = $inventoryModel->forProductAtStore((int) $line['product_id'], (int) $payload['store_id']);
                $balance = $inventoryCalc->applyDelta((float) ($inventory->quantity ?? 0), -$line['quantity']);
                $inventoryId = $inventory
                    ? $inventory->id
                    : $inventoryModel->insert([
                        'product_id' => $line['product_id'],
                        'store_id' => $payload['store_id'],
                        'quantity' => 0,
                        'reorder_level' => $product->minimum_stock ?? 0,
                    ], true);

                $inventoryModel->update($inventoryId, ['quantity' => $balance]);

                $transactionModel->insert([
                    'inventory_id' => $inventoryId,
                    'product_id' => $line['product_id'],
                    'store_id' => $payload['store_id'],
                    'type' => InventoryTransactionModel::TYPE_SALE,
                    'quantity' => -$line['quantity'],
                    'balance_after' => $balance,
                    'reference_type' => 'sale',
                    'reference_id' => $saleId,
                    'user_id' => Services::authContext()->userId,
                ]);
            }
        }

        // --- Create payments ---
        $paymentModel = model(PaymentModel::class);
        foreach ($payments as $payment) {
            $paymentId = $paymentModel->insert([
                'sale_id' => $saleId,
                'method' => $payment['method'],
                'amount' => $payment['amount'],
                'reference' => $payment['reference'] ?? null,
                'paid_at' => date('Y-m-d H:i:s'),
            ], true);

            if ($paymentId === false) {
                $db->transRollback();

                return $this->validationFail($paymentModel->errors());
            }
        }

        // --- Award loyalty points (flat company-wide rate, v1 — see the
        // migration adding loyalty_points_per_100 to companies). Needs a
        // customer attached (points belong to a customer's card, not the
        // sale) and a nonzero rate; floor() so a sale under the rate's
        // threshold earns 0 rather than being rounded up into free points. ---
        if (! empty($payload['customer_id']) && $company && (int) $company->loyalty_points_per_100 > 0) {
            $pointsEarned = (int) floor($total * $company->loyalty_points_per_100 / 100);

            if ($pointsEarned > 0) {
                $card = model(LoyaltyCardModel::class)->firstOrCreateForCustomer((int) $payload['customer_id']);
                model(LoyaltyPointTransactionModel::class)->record(
                    (int) $payload['customer_id'],
                    (int) $card->id,
                    $pointsEarned,
                    "Earned from sale {$invoiceNumber}",
                    null
                );
            }
        }

        // --- COMMIT ---
        $db->transComplete();

        if ($db->transStatus() === false) {
            return $this->apiFail('Failed to complete sale', 500);
        }

        $sale = $this->model->find($saleId);
        Services::auditLogger()->log('create', 'Sale', $saleId, $sale->invoice_number, (array) $sale);

        return $this->created($sale);
    }

    /** POST /api/v1/sales/{id}/void  body: { reason? } */
    public function void($id = null)
    {
        $sale = $this->applyScope()->find($id);

        if (! $sale) {
            return $this->notFound();
        }

        if ($sale->status === 'voided') {
            return $this->apiFail('Sale is already voided', 422);
        }

        $payload = $this->request->getJSON(true) ?? [];

        $db = Database::connect();
        $db->transStart();

        $saleItemModel = model(SaleItemModel::class);
        $inventoryModel = model(InventoryModel::class);
        $transactionModel = model(InventoryTransactionModel::class);

        $items = $saleItemModel->where('sale_id', $id)->findAll();
        $productIds = array_unique(array_column($items, 'product_id'));
        $productsById = $productIds === []
            ? []
            : array_column(model(ProductModel::class)->whereIn('id', $productIds)->findAll(), null, 'id');

        foreach ($items as $item) {
            $product = $productsById[$item->product_id] ?? null;
            if (! $product || ! (bool) $product->track_inventory) {
                continue;
            }

            $inventory = $inventoryModel->forProductAtStore((int) $item->product_id, (int) $sale->store_id);
            $balance = Services::inventoryCalculator()->applyDelta((float) ($inventory->quantity ?? 0), (float) $item->quantity);
            $inventoryId = $inventory
                ? $inventory->id
                : $inventoryModel->insert(['product_id' => $item->product_id, 'store_id' => $sale->store_id, 'quantity' => 0], true);

            $inventoryModel->update($inventoryId, ['quantity' => $balance]);

            $transactionModel->insert([
                'inventory_id' => $inventoryId,
                'product_id' => $item->product_id,
                'store_id' => $sale->store_id,
                'type' => InventoryTransactionModel::TYPE_ADJUSTMENT,
                'quantity' => $item->quantity,
                'balance_after' => $balance,
                'reference_type' => 'sale_void',
                'reference_id' => $sale->id,
                'user_id' => Services::authContext()->userId,
                'notes' => 'Stock restored from voided sale',
            ]);
        }

        $this->model->update($id, [
            'status' => 'voided',
            'notes' => trim(($sale->notes ?? '') . ' ' . ('[VOIDED] ' . ($payload['reason'] ?? ''))),
        ]);

        $db->transComplete();

        Services::auditLogger()->log('void', 'Sale', (int) $id, $sale->invoice_number, [
            'status' => ['old' => $sale->status, 'new' => 'voided'],
            'reason' => ['old' => null, 'new' => $payload['reason'] ?? null],
        ]);

        return $this->ok($this->model->find($id), 'Sale voided and stock restored');
    }
}
