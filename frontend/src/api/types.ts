export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T | null;
  errors: Record<string, string> | null;
  meta: { page: number; per_page: number; total: number; last_page: number } | null;
}

export interface AuthUser {
  id: number;
  company_id: number;
  role_id: number | null;
  role_name: string | null;
  name: string;
  email: string;
  username: string;
  permissions: string[];
  /** The company's ISO 4217 code, carried on the auth payload because every role needs it to render money and none of them share a permission that would gate it. See AuthController::attachCompanyProfile. */
  currency: string;
  /** 'vat' (Philippine VAT) or 'gst' — presentation only, see src/regional.ts. */
  tax_system: string;
  /** Minutes of no activity before the POS screen locks itself, 0 = never. A cashier can still always lock it by hand regardless — see pos/useIdleLock. */
  pos_lock_idle_minutes: number;
}

export interface Unit {
  id: number;
  name: string;
  abbreviation: string;
  decimal_places: number;
}

export interface TaxRate {
  id: number;
  name: string;
  rate: string;
  is_default: string | number;
  /**
   * The single-letter BIR receipt flag — V(atable), E(xempt),
   * Z(ero-rated), N(on-VAT). Server-derived from the rate's
   * classification (TaxService::indicator), never stored or edited, so it
   * can't disagree with how a line using this rate is actually taxed.
   * Optional because endpoints other than /taxes return bare rate rows.
   */
  indicator?: 'V' | 'E' | 'Z' | 'N';
}

export interface Product {
  id: number;
  company_id: number;
  category_id: number | null;
  unit_id: number | null;
  tax_rate_id: number | null;
  sku: string;
  barcode: string | null;
  name: string;
  description: string | null;
  /** Relative to the backend's public/ root — build a loadable URL with assetUrl() from api/client. */
  image_path: string | null;
  minimum_stock: string;
  is_active: string | number;
  track_inventory: string | number;
}

/** One row's outcome from `POST /products/bulk` — used by both the Bulk Add grid and the CSV import preview. */
export interface BulkProductResult {
  index: number;
  success: boolean;
  data?: Product;
  error?: string;
}

export interface BulkProductResponse {
  results: BulkProductResult[];
  created: number;
  failed: number;
}

/** A Product as returned by `GET /products?store_id=` — price and on-hand stock resolved for that one store, null if unpriced/never-stocked there. */
export interface ProductWithStorePrice extends Product {
  cost_price: string | null;
  selling_price: string | null;
  stock_quantity: string | null;
}

/** One row of `GET /products/{id}/prices` — every company store, priced or not. */
export interface StoreProductPrice {
  store_id: number;
  store_name: string;
  cost_price: string | null;
  selling_price: string | null;
}

export interface Company {
  id: number;
  trade_name: string;
  legal_name: string | null;
  tax_id: string | null;
  is_vat_registered: string | number;
  vat_registration_number: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  currency: string;
  /** Which tax regime this company's wording and receipts follow. Presentation only — the arithmetic is identical either way. See src/regional.ts. */
  tax_system: string;
  timezone: string;
  is_active: string | number;
  /** Points earned per ₱100 of a sale's total, applied automatically at checkout when a customer is attached. 0 = disabled. */
  loyalty_points_per_100: string | number;
  /** Minutes of no activity before the POS screen locks itself, 0 = never (manual locking still always works). See pos/useIdleLock. */
  pos_lock_idle_minutes: string | number;
  /** Whether a supervisor must sign off before the POS drops a single cart line. Defaults to 0 — a mis-scan correction is logged, not blocked. See VoidApprovalDialog. */
  require_item_void_approval: string | number;
  /** Whether a supervisor must sign off before the whole cart is cancelled. Defaults to 1 — rare and high-signal, so the friction is worth it. */
  require_cancel_approval: string | number;
  /** Whether a supervisor must sign off before Manual Discount can be applied. Defaults to 1 — the one discount type with no statutory rate or business policy behind it. */
  require_manual_discount_approval: string | number;
  /** A starting point DiscountDialog pre-fills into its percent field for this type — not an enforced ceiling, the cashier can still type a different number. Null/blank means no default is configured. */
  default_regular_discount_percent: string | number | null;
  default_promo_discount_percent: string | number | null;
  default_employee_discount_percent: string | number | null;
  default_member_discount_percent: string | number | null;
  default_wholesale_discount_percent: string | number | null;
  /** Which boundary sales.transaction_no resets on — separate from, and unrelated to, invoice_series' own numbering (see InvoiceSeriesTab's Transaction Numbering card). */
  transaction_no_reset_rule: 'per_session' | 'per_register' | 'per_day';
  /** Optional cosmetic prefix for the formatted transaction number, e.g. "TX-". Null/blank means none. */
  transaction_no_prefix: string | null;
  /** Zero-padded digit count for the formatted transaction number. 0 means print the bare number with no padding. */
  transaction_no_length: string | number;
  /** Off = not registered with the BIR yet, so no tax is charged on anything and no BIR detail prints. Enforced server-side in SalesController, not just hidden. */
  is_bir_registered: string | number;
}

export interface Store {
  id: number;
  company_id: number;
  name: string;
  code: string;
  address: string | null;
  is_active: string | number;
  /** A closing message printed at the BOTTOM of this store's own receipts — "Thank you, come again", a return policy, a promo, etc. The header is a fixed structured block (name/address/TIN/VAT Reg TIN/Serial/MIN below), so free text has no place there; this is the receipt's one free-text slot. Frozen onto each sale at checkout (Sale.store_receipt_footer_note is the copy a receipt actually reads), so editing this never rewrites a receipt already issued. */
  receipt_footer_note: string | null;
  /** BIR-mandated identifiers printed in the receipt's header — VAT Registration TIN, the POS unit's serial number, and its Machine Identification Number. Each frozen onto the sale at checkout, same as receipt_footer_note. */
  vat_reg_tin: string | null;
  pos_serial_no: string | null;
  min_no: string | null;
  /** BIR Permit to Use number for this branch's accredited terminal, printed on every receipt it issues. */
  ptu_number: string | null;
  /** Whether the three fields above actually print on this store's receipts — independent of whether they're filled in. Checked once at checkout (SalesController::create), so toggling this never changes a receipt already issued. */
  show_bir_details: string | number;
}

/** Three ways a cash session can start on this register — see RegisterModel's own notes (backend) on the three modes and why 'fixed'/'fixed_confirm' resolve to the exact same number server-side regardless of what a client sends. */
export type OpeningFloatMode = 'manual' | 'fixed' | 'fixed_confirm';

export interface Register {
  id: number;
  store_id: number;
  name: string;
  code: string;
  is_active: string | number;
  opening_float_mode: OpeningFloatMode;
  /** Only meaningful when opening_float_mode isn't 'manual' — null for a register left on manual entry. */
  default_opening_float: string | null;
  /** Sales rung up on this terminal are practice only: marked, excluded from every total, report and reading, and never given a real BIR invoice number. */
  is_training_mode: string | number;
}

/** `code` (not `id`) is what a Payment.method / payments.method value actually holds — see PaymentPanel.tsx. */
export interface PaymentMethodOption {
  id: number;
  name: string;
  code: string;
  is_active: string | number;
}

export interface CashSession {
  id: number;
  register_id: number;
  user_id: number;
  opened_at: string;
  closed_at: string | null;
  opening_balance: string;
  closing_balance: string | null;
  expected_balance: string | null;
  difference: string | null;
  status: 'open' | 'closed';
  notes: string | null;
}

/** A paid-in/paid-out against an open drawer that isn't a sale — petty cash, a change-fund top-up. Recorded from the Back Office's Cash Drawers screen; feeds Expected Cash at close time. */
export interface CashMovement {
  id: number;
  cash_session_id: number;
  type: 'cash_in' | 'cash_out';
  amount: string;
  reason: string | null;
  user_id: number | null;
  created_at: string;
}

export interface CashSessionSummary {
  opening_balance: number;
  cash_sales_total: number;
  cash_in_total: number;
  cash_out_total: number;
  expected_balance: number;
  /** Item voids this cashier made during the shift, and their value — the outlier-spotting figures on the close-out sheet. */
  void_count: number;
  void_total: number;
  /** Whole-cart cancellations during the shift. */
  cancel_count: number;
}

export interface Customer {
  id: number;
  customer_code: string;
  first_name: string;
  last_name: string;
  name: string;
  email: string | null;
  mobile: string | null;
  is_active: string | number;
  points?: number | null;
  loyalty_card_id?: number | null;
  card_number?: string | null;
}

export interface PointsHistoryEntry {
  id: number;
  customer_id: number;
  loyalty_card_id: number;
  points_delta: number;
  balance_after: number;
  note: string | null;
  created_by: number | null;
  created_by_name: string | null;
  created_at: string;
}

export interface LoyaltyCard {
  id: number;
  customer_id: number;
  card_number: string;
  status: 'active' | 'inactive' | 'blocked' | 'lost';
  points: string | number;
  balance: string;
}

/** As returned by `GET /stores/{id}/baggers` — active Bagger-role users assigned to that store. See UserStoreModel::baggerQuery() for the exact column list. */
export interface Bagger {
  id: number;
  name: string;
  username: string;
  phone: string | null;
}

export interface SaleResponse {
  id: number;
  invoice_number: string;
  subtotal: string;
  discount_total: string;
  /** BIR RR 7-2010 documentation for a Senior Citizen/PWD/5% BNPC line on this sale, if any — see AddDiscountHolderToSales. */
  discount_holder_name: string | null;
  discount_id_number: string | null;
  tax_total: string;
  total: string;
  amount_paid: string;
  change_due: string;
}

export interface Receipt {
  sale_id: number;
  company: { name: string | null; tin: string | null };
  store: {
    name: string | null;
    address: string | null;
    vat_reg_tin: string | null;
    pos_serial_no: string | null;
    min_no: string | null;
    /** BIR Permit to Use number for this terminal — printed on every receipt an accredited machine issues. */
    ptu_number: string | null;
  };
  /** The Sold To block a VAT invoice carries for a business purchase. All-null on an ordinary walk-in sale. */
  buyer: {
    name: string | null;
    address: string | null;
    tin: string | null;
    business_style: string | null;
  };
  /** Rung up while the terminal was in training mode — not a valid invoice, and excluded from every total and reading. */
  is_training: boolean;
  /** This receipt has been printed before, so this copy must be marked a duplicate. */
  is_reprint: boolean;
  /** Store.receipt_footer_note, frozen at checkout — prints at the very bottom of the receipt, physically far from the `store` header block above, hence its own top-level field rather than nested under `store`. */
  footer_note: string | null;
  invoice_number: string;
  /** A plain per-shift counter, distinct from invoice_number and separately configurable (company.transaction_no_reset_rule/prefix/length) — see InvoiceSeriesTab's Transaction Numbering card. Null under the per_session rule when no cash session was attached. */
  transaction_no: string | null;
  date: string;
  cashier: string | null;
  bagger: string | null;
  customer: string | null;
  loyalty_card_number: string | null;
  /** BIR RR 7-2010 documentation for a Senior Citizen/PWD/5% BNPC line on this sale — null unless at least one item below carries a government discount_type. */
  discount_holder_name: string | null;
  discount_id_number: string | null;
  items: Array<{
    name: string;
    sku: string;
    quantity: string;
    unit_price: string;
    discount: string;
    /** One of discountTypes.ts's nine codes, or null for no discount / a sale predating this feature. */
    discount_type: string | null;
    tax_amount: string;
    line_total: string;
    /** V/E/Z/N, derived from the line's own persisted tax_type — how this item was taxed at the time of sale, not how its product would be taxed today. */
    tax_indicator: 'V' | 'E' | 'Z' | 'N';
  }>;
  subtotal: string;
  discount_total: string;
  /** Frozen at checkout from Store::show_bir_details — whether the VAT/VAT Exempt/Zero Rated breakdown below should print, on top of already gating store.vat_reg_tin/pos_serial_no/min_no. The figures themselves are always present; this is a display policy, not a claim the sale had no VAT. */
  show_bir_details: boolean;
  /** The VAT-exclusive base of the taxable lines. BIR requires this printed alongside the VAT itself — the tax alone doesn't say what was taxed to arrive at it. */
  vatable_sales: number;
  vat_amount: number;
  vat_exempt_amount: number;
  zero_rated_amount: number;
  non_vat_amount: number;
  total: string;
  payments: Array<{ method: string; amount: string; reference: string | null }>;
  amount_paid: string;
  change_due: string;
  status: string;
}

export interface Category {
  id: number;
  company_id: number;
  parent_id: number | null;
  name: string;
  description: string | null;
  is_active: string | number;
}

export interface Supplier {
  id: number;
  company_id: number;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  tax_id: string | null;
  is_active: string | number;
}

export interface Inventory {
  id: number;
  product_id: number;
  store_id: number;
  quantity: string;
  reorder_level: string;
  product_name?: string;
  sku?: string;
  store_name?: string;
}

export interface InventoryTransaction {
  id: number;
  inventory_id: number;
  product_id: number;
  store_id: number;
  type: 'purchase' | 'sale' | 'return' | 'adjustment' | 'transfer_in' | 'transfer_out';
  quantity: string;
  balance_after: string;
  reference_type: string | null;
  reference_id: number | null;
  user_id: number | null;
  notes: string | null;
  created_at: string;
}

export interface PurchaseOrder {
  id: number;
  company_id: number;
  store_id: number;
  supplier_id: number;
  user_id: number;
  po_number: string;
  status: 'draft' | 'approved' | 'received' | 'cancelled';
  order_date: string | null;
  expected_date: string | null;
  received_date: string | null;
  subtotal: string;
  tax_total: string;
  total: string;
  notes: string | null;
}

export interface PurchaseOrderItem {
  id: number;
  purchase_order_id: number;
  product_id: number;
  product_name: string | null;
  product_sku: string | null;
  tax_rate_id: number | null;
  quantity: string;
  unit_cost: string;
  tax_rate: string;
  line_total: string;
  received_quantity: string;
}

export interface SalesReturn {
  id: number;
  sale_id: number;
  store_id: number;
  user_id: number;
  customer_id: number | null;
  return_number: string;
  reason: string | null;
  status: 'pending' | 'completed' | 'cancelled';
  total_refund: string;
  return_date: string;
}

export interface ReturnItem {
  id: number;
  return_id: number;
  sale_item_id: number;
  product_id: number;
  quantity: string;
  unit_price: string;
  refund_amount: string;
  product_name?: string;
  remaining_quantity?: number;
}

export interface AdminUser {
  id: number;
  company_id: number;
  role_id: number | null;
  name: string;
  email: string;
  username: string;
  phone: string | null;
  is_active: string | number;
  last_login_at: string | null;
}

export interface Role {
  id: number;
  company_id: number;
  name: string;
  description: string | null;
  is_system: string | number;
}

export interface Permission {
  id: number;
  name: string;
  slug: string;
  description: string | null;
}

export interface SalesAggregate {
  sale_count: string;
  subtotal: string;
  discount_total: string;
  tax_total: string;
  total: string;
}

export interface DailySales extends SalesAggregate {
  date: string;
}

export interface MonthlySales extends SalesAggregate {
  month: string;
}

export interface StoreSales extends SalesAggregate {
  store_id: number;
  store_name: string | null;
}

export interface CashierSales extends SalesAggregate {
  user_id: number;
  cashier_name: string | null;
}

export interface BaggerSales extends SalesAggregate {
  bagger_id: number;
  bagger_name: string | null;
}

export interface ProductSales {
  product_id: number;
  product_name: string | null;
  product_sku: string | null;
  total_quantity: string;
  total_revenue: string;
  order_count: string;
}

export interface CategorySales {
  category_id: number | null;
  category_name: string;
  total_quantity: string;
  total_revenue: string;
}

export interface PaymentMethodSales {
  method: string;
  payment_count: string;
  total_amount: string;
}

export interface VatSummary {
  vatable_sales: number;
  vat_amount: number;
  vat_exempt_sales: number;
  zero_rated_sales: number;
  non_vat_sales: number;
  total_sales: number;
}

/**
 * One row per invoice from GET /reports/sales-book — the per-invoice
 * detail behind VatSummary's totals, in the shape an examiner reconciles
 * against receipts and Z-readings (see ReportsController::salesBook).
 * Buyer fields are null on a plain walk-in sale with no customer
 * attached.
 */
export interface SalesBookRow {
  sale_date: string;
  invoice_number: string;
  customer_name: string | null;
  customer_tin: string | null;
  customer_address: string | null;
  business_style: string | null;
  vatable_sales: number;
  vat_amount: number;
  vat_exempt_sales: number;
  zero_rated_sales: number;
  non_vat_sales: number;
  discount_total: number;
  total: number;
}

/** One row per discount type from GET /reports/discount-summary. `discount_type` is null for a discount applied before discount types existed — see ReportsController::discountedLinesBuilder. */
export interface DiscountTypeSummary {
  discount_type: string | null;
  line_count: string | number;
  sale_count: string | number;
  discount_total: string;
  /** What those lines actually rang up at after the discount — add discount_total for the pre-discount figure. */
  net_total: string;
}

export interface DiscountCashierSummary {
  user_id: number;
  cashier_name: string | null;
  line_count: string | number;
  sale_count: string | number;
  discount_total: string;
}

/** One discounted line from GET /reports/discount-details. With the three government types selected this is the SC/PWD register — hence the holder name/ID, which come from the parent sale and are null on every other type. */
export interface DiscountDetail {
  sale_item_id: number;
  sale_id: number;
  invoice_number: string;
  sale_date: string;
  discount_holder_name: string | null;
  discount_id_number: string | null;
  cashier_name: string | null;
  product_name: string | null;
  quantity: string;
  unit_price: string;
  discount_type: string | null;
  discount: string;
  line_total: string;
  tax_type: string | null;
}

export interface InventoryValuation {
  store_id: number;
  product_count: string;
  total_cost_value: string;
}

export interface CurrentStockRow {
  id: number;
  product_id: number;
  store_id: number;
  quantity: string;
  reorder_level: string;
  updated_at: string;
  product_name: string;
  sku: string;
  category_id: number | null;
  unit: string | null;
  cost_value: string;
}

export interface StockMovementRow {
  type: string;
  movement_count: string;
  net_quantity: string;
}

export interface StockAdjustmentRow {
  id: number;
  product_id: number;
  store_id: number;
  quantity: string;
  balance_after: string;
  notes: string | null;
  created_at: string;
  product_name: string;
  sku: string;
}

export interface StockTransferRow {
  id: number;
  product_id: number;
  store_id: number;
  type: string;
  quantity: string;
  balance_after: string;
  created_at: string;
  product_name: string;
  sku: string;
  store_name: string;
}

/** One entry in a field-level diff, as recorded on an `update` AuditLog — see `changes`. */
export interface AuditLogFieldChange {
  old: unknown;
  new: unknown;
}

export interface AuditLog {
  id: number;
  company_id: number;
  user_id: number | null;
  user_name: string | null;
  action: string;
  entity_type: string;
  entity_id: number | null;
  entity_label: string | null;
  /**
   * For `create`/`delete`: the full row snapshot, field => value. For
   * `update` and most custom actions: field => { old, new }. Shape
   * depends on `action`, so it's read dynamically in the View modal
   * rather than typed precisely here.
   */
  changes: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

/**
 * A BIR-style sales invoice numbering series — the Sales Invoice
 * Configuration module's own record (Settings → Sales Invoicing). One row
 * per (store, invoice_type, series_code); only one row per (store_id,
 * invoice_type) may be `status: 'active'` at a time, enforced server-side.
 * `starting_number`/`current_number`/`maximum_number` come back as strings
 * (BIGINT, same convention as Product.stock_quantity) to avoid JS number
 * precision loss well before 99,999,999 would ever actually risk it, and
 * so a plain numeric `<input>` can bind to them without a lossy round trip.
 */
export interface InvoiceSeries {
  id: number;
  company_id: number;
  store_id: number;
  /** Admin-defined text (e.g. "Sales Invoice", "VAT Invoice", "Non-VAT Invoice") — never a fixed set the app assumes for the caller. */
  invoice_type: string;
  series_code: string;
  prefix: string | null;
  suffix: string | null;
  starting_number: string;
  /** The last number actually issued — 0 (or starting_number - 1) means none yet. */
  current_number: string;
  maximum_number: string;
  number_length: string | number;
  /** Remaining-count thresholds (spec §5) at which the series table's Remaining column switches to a warning, then critical, color. */
  warning_threshold: string | number;
  critical_threshold: string | number;
  effective_from: string;
  effective_to: string | null;
  status: 'active' | 'inactive' | 'exhausted';
  created_by: number | null;
  updated_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface DashboardData {
  date: string;
  today_sales: number;
  today_transactions: number;
  average_transaction: number;
  top_products: Array<{
    product_id: number;
    product_name: string | null;
    total_quantity: string;
    total_revenue: string;
  }>;
  low_stock: Array<{
    id: number;
    product_id: number;
    store_id: number;
    quantity: string;
    reorder_level: string;
    product_name: string;
    sku: string;
  }>;
  payment_breakdown: Array<{ method: string; payment_count: string; total_amount: string }>;
  sales_by_store: Array<{
    store_id: number;
    store_name: string | null;
    transaction_count: string;
    total_sales: string;
  }>;
}

/**
 * The figures an X or Z reading reports. One shape for both: a Z is the
 * same reading written down and counted (see ReadingsController), so a
 * single type is what keeps the two from drifting apart on screen.
 * Money arrives as strings on a stored Z and numbers on a freshly
 * computed X, hence the union on every amount.
 */
export interface Reading {
  type: 'X' | 'Z';
  register_id: number;
  register_name: string | null;
  store_id: number;
  store_name?: string | null;
  min_no: string | null;
  pos_serial_no: string | null;
  ptu_number: string | null;
  z_counter: number;
  reset_counter: number;
  covers_from: string;
  covers_to: string;
  beginning_invoice_number: string | null;
  ending_invoice_number: string | null;
  beginning_grand_total: string | number;
  ending_grand_total: string | number;
  transaction_count: number;
  gross_sales: string | number;
  discount_total: string | number;
  net_sales: string | number;
  vatable_sales: string | number;
  vat_amount: string | number;
  vat_exempt_sales: string | number;
  zero_rated_sales: string | number;
  non_vat_sales: string | number;
  sc_discount_total: string | number;
  pwd_discount_total: string | number;
  bnpc_discount_total: string | number;
  other_discount_total: string | number;
  void_count: number;
  void_total: string | number;
  return_count: number;
  return_total: string | number;
}

/** A Z-reading as stored — a Reading plus the row's own identity. Never edited or deleted; see ZReadingModel. */
export interface ZReading extends Omit<Reading, 'type' | 'register_name'> {
  id: number;
  company_id: number;
  business_date: string;
  register_name?: string | null;
  generated_by: number | null;
  created_at: string;
}
