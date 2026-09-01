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

/** The in-progress (not yet held/paid) cart, autosaved so a refresh or an accidental tab close doesn't lose it. Distinct from a held sale: there is at most one of these per terminal, and the cashier never chose to park it. */
export interface DraftSale {
  savedAt: string;
  lines: CartLine[];
  customer: Customer | null;
  card: LoyaltyCard | null;
  bagger: Bagger | null;
}

function draftKey(registerId: number): string {
  return `pos_draft_sale_${registerId}`;
}

/**
 * Anything older than this is dropped on load rather than restored. A
 * cart abandoned at the end of a shift reappearing on the next one is
 * worse than losing it: the cashier who didn't ring it up has no idea
 * where those items came from, and it takes a deliberate glance at the
 * cart to notice before scanning on top of it.
 */
const DRAFT_MAX_AGE_MS = 12 * 60 * 60 * 1000;

export function saveDraftSale(registerId: number, draft: Omit<DraftSale, 'savedAt'>): void {
  try {
    // An empty cart clears the slot instead of storing an empty draft —
    // otherwise a completed/cancelled sale would leave a husk behind that
    // loadDraftSale has to special-case on the way back in.
    if (draft.lines.length === 0) {
      localStorage.removeItem(draftKey(registerId));
      return;
    }
    localStorage.setItem(draftKey(registerId), JSON.stringify({ ...draft, savedAt: new Date().toISOString() }));
  } catch {
    // Storage full or blocked (private mode) — autosave is a safety net,
    // never a precondition for ringing up a sale, so this stays silent.
  }
}

export function loadDraftSale(registerId: number): DraftSale | null {
  try {
    const raw = localStorage.getItem(draftKey(registerId));
    if (!raw) return null;

    const draft = JSON.parse(raw) as DraftSale;
    if (!Array.isArray(draft.lines) || draft.lines.length === 0) return null;

    const age = Date.now() - new Date(draft.savedAt).getTime();
    // Number.isNaN guards a corrupt/hand-edited savedAt, which would make
    // every comparison false and quietly restore the draft forever.
    if (Number.isNaN(age) || age > DRAFT_MAX_AGE_MS) {
      localStorage.removeItem(draftKey(registerId));
      return null;
    }

    return draft;
  } catch {
    return null;
  }
}

export function clearDraftSale(registerId: number): void {
  try {
    localStorage.removeItem(draftKey(registerId));
  } catch {
    // See saveDraftSale.
  }
}
