import type { Product, TaxRate, Unit } from '../api/types';
import { DISCOUNT_TYPE_BY_CODE, type DiscountTypeCode } from './discountTypes';

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
  /**
   * Which of discountTypes.ts's nine types `discount` came from — null/
   * undefined for no discount, or for a discount applied before this
   * feature existed (a held sale resumed from localStorage). Always
   * rendered as a plain "Discount" with no special handling in that
   * case, matching the server's own NULL-tolerant discount_type column.
   */
  discountType?: DiscountTypeCode | null;
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
  const def = line.discountType ? DISCOUNT_TYPE_BY_CODE[line.discountType] : null;

  if (def?.vatExempt) {
    // Senior Citizen / PWD: BIR RR 7-2010 backs VAT out of the FULL,
    // undiscounted price first, and only then takes the discount off
    // that VAT-exclusive base — the reverse of the ordinary order below
    // (discount first, VAT removed from what's left). No VAT is added
    // back afterward: the line is exempt. See TaxService::
    // calculateGovernmentDiscountLine's docblock for the worked example
    // this mirrors; `discount` itself is expected to already be the
    // 20%-of-net-before-discount amount (see previewGovernmentDiscount,
    // computed once when the type is selected in DiscountDialog).
    const grossBeforeDiscount = line.quantity * line.unitPrice;
    const rate = line.taxRate ? parseFloat(line.taxRate.rate) : 0;
    const netBeforeDiscount = rate > 0 ? grossBeforeDiscount / (1 + rate / 100) : grossBeforeDiscount;
    const net = Math.round((netBeforeDiscount - line.discount) * 100) / 100;
    return { net, tax: 0, gross: net };
  }

  const gross = line.quantity * line.unitPrice - line.discount;
  const rate = line.taxRate ? parseFloat(line.taxRate.rate) : 0;
  const net = rate > 0 ? gross / (1 + rate / 100) : gross;
  // Derive tax from the rounded net rather than rounding it independently,
  // so net + tax always reconciles back to gross to the centavo instead of
  // drifting a centavo off on some lines.
  const roundedNet = Math.round(net * 100) / 100;
  return { net: roundedNet, tax: Math.round((gross - roundedNet) * 100) / 100, gross };
}

/**
 * The BIR receipt flag for one cart line — overrides the line's own tax
 * rate to 'E' when a VAT-exempt discount type (Senior Citizen/PWD) is
 * active, since the exemption comes from the discount, not from the
 * product's own tax_rate_id. Every other line falls through to the
 * ordinary taxIndicatorFor(line.taxRate) in format.ts.
 */
export function lineTaxIndicator(line: CartLine): string {
  const def = line.discountType ? DISCOUNT_TYPE_BY_CODE[line.discountType] : null;
  return def?.vatExempt ? 'E' : line.taxRate?.indicator ?? 'N';
}

/**
 * Client-side preview of a government discount type's amount — the
 * exact peso figure the server will independently recompute at checkout
 * (TaxService::calculateGovernmentDiscountLine), shown in DiscountDialog
 * before the cashier confirms so there's never a surprise between what
 * the register shows and what actually gets charged. Returns 0 for a
 * non-government type (those are cashier-entered, not computed).
 */
export function previewGovernmentDiscount(quantity: number, unitPrice: number, taxRate: TaxRate | null, discountType: DiscountTypeCode): number {
  const def = DISCOUNT_TYPE_BY_CODE[discountType];
  if (def.fixedRatePercent === null) return 0;

  const grossBeforeDiscount = quantity * unitPrice;
  if (!def.vatExempt) {
    return Math.round(grossBeforeDiscount * def.fixedRatePercent) / 100;
  }

  const rate = taxRate ? parseFloat(taxRate.rate) : 0;
  const netBeforeDiscount = rate > 0 ? grossBeforeDiscount / (1 + rate / 100) : grossBeforeDiscount;
  return Math.round(netBeforeDiscount * def.fixedRatePercent) / 100;
}

export interface CartTotals {
  /** What was scanned, at shelf prices (VAT-inclusive), BEFORE any discount or VAT exemption — so the panel reads top to bottom as a subtraction the customer can follow. */
  subtotal: number;
  /**
   * The VAT the statutory exemption takes off Senior Citizen / PWD lines,
   * and 0 on every sale without one.
   *
   * It needs its own line because those lines lose value TWICE: the
   * exemption strips the VAT out of the shelf price, and the 20% comes
   * off what's left (see calculateLine). Without it, subtotal − discount
   * simply doesn't reach total on such a sale, which is exactly how this
   * panel used to read — Subtotal 60.00, Discount −15.00, Total 60.00 —
   * because `subtotal` was quietly the POST-discount figure.
   */
  vatExemptionTotal: number;
  discountTotal: number;
  /** VAT still contained within `total`, not added to it. Informational only — adding it would double-charge the tax. */
  taxTotal: number;
  /** subtotal − vatExemptionTotal − discountTotal, and equal to the sum of the line totals shown in the cart. Matches the server's `gross_amount` (SalesController::create). */
  total: number;
}

export function calculateCart(lines: CartLine[]): CartTotals {
  let subtotal = 0;
  let vatExemptionTotal = 0;
  let discountTotal = 0;
  let taxTotal = 0;
  let total = 0;

  for (const line of lines) {
    const { gross, tax } = calculateLine(line);
    const shelf = line.quantity * line.unitPrice;

    subtotal += shelf;
    discountTotal += line.discount;
    taxTotal += tax;
    total += gross;
    // Whatever a line lost that wasn't the discount is the VAT the
    // exemption removed — identically 0 for every ordinary line, since
    // there gross is exactly shelf − discount.
    vatExemptionTotal += shelf - gross - line.discount;
  }

  const round = (n: number) => Math.round(n * 100) / 100;

  return {
    subtotal: round(subtotal),
    vatExemptionTotal: round(vatExemptionTotal),
    discountTotal: round(discountTotal),
    taxTotal: round(taxTotal),
    total: round(total),
  };
}
