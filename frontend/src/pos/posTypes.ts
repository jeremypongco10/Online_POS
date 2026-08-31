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

/** Client-side preview only — mirrors TaxService's exclusive-pricing math; the server remains authoritative. */
export function calculateLine(line: CartLine): LineTotals {
  const base = line.quantity * line.unitPrice - line.discount;
  const rate = line.taxRate ? parseFloat(line.taxRate.rate) : 0;
  const tax = Math.round(base * (rate / 100) * 100) / 100;
  return { net: base, tax, gross: base + tax };
}

export interface CartTotals {
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
}

export function calculateCart(lines: CartLine[]): CartTotals {
  let subtotal = 0;
  let discountTotal = 0;
  let taxTotal = 0;

  for (const line of lines) {
    const { net, tax } = calculateLine(line);
    subtotal += net;
    discountTotal += line.discount;
    taxTotal += tax;
  }

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    discountTotal: Math.round(discountTotal * 100) / 100,
    taxTotal: Math.round(taxTotal * 100) / 100,
    total: Math.round((subtotal + taxTotal) * 100) / 100,
  };
}
