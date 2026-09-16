<?php

namespace App\Controllers\Api\V1;

use App\Controllers\Api\BaseCrudController;
use App\Libraries\TaxService;
use App\Models\CompanyModel;
use App\Models\CustomerModel;
use App\Models\InventoryModel;
use App\Models\InventoryTransactionModel;
use App\Models\InvoiceSeriesModel;
use App\Models\LoyaltyCardModel;
use App\Models\LoyaltyPointTransactionModel;
use App\Models\PaymentMethodModel;
use App\Models\PaymentModel;
use App\Models\ProductModel;
use App\Models\RegisterModel;
use App\Models\SaleItemModel;
use App\Models\SaleModel;
use App\Models\StoreModel;
use App\Models\TransactionCounterModel;
use App\Models\UnitModel;
use App\Models\UserModel;
use App\Models\UserStoreModel;
use CodeIgniter\HTTP\ResponseInterface;
use Config\Auth as AuthConfig;
use Config\Database;
use Config\Services;
use RuntimeException;

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

        $taxService = Services::taxService();
        $vatAmount = 0.0;
        // The VAT-EXCLUSIVE base of the taxable lines. BIR wants this
        // printed next to the VAT itself — "VATable Sales" and "VAT
        // Amount" are two required lines, not one: the tax alone doesn't
        // say what was taxed to arrive at it.
        $vatableSales = 0.0;
        $vatExemptAmount = 0.0;
        $zeroRatedAmount = 0.0;
        $nonVatAmount = 0.0;

        foreach ($items as $item) {
            $net = (float) $item->line_total - (float) $item->tax_amount;
            switch ($item->tax_type) {
                case 'vat':
                    $vatAmount += (float) $item->tax_amount;
                    $vatableSales += $net;
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
            // The receipt's own sale id, so the POS can report back that
            // this one went to paper (see markPrinted()) without the
            // caller having to carry the id separately.
            'sale_id' => (int) $sale->id,
            'company' => [
                'name' => $sale->company_name,
                'tin' => $sale->company_tin,
            ],
            'store' => [
                'name' => $sale->store_name,
                'address' => $sale->store_address,
                'vat_reg_tin' => $sale->store_vat_reg_tin,
                'pos_serial_no' => $sale->store_pos_serial_no,
                'min_no' => $sale->store_min_no,
                // Read live rather than snapshotted: a Permit to Use is
                // renewed on its own cycle, and a reprint should show the
                // permit the machine holds, not one that has since lapsed.
                'ptu_number' => model(StoreModel::class)->find((int) $sale->store_id)->ptu_number ?? null,
            ],
            // The Sold To block a VAT invoice carries for a business
            // purchase — null on an ordinary walk-in sale, where there is
            // no registered buyer to name.
            'buyer' => [
                'name' => $sale->customer_name,
                'address' => $sale->customer_address,
                'tin' => $sale->customer_tin,
                'business_style' => $sale->customer_business_style,
            ],
            'is_training' => (bool) $sale->is_training,
            // Anything past the first print is a duplicate and has to say
            // so on the paper — see markPrinted() below.
            'is_reprint' => (int) $sale->print_count > 0,
            // Top-level, not nested under `store`: this prints at the
            // BOTTOM of the receipt, physically far from the header block
            // above, so it reads better as its own field than as one more
            // property of `store` a renderer has to remember lives apart
            // from the rest of that group.
            'footer_note' => $sale->store_receipt_footer_note,
            'invoice_number' => $sale->invoice_number,
            // Distinct from invoice_number above — see
            // AddTransactionNumberSettingsToCompanies. Null under the
            // per_session reset rule when no cash session was attached.
            'transaction_no' => $sale->transaction_no,
            'date' => $sale->sale_date,
            'cashier' => $sale->cashier_name,
            'bagger' => $sale->bagger_name,
            'customer' => $sale->customer_name,
            'loyalty_card_number' => $sale->loyalty_card_number,
            // BIR RR 7-2010 documentation for a Senior Citizen/PWD/5% BNPC
            // line — printed once for the whole sale (see
            // AddDiscountHolderToSales), null on any sale with no
            // government discount applied.
            'discount_holder_name' => $sale->discount_holder_name,
            'discount_id_number' => $sale->discount_id_number,
            'items' => array_map(static fn ($item) => [
                'name' => $item->product_name,
                'sku' => $item->product_sku,
                'quantity' => $item->quantity,
                'unit_price' => $item->unit_price,
                'discount' => $item->discount,
                'discount_type' => $item->discount_type,
                'tax_amount' => $item->tax_amount,
                'line_total' => $item->line_total,
                // Read off the line's own persisted tax_type, so a
                // reprint years later shows how the item was taxed at the
                // time of sale rather than how its product would be taxed
                // today.
                'tax_indicator' => $taxService->indicatorForType($item->tax_type),
            ], $items),
            'subtotal' => $sale->subtotal,
            'discount_total' => $sale->discount_total,
            // Frozen at checkout (Store::show_bir_details at the time of
            // sale) — governs whether the frontend shows the VAT/VAT
            // Exempt/Zero Rated breakdown below, on top of already gating
            // the three store identifiers above. The figures themselves
            // are still returned either way: this is a display policy,
            // not a claim that the sale had no VAT, and the raw
            // per-line tax_type on sale_items (unaffected by this flag)
            // remains the source of truth for BIR sales reports.
            'show_bir_details' => (bool) $sale->show_bir_details,
            'vatable_sales' => round($vatableSales, 2),
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

        /**
         * Loaded here rather than with the other receipt snapshots below,
         * because the line loop needs it: a business that has not
         * registered with the BIR charges no tax at all (see
         * AddBirRegisteredToCompanies), so every line resolves to no rate
         * regardless of what the product carries or the client sends.
         *
         * Enforced server-side on purpose. The POS hides tax when this is
         * off, but "the screen didn't show it" is not what decides whether
         * tax was collected — this is.
         */
        $company = model(CompanyModel::class)->find((int) $payload['company_id']);
        $taxEnabled = $company === null || (bool) $company->is_bir_registered;

        $productModel = model(ProductModel::class);
        $unitModel = model(UnitModel::class);
        $inventoryModel = model(InventoryModel::class);
        $discountTotal = 0.0;
        $lineData = [];
        $taxResults = [];
        $requiredQtyByProduct = [];
        $requiresDiscountHolder = false;

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

                $taxRate = $taxEnabled ? $taxService->resolveRate($item['tax_rate_id'] ?? null) : null;
                $discountType = $item['discount_type'] ?? null;
                $result = $this->resolveLineDiscount(
                    $taxService,
                    $discountType,
                    $quantity,
                    $unitPrice,
                    (float) ($item['discount'] ?? 0),
                    $taxRate,
                    $inclusive,
                    "custom item: {$name}",
                    null
                );
                if (! is_array($result)) {
                    return $result;
                }
                if ($taxService->discountRequiresHolderId($discountType)) {
                    $requiresDiscountHolder = true;
                }

                $discountTotal += $result['discount'];
                $taxResults[] = $result;
                $lineData[] = [
                    'product_id' => null,
                    // Custom items have no catalog row to snapshot a
                    // name/SKU from — the typed name IS the snapshot.
                    'product_name' => $name,
                    'product_sku' => null,
                    'tax_rate_id' => $result['tax_rate_id'],
                    'tax_type' => $result['tax_type'],
                    'quantity' => $quantity,
                    'unit_price' => $unitPrice,
                    'discount' => $result['discount'],
                    'discount_type' => $discountType,
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

            // A catalog line's price may legitimately be zero (a giveaway,
            // a bundled component) where a custom item's may not, so this is
            // `< 0` rather than the `<= 0` the custom branch above uses.
            // A negative one was already refused before this — but only as a
            // side effect of isValidDiscount(), whose "Discount must be
            // between 0 and the line subtotal" told the cashier nothing
            // about the actual problem. Say it here, where it is true.
            $unitPrice = (float) ($item['unit_price'] ?? 0);
            if ($unitPrice < 0) {
                return $this->apiFail("unit_price cannot be negative for product: {$product->name}", 422);
            }

            $taxRate = $taxEnabled ? $taxService->resolveRate($item['tax_rate_id'] ?? null) : null;
            $discountType = $item['discount_type'] ?? null;
            $result = $this->resolveLineDiscount(
                $taxService,
                $discountType,
                $quantity,
                $unitPrice,
                (float) ($item['discount'] ?? 0),
                $taxRate,
                $inclusive,
                "product: {$product->name}",
                $product
            );
            if (! is_array($result)) {
                return $result;
            }
            if ($taxService->discountRequiresHolderId($discountType)) {
                $requiresDiscountHolder = true;
            }

            $discountTotal += $result['discount'];
            $taxResults[] = $result;

            $lineData[] = [
                'product_id' => $item['product_id'],
                // Snapshot the name/SKU as they are right now — a later
                // rename must not change what this receipt says was sold.
                'product_name' => $product->name,
                'product_sku' => $product->sku,
                'tax_rate_id' => $result['tax_rate_id'],
                'tax_type' => $result['tax_type'],
                'quantity' => $quantity,
                'unit_price' => $unitPrice,
                'discount' => $result['discount'],
                'discount_type' => $discountType,
                'tax_rate' => $result['rate'],
                'tax_amount' => $result['tax_amount'],
                'line_total' => $result['gross_amount'],
            ];
        }

        // --- BIR RR 7-2010 / RA 9994 / RA 10754: a Senior Citizen, PWD,
        // or 5% Basic Necessities & Prime Commodities line requires the
        // purchaser's name and government ID number on the sale record
        // for the discount to be valid documentation, not just applied
        // at the register. Checked once, after the loop, rather than
        // per-line — one holder covers the whole transaction (see
        // AddDiscountHolderToSales). ---
        if (! empty($requiresDiscountHolder)) {
            $holderName = trim((string) ($payload['discount_holder_name'] ?? ''));
            $holderId = trim((string) ($payload['discount_id_number'] ?? ''));
            if ($holderName === '' || $holderId === '') {
                return $this->apiFail('discount_holder_name and discount_id_number are required when a Senior Citizen, PWD, or 5% Basic Necessities discount is applied', 422);
            }
            $payload['discount_holder_name'] = $holderName;
            $payload['discount_id_number'] = $holderId;
        } else {
            $payload['discount_holder_name'] = null;
            $payload['discount_id_number'] = null;
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
        // $company is already loaded above, where the line loop needed it
        // for the tax-enabled check — not re-fetched here.
        $store = model(StoreModel::class)->find((int) $payload['store_id']);
        // Gates whether the BIR identifiers below are actually written
        // onto the sale, not just whether they're filled in — see
        // AddShowBirDetailsToStores. Consulted exactly once, right here:
        // toggling the store's setting after this sale exists can never
        // reach back and change what already printed.
        // ...and gated again by whether the business is BIR-registered at
        // all: an unregistered business has no VAT breakdown to print and
        // no accreditation numbers to print it under, so the per-branch
        // switch can't turn them on.
        $showBirDetails = $taxEnabled && ($store === null || (bool) $store->show_bir_details);
        $cashier = model(UserModel::class)->find($cashierId);
        // The buyer block a VAT invoice carries for a business purchase —
        // name, address, TIN and business style — snapshotted like every
        // other receipt field so editing the customer later can't restate
        // an invoice already issued.
        $customer = ! empty($payload['customer_id'])
            ? model(CustomerModel::class)->find((int) $payload['customer_id'])
            : null;
        $customerName = $customer->name ?? null;

        // Training sales are rung up exactly like real ones so a cashier
        // learns the real flow, but they're marked here and then excluded
        // from every total, report and reading, and they never consume a
        // real invoice number (see the numbering block below).
        $register = model(RegisterModel::class)->find((int) $payload['register_id']);
        $isTraining = $register !== null && (bool) $register->is_training_mode;

        $db = Database::connect();
        $db->transStart();

        // --- Generate invoice number (see class-level note on ordering) ---
        // InvoiceSeriesModel::nextNumber() is the Sales Invoice Configuration
        // module's own atomic, row-locked generator (see that model) —
        // superseding InvoiceSequenceModel, which is left in place untouched
        // for the other two types (purchase_order/return; see PurchasesController)
        // and for the historical record of numbers already issued through it.
        // 'Sales Invoice' is the one invoice_type this POS's single checkout
        // flow resolves to; a branch with no active series for it throws here,
        // caught below and turned into a 422 the cashier sees as checkoutError.
        // A training sale must never burn a number out of the real BIR
        // series — the series has to account for every number it issues,
        // and a practice transaction is not one of them. It gets its own
        // obviously-not-an-invoice number from a per-register counter
        // instead, and the receipt is stamped TRAINING on top of that.
        if ($isTraining) {
            $trainingNo = model(TransactionCounterModel::class)->nextNumber((int) $payload['register_id'], 'training');
            $invoiceNumber = 'TRN-' . str_pad((string) $trainingNo, 8, '0', STR_PAD_LEFT);
        } else {
            try {
                $invoiceResult = model(InvoiceSeriesModel::class)->nextNumber(
                    (int) $payload['company_id'],
                    (int) $payload['store_id'],
                    'Sales Invoice'
                );
            } catch (RuntimeException $e) {
                $db->transRollback();

                return $this->apiFail($e->getMessage(), 422);
            }
            $invoiceNumber = $invoiceResult['formatted'];
        }

        // --- Generate transaction number: a plain internal shift
        // reference, distinct from the invoice number above and
        // separately configurable (see
        // AddTransactionNumberSettingsToCompanies) — company.
        // transaction_no_reset_rule decides which TransactionCounterModel
        // scope this sale's number is drawn from:
        //   - per_session: resets with each new cash session; null if no
        //     session is attached (nothing to scope the counter to).
        //   - per_register: one sequence per register, never reset.
        //   - per_day: resets at the start of each calendar day.
        // The counter itself is always a bare int; prefix/length here are
        // purely cosmetic formatting, mirroring how invoice numbers are
        // formatted from invoice_series' prefix/number_length.
        $resetRule = $company->transaction_no_reset_rule ?? 'per_session';
        $scopeKey = match ($resetRule) {
            'per_register' => 'register',
            'per_day' => date('Y-m-d'),
            default => ! empty($payload['cash_session_id']) ? 'session:' . $payload['cash_session_id'] : null,
        };

        $transactionNo = null;
        if ($scopeKey !== null) {
            $rawNumber = model(TransactionCounterModel::class)->nextNumber((int) $payload['register_id'], $scopeKey);
            $length = (int) ($company->transaction_no_length ?? 0);
            $transactionNo = ($company->transaction_no_prefix ?? '')
                . ($length > 0 ? str_pad((string) $rawNumber, $length, '0', STR_PAD_LEFT) : (string) $rawNumber);
        }

        // --- Create sale ---
        $saleId = $this->model->insert([
            ...$payload,
            'invoice_number' => $invoiceNumber,
            'transaction_no' => $transactionNo,
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
            'store_receipt_footer_note' => $store->receipt_footer_note ?? null,
            'store_vat_reg_tin' => $showBirDetails ? ($store->vat_reg_tin ?? null) : null,
            'store_pos_serial_no' => $showBirDetails ? ($store->pos_serial_no ?? null) : null,
            'store_min_no' => $showBirDetails ? ($store->min_no ?? null) : null,
            // Also governs the VAT sales breakdown on the receipt (see
            // ::receipt() below) — a store that hides its BIR identifiers
            // almost always wants the whole BIR-specific block gone, not
            // just the three identifier lines with a VAT breakdown still
            // sitting underneath them.
            'show_bir_details' => $showBirDetails ? 1 : 0,
            'cashier_name' => $cashier->name ?? null,
            'bagger_name' => $bagger->name ?? null,
            'customer_name' => $customerName,
            'customer_address' => $customer->address ?? null,
            'customer_tin' => $customer->tax_id ?? null,
            'customer_business_style' => $customer->business_style ?? null,
            'is_training' => $isTraining ? 1 : 0,
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

        // --- Accumulated grand total: the terminal's lifetime total, only
        // ever added to, and the figure every X/Z-reading is bracketed by
        // (see BirReadingService). Inside the transaction, so a checkout
        // that rolls back can't leave the machine claiming a sale it
        // never completed. Training sales are not sales and never touch
        // it. ---
        if (! $isTraining) {
            Services::birReadingService()->addToGrandTotal((int) $payload['register_id'], (float) $total);
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

    /**
     * POST /api/v1/sales/authorize-item-void
     * body: { identifier, password, reason, product_name, quantity, amount, store_id? }
     *
     * Supervisor sign-off for voiding a single line out of an
     * in-progress cart. Nothing is mutated here — the cart lives only in
     * the browser until checkout, so there is no sale row to change yet.
     * What this endpoint does is (a) prove the approver is real, active,
     * and actually carries sales.void, and (b) write the void into the
     * audit trail. The POS removes the line only after this returns 200.
     *
     * Deliberately NOT a login: it issues no token and touches no
     * session. The cashier stays signed in throughout; the supervisor is
     * only ever authenticated for this single decision.
     *
     * The account-safety checks mirror AuthController::login() on
     * purpose — this accepts a password, so it is a credential endpoint
     * and gets the same lockout, inactive-account, and failed-attempt
     * handling. Skipping any of them would turn this into a softer side
     * door for guessing a supervisor's password than the login form.
     */
    /**
     * GET /api/v1/sales/void-policy
     *
     * The one company setting the POS itself needs before it can decide
     * whether to open a VoidApprovalDialog or just remove a line/cancel
     * the sale directly: Company::require_item_void_approval and
     * ::require_cancel_approval. Exposed as its
     * own tiny endpoint, rather than having the POS call GET /companies/
     * {id}, because that route is gated on companies.view — a permission
     * no POS-only role (Cashier, Bagger, Cashier Supervisor) holds, while
     * every one of them needs this one boolean.
     */
    /**
     * POST /api/v1/sales/{id}/mark-printed
     *
     * Records that this sale's receipt has been put on paper. The count
     * itself is the point: an accredited terminal has to mark every
     * reissue as a duplicate, and "has it been printed before" is the
     * only honest way to know which print is the original. Called by the
     * POS right after it opens the print dialog, so the NEXT fetch of
     * this receipt comes back with is_reprint true.
     *
     * Gated on sales.view rather than a manage permission — printing a
     * receipt the cashier is already looking at is not a privileged act,
     * and refusing it would just mean untracked reprints.
     */
    public function markPrinted($id = null): ResponseInterface
    {
        $sale = $this->applyScope()->find($id);

        if (! $sale) {
            return $this->notFound();
        }

        $this->model->update($id, ['print_count' => (int) $sale->print_count + 1]);

        return $this->ok(['print_count' => (int) $sale->print_count + 1]);
    }

    public function voidPolicy()
    {
        $auth = Services::authContext();
        $company = model(CompanyModel::class)->find($auth->companyId);

        // Both default to "required" when the company row can't be read at
        // all — failing closed is the right way round for a control, and
        // the caller can't tell the difference from a genuinely strict
        // configuration.
        return $this->ok([
            'require_item_void_approval' => $company === null || (bool) $company->require_item_void_approval,
            'require_cancel_approval' => $company === null || (bool) $company->require_cancel_approval,
        ]);
    }

    /**
     * POST /api/v1/sales/log-void
     * body: { kind: 'item'|'cart', reason?, product_name?, quantity?, amount?, item_count? }
     *
     * `reason` is required for 'cart' and optional for 'item' — an item
     * void no longer collects one (see VoidApprovalDialog), so the line
     * itself is the record of what happened.
     *
     * Records a void the cashier performed on their own authority, for
     * the case where the company has approval switched off. No
     * credentials: the point of turning approval off is that a mis-scan
     * shouldn't need a supervisor walked over — but the event still has
     * to reach the audit trail, or the setting would trade a real control
     * for no record at all rather than for a lighter one.
     *
     * Same actions/entity types as the approved path, minus approved_by —
     * so a voids report reads both kinds together and the absence of an
     * approver is itself the signal that it was unsupervised.
     */
    public function logVoid()
    {
        $payload = $this->request->getJSON(true) ?? [];

        // Reason is only required for a cart void (Cancel Sale) — an item
        // void no longer collects one at all (see VoidApprovalDialog):
        // the line itself, name, quantity, amount, already is a full
        // record of what left the sale, and a preset reason on top of
        // that never told a reviewer anything the line data didn't.
        // Cancelling the whole cart is the rarer, bigger action, so it
        // still asks why. Read directly off the raw payload rather than
        // after validation, purely to pick which rule 'reason' itself
        // gets below — 'kind' is still validated properly right after.
        $reasonRequired = ($payload['kind'] ?? null) !== 'item';

        if (! $this->validateData($payload, [
            'kind' => ['label' => 'Kind', 'rules' => 'required|in_list[item,cart]'],
            'reason' => ['label' => 'Reason', 'rules' => ($reasonRequired ? 'required' : 'permit_empty') . '|max_length[255]'],
            'product_name' => ['label' => 'Item', 'rules' => 'permit_empty|max_length[150]'],
            'quantity' => ['label' => 'Quantity', 'rules' => 'permit_empty|numeric'],
            'amount' => ['label' => 'Amount', 'rules' => 'permit_empty|numeric'],
            'item_count' => ['label' => 'Item count', 'rules' => 'permit_empty|is_natural_no_zero'],
        ])) {
            return $this->validationFail($this->validator->getErrors());
        }

        if ($payload['kind'] === 'item') {
            Services::auditLogger()->log('item-void', 'Cart Item', null, $payload['product_name'] ?? 'Item', [
                'item' => $payload['product_name'] ?? null,
                'quantity' => $payload['quantity'] ?? null,
                'amount' => $payload['amount'] ?? null,
                'reason' => $payload['reason'] ?? null,
            ]);
        } else {
            $count = (int) ($payload['item_count'] ?? 0);
            $label = 'Entire cart (' . $count . ' item' . ($count === 1 ? '' : 's') . ')';

            Services::auditLogger()->log('cart-void', 'Cart', null, $label, [
                'item_count' => $count,
                'amount' => $payload['amount'] ?? null,
                'reason' => $payload['reason'],
            ]);
        }

        return $this->ok(null, 'Void recorded');
    }

    public function authorizeItemVoid()
    {
        $payload = $this->request->getJSON(true) ?? [];

        if (! $this->validateData($payload, [
            'identifier' => ['label' => 'Supervisor username or email', 'rules' => 'required'],
            'password' => ['label' => 'Password', 'rules' => 'required'],
            // permit_empty, not required: VoidApprovalDialog no longer
            // collects a reason for an item void — see logVoid()'s own
            // note on why. Approval (the supervisor's credentials just
            // above) is unaffected; only the reason went away.
            'reason' => ['label' => 'Reason', 'rules' => 'permit_empty|max_length[255]'],
            'product_name' => ['label' => 'Item', 'rules' => 'required|max_length[150]'],
            'quantity' => ['label' => 'Quantity', 'rules' => 'permit_empty|numeric'],
            'amount' => ['label' => 'Amount', 'rules' => 'permit_empty|numeric'],
            'store_id' => ['label' => 'Store', 'rules' => 'permit_empty|is_natural_no_zero'],
        ])) {
            return $this->validationFail($this->validator->getErrors());
        }

        $approver = $this->resolveSupervisorApprover($payload, 'sales.void', 'item-void-denied', 'Cart Item', $payload['product_name']);
        if ($approver instanceof ResponseInterface) {
            return $approver;
        }

        // Attributed to the cashier (log() reads the request's own
        // AuthContext), with the approver named in the payload — the
        // trail needs to answer "who did it" and "who allowed it" as two
        // separate questions.
        Services::auditLogger()->log('item-void', 'Cart Item', null, $payload['product_name'], [
            'item' => $payload['product_name'],
            'quantity' => $payload['quantity'] ?? null,
            'amount' => $payload['amount'] ?? null,
            'reason' => $payload['reason'] ?? null,
            'approved_by' => $approver->name,
            'approved_by_id' => (int) $approver->id,
        ]);

        return $this->ok([
            'approved_by' => $approver->name,
            'approved_by_id' => (int) $approver->id,
        ], 'Void approved');
    }

    /**
     * POST /api/v1/sales/authorize-cart-void
     * body: { identifier, password, reason, item_count, amount, store_id? }
     *
     * Same shape and same guarantees as authorizeItemVoid() above — see
     * that method's docblock — but for clearing the whole in-progress
     * cart (Cancel Sale) rather than dropping one line. Kept as its own
     * action/entity_type in the audit trail ('cart-void' on 'Cart')
     * rather than reusing 'item-void', so the two read as distinct event
     * kinds when a manager scans the trail later.
     */
    public function authorizeCartVoid()
    {
        $payload = $this->request->getJSON(true) ?? [];

        if (! $this->validateData($payload, [
            'identifier' => ['label' => 'Supervisor username or email', 'rules' => 'required'],
            'password' => ['label' => 'Password', 'rules' => 'required'],
            'reason' => ['label' => 'Reason', 'rules' => 'required|max_length[255]'],
            'item_count' => ['label' => 'Item count', 'rules' => 'required|is_natural_no_zero'],
            'amount' => ['label' => 'Amount', 'rules' => 'permit_empty|numeric'],
            'store_id' => ['label' => 'Store', 'rules' => 'permit_empty|is_natural_no_zero'],
        ])) {
            return $this->validationFail($this->validator->getErrors());
        }

        $label = 'Entire cart (' . $payload['item_count'] . ' item' . ((int) $payload['item_count'] === 1 ? '' : 's') . ')';

        $approver = $this->resolveSupervisorApprover($payload, 'sales.void', 'cart-void-denied', 'Cart', $label);
        if ($approver instanceof ResponseInterface) {
            return $approver;
        }

        Services::auditLogger()->log('cart-void', 'Cart', null, $label, [
            'item_count' => (int) $payload['item_count'],
            'amount' => $payload['amount'] ?? null,
            'reason' => $payload['reason'],
            'approved_by' => $approver->name,
            'approved_by_id' => (int) $approver->id,
        ]);

        return $this->ok([
            'approved_by' => $approver->name,
            'approved_by_id' => (int) $approver->id,
        ], 'Cancellation approved');
    }

    /**
     * Shared credential/authority check behind authorizeItemVoid(),
     * authorizeCartVoid(), and authorizeItemDiscount() — verifying a
     * supervisor is real, active, unlocked, holds $requiredPermission,
     * and (if the caller is store-restricted) assigned to
     * $payload['store_id'], logging every denial along the way under the
     * caller-supplied $deniedAction/$entityType/$label.
     *
     * $requiredPermission varies by caller (sales.void for the two void
     * endpoints, sales.discount for the discount endpoint) — approving a
     * void and approving a discount are kept as distinct authorities in
     * this app, the same way returns.create and returns.approve are
     * deliberately separate, so one supervisor role can be given one
     * without the other.
     *
     * Returns the approver row on success, or a ResponseInterface to
     * return immediately on failure — callers check with `instanceof
     * ResponseInterface`, not is_object(): the approver row is also a
     * plain object (UserModel's returnType), so is_object() alone can
     * never tell the two apart. (Found live while testing Manual
     * Discount's wrong-password path — the same bug was already latent
     * in authorizeItemVoid/authorizeCartVoid, just never exercised.)
     * The account-safety handling here deliberately mirrors
     * AuthController::login(): this accepts a password, so it is a
     * credential endpoint and gets the same lockout, inactive-account,
     * and failed-attempt handling. Skipping any of it would make this a
     * softer side door for guessing a supervisor's password than the
     * login form itself.
     */
    private function resolveSupervisorApprover(array $payload, string $requiredPermission, string $deniedAction, string $entityType, string $label)
    {
        $auth = Services::authContext();
        $userModel = model(UserModel::class);
        $approver = $userModel->findByIdentifier($payload['identifier']);
        $authConfig = config(AuthConfig::class);

        // Cross-tenant approval must be impossible, so an approver from
        // another company is treated exactly like a nonexistent one —
        // same message, same 401 — rather than a distinct error that
        // would confirm the account exists somewhere.
        if ($approver && (int) $approver->company_id !== (int) $auth->companyId) {
            $approver = null;
        }

        if ($approver && $userModel->isLocked($approver)) {
            $minutesLeft = (int) ceil((strtotime($approver->locked_until) - time()) / 60);
            Services::auditLogger()->log($deniedAction, $entityType, null, $label, [
                'reason' => 'Approver account locked',
                'identifier' => $payload['identifier'],
            ]);

            return $this->apiFail("That account is locked due to too many failed attempts. Try again in {$minutesLeft} minute(s).", 423);
        }

        if ($approver && ! (bool) $approver->is_active) {
            $approver = null;
        }

        if (! $approver || ! password_verify($payload['password'], $approver->password_hash)) {
            if ($approver) {
                $userModel->registerFailedLogin($approver->id, $authConfig->maxLoginAttempts, $authConfig->lockoutMinutes);
            }

            // Logged even on failure: repeated failed void approvals on
            // one terminal is exactly the pattern a manager reviewing the
            // trail would want surfaced.
            Services::auditLogger()->log($deniedAction, $entityType, null, $label, [
                'reason' => 'Invalid supervisor credentials',
                'identifier' => $payload['identifier'],
            ]);

            return $this->apiFail('Invalid supervisor credentials', 401);
        }

        if (! in_array($requiredPermission, $userModel->permissionSlugs((int) $approver->id), true)) {
            Services::auditLogger()->log($deniedAction, $entityType, null, $label, [
                'reason' => "Approver lacks {$requiredPermission}",
                'approved_by' => $approver->name,
            ]);

            return $this->forbidden('That user is not authorized to approve this');
        }

        // A store-restricted approver (Cashier Supervisor and Store Admin
        // are pinned to exactly one store — see UsersController::
        // SINGLE_STORE_ROLES) can only sign off at their own store. Zero
        // rows means unrestricted, which is access to every store, so
        // that case passes through untouched.
        $storeId = isset($payload['store_id']) ? (int) $payload['store_id'] : null;
        if ($storeId !== null) {
            $approverStores = array_map(
                static fn ($s) => (int) $s->id,
                model(UserStoreModel::class)->storesForUser((int) $approver->id)
            );

            if ($approverStores !== [] && ! in_array($storeId, $approverStores, true)) {
                return $this->forbidden('That supervisor is not assigned to this store');
            }
        }

        $userModel->clearLoginLock((int) $approver->id);

        return $approver;
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

    /**
     * Server-authoritative counterpart to isValidDiscount()+calculateLine()
     * for one cart line — branches on discount_type:
     *
     *  - A government type (Senior Citizen/PWD/5% BNPC): the discount
     *    amount is computed HERE from the statutory rate via TaxService::
     *    calculateGovernmentDiscountLine(). The client-sent `discount` is
     *    never trusted for these — see that method's docblock for why.
     *  - Anything else (including no discount_type at all): the same
     *    validate-and-trust behaviour this endpoint already had before
     *    discount types existed.
     *
     * Returns the calculateLine()-shaped result array with `discount_type`
     * folded in, or a ResponseInterface to return immediately on failure
     * — callers check with is_array().
     */
    private function resolveLineDiscount(
        TaxService $taxService,
        ?string $discountType,
        float $quantity,
        float $unitPrice,
        float $requestedDiscount,
        ?object $taxRate,
        bool $inclusive,
        string $label,
        ?object $product
    ) {
        if (! $taxService->isKnownDiscountType($discountType)) {
            return $this->apiFail("Unknown discount_type for {$label}: {$discountType}", 422);
        }

        // Eligibility (Category/Product Discount Eligibility settings)
        // gates every discount type uniformly, not just the three
        // government ones — every type defaults to NOT eligible until a
        // company explicitly turns it on for a product or category (see
        // TaxService::isProductEligibleForDiscount), Senior Citizen/PWD/
        // 5% BNPC included. $product is null for a custom item, which
        // isProductEligibleForDiscount() always treats as eligible
        // regardless — see that method's docblock for why.
        if ($discountType !== null && ! $taxService->isProductEligibleForDiscount($discountType, $product)) {
            $discountLabel = TaxService::discountLabel($discountType);

            return $this->apiFail("The {$discountLabel} discount is not available for {$label}", 422);
        }

        if ($taxService->isGovernmentDiscountType($discountType)) {
            $result = $taxService->calculateGovernmentDiscountLine($discountType, $quantity, $unitPrice, $taxRate, $inclusive);
        } else {
            if (! $taxService->isValidDiscount($quantity, $unitPrice, $requestedDiscount)) {
                return $this->apiFail("Discount must be between 0 and the line subtotal for {$label}", 422);
            }
            $result = $taxService->calculateLine($quantity, $unitPrice, $requestedDiscount, $taxRate, $inclusive);
        }

        $result['discount_type'] = $discountType;

        return $result;
    }

    /**
     * GET /api/v1/sales/discount-policy
     *
     * Sibling to voidPolicy() — the one company setting the POS needs
     * before deciding whether picking Manual Discount opens the
     * supervisor sign-off fields. Same gating rationale as voidPolicy():
     * every POS role needs this boolean, and Cashier deliberately lacks
     * companies.view, which gates the full company record.
     */
    public function discountPolicy()
    {
        $auth = Services::authContext();
        $company = model(CompanyModel::class)->find($auth->companyId);

        // Defaults to "required" when the company row can't be read at
        // all, same fail-closed reasoning as voidPolicy().
        return $this->ok([
            'require_manual_discount_approval' => $company === null || (bool) $company->require_manual_discount_approval,
            // A starting point DiscountDialog pre-fills into the percent
            // field for the five configurable types — null/absent means
            // "no default configured for this company", which leaves the
            // field blank exactly as it always has. Gated on sales.create
            // like the rest of this endpoint (see the route comment), not
            // companies.view, so a Cashier can read these without also
            // being able to read the full company record.
            'discount_defaults' => [
                'regular' => $company?->default_regular_discount_percent !== null ? (float) $company->default_regular_discount_percent : null,
                'promo' => $company?->default_promo_discount_percent !== null ? (float) $company->default_promo_discount_percent : null,
                'employee' => $company?->default_employee_discount_percent !== null ? (float) $company->default_employee_discount_percent : null,
                'member' => $company?->default_member_discount_percent !== null ? (float) $company->default_member_discount_percent : null,
                'wholesale' => $company?->default_wholesale_discount_percent !== null ? (float) $company->default_wholesale_discount_percent : null,
            ],
        ]);
    }

    /**
     * POST /api/v1/sales/log-item-discount
     * body: { discount_type, product_name, amount, reason? }
     *
     * Records a Manual Discount the cashier applied on their own
     * authority — only ever posted when the company has manual-discount
     * approval switched off. Same "still reaches the audit trail, just
     * unattributed to an approver" reasoning as logVoid().
     */
    public function logItemDiscount()
    {
        $payload = $this->request->getJSON(true) ?? [];

        if (! $this->validateData($payload, [
            'discount_type' => ['label' => 'Discount type', 'rules' => 'required|in_list[' . implode(',', TaxService::DISCOUNT_TYPES) . ']'],
            'product_name' => ['label' => 'Item', 'rules' => 'required|max_length[150]'],
            'amount' => ['label' => 'Discount amount', 'rules' => 'required|numeric'],
            'reason' => ['label' => 'Reason', 'rules' => 'permit_empty|max_length[255]'],
        ])) {
            return $this->validationFail($this->validator->getErrors());
        }

        Services::auditLogger()->log('item-discount', 'Cart Item', null, $payload['product_name'], [
            'item' => $payload['product_name'],
            'discount_type' => $payload['discount_type'],
            'amount' => $payload['amount'],
            'reason' => $payload['reason'] ?? null,
        ]);

        return $this->ok(null, 'Discount recorded');
    }

    /**
     * POST /api/v1/sales/authorize-item-discount
     * body: { identifier, password, discount_type, product_name, amount, reason?, store_id? }
     *
     * Supervisor sign-off for applying a Manual Discount to one
     * in-progress cart line — same guarantees as authorizeItemVoid():
     * nothing is mutated here (the cart lives only in the browser until
     * checkout), this only proves the approver is real and holds
     * sales.discount, and writes the decision to the audit trail. The
     * POS applies the discount only after this returns 200.
     */
    public function authorizeItemDiscount()
    {
        $payload = $this->request->getJSON(true) ?? [];

        if (! $this->validateData($payload, [
            'identifier' => ['label' => 'Supervisor username or email', 'rules' => 'required'],
            'password' => ['label' => 'Password', 'rules' => 'required'],
            'discount_type' => ['label' => 'Discount type', 'rules' => 'required|in_list[' . implode(',', TaxService::DISCOUNT_TYPES) . ']'],
            'product_name' => ['label' => 'Item', 'rules' => 'required|max_length[150]'],
            'amount' => ['label' => 'Discount amount', 'rules' => 'required|numeric'],
            'reason' => ['label' => 'Reason', 'rules' => 'permit_empty|max_length[255]'],
            'store_id' => ['label' => 'Store', 'rules' => 'permit_empty|is_natural_no_zero'],
        ])) {
            return $this->validationFail($this->validator->getErrors());
        }

        $approver = $this->resolveSupervisorApprover($payload, 'sales.discount', 'item-discount-denied', 'Cart Item', $payload['product_name']);
        if ($approver instanceof ResponseInterface) {
            return $approver;
        }

        Services::auditLogger()->log('item-discount', 'Cart Item', null, $payload['product_name'], [
            'item' => $payload['product_name'],
            'discount_type' => $payload['discount_type'],
            'amount' => $payload['amount'],
            'reason' => $payload['reason'] ?? null,
            'approved_by' => $approver->name,
            'approved_by_id' => (int) $approver->id,
        ]);

        return $this->ok([
            'approved_by' => $approver->name,
            'approved_by_id' => (int) $approver->id,
        ], 'Discount approved');
    }
}
