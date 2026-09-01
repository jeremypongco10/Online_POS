import type { Product, TaxRate, Unit } from '../api/types';

export interface CartLine {
  key: string;
  product: Product;
  /** A cashier-typed line with no catalog product behind it — `product` is a synthetic stand-in (negative sentinel id) built purely so existing code that reads `line.product.name`/`.sku` keeps working unmodified. */
  isCustom?: boolean;
  unit: Unit | null;
  taxRate: TaxRate | null;
  quantity: number;
  unitPrice: number;
  discount: number;
}

export interface LineTotals {
  net: number;
  tax: number;
  gross: number;
}

/**
 * Client-side preview only — mirrors TaxService's *inclusive* VAT math
 * (see SalesController's `prices_include_tax`); the server remains
 * authoritative.
 *
 * Catalogue selling prices already contain VAT, as Philippine retail
 * shelf prices must, so the tax is backed OUT of the line rather than
 * added on top: an ₱88.00 tag rings up at ₱88.00 (net 78.57 + VAT 9.43),
 * not ₱98.56. This previously added the rate on top, which overcharged
 * every vatable line by the full VAT amount.
 *
 * `gross` is therefore just the discounted price as tagged, and `net` is
 * what's left after removing VAT — so a zero/absent rate leaves both
 * equal and the line behaves exactly as before.
 */
export function calculateLine(line: CartLine): LineTotals {
  const gross = line.quantity * line.unitPrice - line.discount;
  const rate = line.taxRate ? parseFloat(line.taxRate.rate) : 0;
  const net = rate > 0 ? gross / (1 + rate / 100) : gross;
  // Derive tax from the rounded net rather than rounding it independently,
  // so net + tax always reconciles back to gross to the centavo instead of
  // drifting a centavo off on some lines.
  const roundedNet = Math.round(net * 100) / 100;
  return { net: roundedNet, tax: Math.round((gross - roundedNet) * 100) / 100, gross };
}

export interface CartTotals {
  /** Sum of the line totals exactly as shown in the cart — VAT-inclusive, so this reconciles with the figures on screen rather than sitting below them unexplained. */
  subtotal: number;
  discountTotal: number;
  /** VAT *contained within* subtotal, not added to it. Informational only — adding this to subtotal would double-charge the tax. */
  taxTotal: number;
  /** Equal to subtotal: prices already include VAT, so there is nothing further to add. Matches the server's `gross_amount` (SalesController::create). */
  total: number;
}

export function calculateCart(lines: CartLine[]): CartTotals {
  let subtotal = 0;
  let discountTotal = 0;
  let taxTotal = 0;

  for (const line of lines) {
    const { gross, tax } = calculateLine(line);
    // Gross, not net: the cart shows each line at its VAT-inclusive price,
    // so summing net here produced a subtotal ~₱200 below the very rows it
    // sat under, which read as an arithmetic bug on screen.
    subtotal += gross;
    discountTotal += line.discount;
    taxTotal += tax;
  }

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    discountTotal: Math.round(discountTotal * 100) / 100,
    taxTotal: Math.round(taxTotal * 100) / 100,
    total: Math.round(subtotal * 100) / 100,
  };
}
