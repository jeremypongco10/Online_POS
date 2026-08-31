import type { Bagger, Customer, LoyaltyCard } from '../api/types';
import type { CartLine } from './posTypes';

export interface HeldSale {
  id: string;
  heldAt: string;
  label: string;
  lines: CartLine[];
  customer: Customer | null;
  card: LoyaltyCard | null;
  bagger: Bagger | null;
}

function storageKey(registerId: number): string {
  return `pos_held_sales_${registerId}`;
}

/**
 * Client-side only, scoped per register — no backend call, no cross-device
 * sync. Lost if the browser's storage is cleared; acceptable for a
 * cashier-convenience "come back to this later" holster, not a durable
 * record (a completed sale is the durable record).
 */
export function listHeldSales(registerId: number): HeldSale[] {
  try {
    const raw = localStorage.getItem(storageKey(registerId));
    return raw ? (JSON.parse(raw) as HeldSale[]) : [];
  } catch {
    return [];
  }
}

export function holdSale(
  registerId: number,
  sale: { lines: CartLine[]; customer: Customer | null; card: LoyaltyCard | null; bagger: Bagger | null }
): HeldSale {
  const held: HeldSale = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    heldAt: new Date().toISOString(),
    label: sale.lines[0] ? `${sale.lines[0].product.name}${sale.lines.length > 1 ? ` +${sale.lines.length - 1} more` : ''}` : 'Empty sale',
    ...sale,
  };

  const all = listHeldSales(registerId);
  all.push(held);
  localStorage.setItem(storageKey(registerId), JSON.stringify(all));
  return held;
}

export function removeHeldSale(registerId: number, id: string): void {
  const remaining = listHeldSales(registerId).filter((h) => h.id !== id);
  localStorage.setItem(storageKey(registerId), JSON.stringify(remaining));
}
