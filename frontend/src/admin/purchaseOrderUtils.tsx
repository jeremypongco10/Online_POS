import type { ReactNode } from 'react';
import EditNoteOutlinedIcon from '@mui/icons-material/EditNoteOutlined';
import VerifiedOutlinedIcon from '@mui/icons-material/VerifiedOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined';
import type { PurchaseOrder } from '../api/types';

export type PoStatus = PurchaseOrder['status'];

export const PO_STATUSES: PoStatus[] = ['draft', 'approved', 'received', 'cancelled'];

export const PO_STATUS_META: Record<
  PoStatus,
  { label: string; hint: string; color: 'warning' | 'info' | 'success' | 'default'; icon: (size: number) => ReactNode }
> = {
  draft: {
    label: 'Draft',
    hint: 'Waiting for approval',
    color: 'warning',
    icon: (s) => <EditNoteOutlinedIcon sx={{ fontSize: s }} />,
  },
  approved: {
    label: 'Approved',
    hint: 'Waiting for delivery',
    color: 'info',
    icon: (s) => <VerifiedOutlinedIcon sx={{ fontSize: s }} />,
  },
  received: {
    label: 'Received',
    hint: 'Added to stock',
    color: 'success',
    icon: (s) => <Inventory2OutlinedIcon sx={{ fontSize: s }} />,
  },
  cancelled: {
    label: 'Cancelled',
    hint: 'No longer active',
    color: 'default',
    icon: (s) => <BlockOutlinedIcon sx={{ fontSize: s }} />,
  },
};

/** Today as YYYY-MM-DD in local time — what a `<input type="date">` holds. */
export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** An approved order whose expected delivery date has passed without being received. */
export function isOverdue(po: Pick<PurchaseOrder, 'status' | 'expected_date'>): boolean {
  return po.status === 'approved' && !!po.expected_date && po.expected_date.slice(0, 10) < todayIso();
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Purchase orders carry no tax, so a line is simply quantity × unit cost — the same sum the server saves. */
export function lineAmount(quantity: number, unitCost: number): number {
  return round2(quantity * unitCost);
}

export function num(value: string | number | null | undefined): number {
  const n = typeof value === 'number' ? value : parseFloat(value ?? '');
  return Number.isFinite(n) ? n : 0;
}

/** "12" or "1.5" — no trailing zeros from DECIMAL columns. */
export function formatQty(value: string | number): string {
  return String(parseFloat(num(value).toFixed(4)));
}

export interface PoLineDraft {
  product_id: number;
  name: string;
  sku: string;
  quantity: string;
  unit_cost: string;
}

export interface PoFormValues {
  store_id: string;
  supplier_id: string;
  /** Shown in the supplier picker before it has fetched anything — set when editing or duplicating an order. */
  supplier_name: string;
  order_date: string;
  expected_date: string;
  notes: string;
  lines: PoLineDraft[];
}

export function emptyPoForm(): PoFormValues {
  return { store_id: '', supplier_id: '', supplier_name: '', order_date: todayIso(), expected_date: '', notes: '', lines: [] };
}
