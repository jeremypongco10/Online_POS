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
  timezone: string;
  is_active: string | number;
  /** Points earned per ₱100 of a sale's total, applied automatically at checkout when a customer is attached. 0 = disabled. */
  loyalty_points_per_100: string | number;
  /** Whether a supervisor must sign off before the POS drops a single cart line. Defaults to 0 — a mis-scan correction is logged, not blocked. See VoidApprovalDialog. */
  require_item_void_approval: string | number;
  /** Whether a supervisor must sign off before the whole cart is cancelled. Defaults to 1 — rare and high-signal, so the friction is worth it. */
  require_cancel_approval: string | number;
}

export interface Store {
  id: number;
  company_id: number;
  name: string;
  code: string;
  address: string | null;
  is_active: string | number;
}

export interface Register {
  id: number;
  store_id: number;
  name: string;
  code: string;
  is_active: string | number;
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
  tax_total: string;
  total: string;
  amount_paid: string;
  change_due: string;
}

export interface Receipt {
  company: { name: string | null; tin: string | null };
  store: { name: string | null; address: string | null };
  invoice_number: string;
  date: string;
  cashier: string | null;
  bagger: string | null;
  customer: string | null;
  loyalty_card_number: string | null;
  items: Array<{
    name: string;
    sku: string;
    quantity: string;
    unit_price: string;
    discount: string;
    tax_amount: string;
    line_total: string;
    /** V/E/Z/N, derived from the line's own persisted tax_type — how this item was taxed at the time of sale, not how its product would be taxed today. */
    tax_indicator: 'V' | 'E' | 'Z' | 'N';
  }>;
  subtotal: string;
  discount_total: string;
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
