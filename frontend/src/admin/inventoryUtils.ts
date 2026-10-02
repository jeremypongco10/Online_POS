import type { InventoryTransaction } from '../api/types';

export type StockStatus = 'in_stock' | 'low' | 'out';

/** Same rules as the server's status filter (InventoryController::applyStockFilters). */
export function stockStatus(quantity: number, reorderLevel: number): StockStatus {
  if (quantity <= 0) return 'out';
  if (quantity <= reorderLevel) return 'low';
  return 'in_stock';
}

export const STOCK_STATUS_META: Record<StockStatus, { label: string; hint: string; css: string; sx: string }> = {
  in_stock: { label: 'In stock', hint: 'Above the reorder level', css: 'var(--mui-palette-success-main)', sx: 'success.main' },
  low: { label: 'Low stock', hint: 'At or below the reorder level', css: 'var(--mui-palette-warning-main)', sx: 'warning.main' },
  out: { label: 'Out of stock', hint: 'Nothing on hand', css: 'var(--mui-palette-error-main)', sx: 'error.main' },
};

export type MovementType = InventoryTransaction['type'];

export const MOVEMENT_TYPES: MovementType[] = ['purchase', 'sale', 'return', 'adjustment', 'transfer_in', 'transfer_out'];

export const MOVEMENT_META: Record<MovementType, { label: string; css: string }> = {
  purchase: { label: 'Purchase', css: 'var(--mui-palette-success-main)' },
  return: { label: 'Return', css: 'var(--mui-palette-info-main)' },
  transfer_in: { label: 'Transfer in', css: 'var(--mui-palette-success-main)' },
  sale: { label: 'Sale', css: 'var(--mui-palette-error-main)' },
  transfer_out: { label: 'Transfer out', css: 'var(--mui-palette-error-main)' },
  adjustment: { label: 'Adjustment', css: 'var(--mui-palette-warning-main)' },
};

/** Common reasons for a manual adjustment — saved as the movement's notes, so they show up in reports. */
export const ADJUST_REASONS = ['Stock count', 'Opening stock', 'Damaged', 'Expired', 'Lost or stolen', 'Returned to supplier', 'Found / recovered', 'Other'];

export const tint = (css: string, pct: number) => `color-mix(in srgb, ${css} ${pct}%, transparent)`;

export function n(value: string | number | null | undefined): number {
  const parsed = typeof value === 'number' ? value : parseFloat(value ?? '');
  return Number.isFinite(parsed) ? parsed : 0;
}

/** "12", "1.5", "-3" — no trailing zeros from DECIMAL(15,4) columns. */
export function fmtQty(value: string | number | null | undefined): string {
  return String(parseFloat(n(value).toFixed(4)));
}

/** Signed, for movements: "+12", "−3". */
export function fmtDelta(value: string | number): string {
  const v = n(value);
  return v > 0 ? `+${fmtQty(v)}` : v < 0 ? `−${fmtQty(-v)}` : '0';
}
