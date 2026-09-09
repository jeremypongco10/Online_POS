import type { CartLine } from './posTypes';
import { previewGovernmentDiscount } from './posTypes';
import { DISCOUNT_TYPE_BY_CODE, type DiscountTypeCode } from './discountTypes';

/**
 * The discount currently governing the sale — set once when the cashier
 * applies a non-Manual discount via DiscountDialog, then reused by
 * PosScreen to fold in whatever gets added to the cart afterward (see
 * PosScreen's discount-recompute effect). `mode`/`value` are the cashier's
 * raw inputs, not a computed total, so a newly eligible line (or a
 * quantity change) can be priced the exact same way the original
 * selection was — including a fixed peso amount re-splitting across
 * however many eligible lines now exist.
 *
 * Deliberately never set for Manual Discount: that type is approved by a
 * supervisor for one specific amount and reason, so it stays a one-time
 * stamp rather than something that silently grows to cover later items.
 */
export interface ActiveDiscount {
  discountType: DiscountTypeCode;
  mode: 'percent' | 'fixed';
  value: number;
}

export const round2 = (n: number) => Math.round(n * 100) / 100;

export const lineSubtotal = (line: CartLine) => line.quantity * line.unitPrice;

/**
 * Splits one cart-wide peso amount across the qualifying lines in
 * proportion to what each contributes, with the last line absorbing
 * whatever the roundings left over so the parts always add back up to
 * exactly the amount entered.
 */
export function distributeFixedAmount(amount: number, lines: CartLine[]): Record<string, number> {
  const total = lines.reduce((sum, l) => sum + lineSubtotal(l), 0);
  if (total <= 0 || lines.length === 0) return {};

  const out: Record<string, number> = {};
  let allocated = 0;
  lines.forEach((line, i) => {
    const share = i === lines.length - 1 ? round2(amount - allocated) : round2((amount * lineSubtotal(line)) / total);
    out[line.key] = share;
    allocated = round2(allocated + share);
  });

  return out;
}

/**
 * What each of `eligibleLines` (already filtered for eligibility by the
 * caller) would receive under `discountType`, keyed by CartLine.key. The
 * one function both DiscountDialog (the cashier's live preview while
 * choosing) and PosScreen (folding in items added afterward) call, so the
 * two can never drift apart on the math.
 */
export function computeDiscountAmounts(
  discountType: DiscountTypeCode,
  mode: 'percent' | 'fixed',
  value: number,
  eligibleLines: CartLine[]
): Record<string, number> {
  const def = DISCOUNT_TYPE_BY_CODE[discountType];
  if (!def) return {};

  if (def.fixedRatePercent !== null) {
    return Object.fromEntries(
      eligibleLines.map((l) => [l.key, previewGovernmentDiscount(l.quantity, l.unitPrice, l.taxRate, def.code)])
    );
  }

  if (mode === 'percent') {
    return Object.fromEntries(eligibleLines.map((l) => [l.key, round2((lineSubtotal(l) * value) / 100)]));
  }
  return distributeFixedAmount(value, eligibleLines);
}
