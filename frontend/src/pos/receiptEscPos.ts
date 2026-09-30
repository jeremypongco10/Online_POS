import type { PaymentMethodOption, Receipt } from '../api/types';
import { EscPosBuilder } from './escpos';
import { formatMoney, TAX_INDICATOR_LABELS } from './format';
import { currencySymbol, showsBirDetail, taxLabel } from '../regional';
import { discountTypeLabel } from './discountTypes';
import { METHOD_LABELS } from './PaymentPanel';

/** atob() gives a binary string (one char per byte, not UTF-16 text) — this is the standard browser-side base64-to-bytes conversion, no library needed for it. */
function decodeBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * The Bluetooth-printed equivalent of ReceiptModal — same fields, same
 * order, laid out as plain 32-column text instead of HTML. Kept as its
 * own function rather than "render ReceiptModal to a canvas and print the
 * image": an image would be far slower to transfer over BLE's small write
 * chunks (see bluetoothPrinter.ts) than a few hundred bytes of text, and
 * every cheap 58mm printer prints text natively without needing raster
 * mode at all.
 *
 * Not a byte-for-byte match of ReceiptModal — a 4-column item table
 * (name/qty/price/total) that fits a phone screen does not fit 32
 * characters, so each item gets two lines here instead of one row. Every
 * field ReceiptModal shows is still present; only the layout differs.
 */
export function buildReceiptEscPos(
  receipt: Receipt,
  methods: PaymentMethodOption[],
  taxSystem: string | null | undefined,
  currency: string | null | undefined
): Uint8Array {
  const tax = taxLabel(taxSystem);
  const showBir = showsBirDetail(taxSystem);
  // currencySymbol(null) falls back to '₱' unconditionally (its own
  // documented default) — passing the real currency matters here even
  // though the peso sign itself gets sanitized to 'P' on the wire, since
  // a PGK company's symbol is 'K', which is already plain ASCII and would
  // NOT be caught by that same substitution.
  const symbol = currencySymbol(currency);
  const methodLabel = (code: string) => methods.find((m) => m.code === code)?.name ?? METHOD_LABELS[code] ?? code;

  const p = new EscPosBuilder().init();

  if (receipt.is_training) {
    p.align('center').bold(true).line('*** TRAINING MODE ***').line('NOT A VALID INVOICE').bold(false);
    p.feed(1);
  } else if (receipt.is_reprint) {
    p.align('center').bold(true).line('*** REPRINT ***').bold(false);
    p.feed(1);
  }

  // Header — company/store identity, centered like ReceiptModal's letterhead.
  p.align('center');
  // Pre-converted server-side (see EscPosImageService) — already centered
  // within the printer's full width in its own pixels, so no align() call
  // is needed around it specifically (raster images ignore that command on
  // real firmware anyway; see EscPosBuilder.rasterImage's own docblock).
  if (receipt.company.logo_escpos) {
    const logo = receipt.company.logo_escpos;
    p.rasterImage(logo.width, logo.height, decodeBase64(logo.bytes_base64));
    p.feed(1);
  }
  if (receipt.company.name) p.bold(true).line(receipt.company.name).bold(false);
  if (receipt.company.tin) p.line(`TIN: ${receipt.company.tin}`);
  if (receipt.store.name) p.line(receipt.store.name);
  if (receipt.store.address) p.wrapped(receipt.store.address);
  if (receipt.store.vat_reg_tin) p.line(`VAT REG TIN: ${receipt.store.vat_reg_tin}`);
  if (receipt.store.min_no) p.line(`MIN: ${receipt.store.min_no}`);
  if (receipt.store.pos_serial_no) p.line(`S/N: ${receipt.store.pos_serial_no}`);
  if (receipt.store.ptu_number) p.line(`PTU No: ${receipt.store.ptu_number}`);
  p.align('left').divider();

  // Transaction identity.
  p.twoCol('Invoice #', receipt.invoice_number);
  if (receipt.transaction_no !== null) p.twoCol('Transaction #', receipt.transaction_no);
  p.twoCol('Date', receipt.date);
  p.twoCol('Cashier', receipt.cashier ?? '-');
  if (receipt.bagger) p.twoCol('Bagger', receipt.bagger);
  if (receipt.customer) p.twoCol('Customer', receipt.customer);
  if (receipt.loyalty_card_number) p.twoCol('Loyalty Card', receipt.loyalty_card_number);
  if (receipt.discount_holder_name) p.twoCol('SC/PWD Name', receipt.discount_holder_name);
  if (receipt.discount_id_number) p.twoCol('SC/PWD ID No.', receipt.discount_id_number);
  p.divider();

  // Sold To — same gate ReceiptModal uses: only when there's something registered to name.
  if (receipt.buyer.address || receipt.buyer.tin || receipt.buyer.business_style) {
    p.bold(true).line('SOLD TO').bold(false);
    if (receipt.buyer.name) p.twoCol('Name', receipt.buyer.name);
    if (receipt.buyer.address) p.wrapped(`Address: ${receipt.buyer.address}`);
    if (receipt.buyer.tin) p.twoCol('TIN', receipt.buyer.tin);
    if (receipt.buyer.business_style) p.twoCol('Biz Style', receipt.buyer.business_style);
    p.divider();
  }

  // Items — name (+ discount sub-line) on its own line, "qty x price" against the line total on the next, since a 4-column table doesn't fit 32 characters. showBir appends the V/E/Z/N flag after the item name, matching how ReceiptModal keeps it "hard against the amount it classifies" but here that's the only room there is for it.
  for (const item of receipt.items) {
    const flag = showBir ? ` [${item.tax_indicator}]` : '';
    p.line(`${item.name}${flag}`);
    if (parseFloat(item.discount) > 0 && discountTypeLabel(item.discount_type)) {
      p.line(`  ${discountTypeLabel(item.discount_type)} -${formatMoney(parseFloat(item.discount))}`);
    }
    p.twoCol(`  ${item.quantity} x ${formatMoney(parseFloat(item.unit_price))}`, formatMoney(parseFloat(item.line_total)));
  }
  p.divider();

  if (showBir) {
    const flags = [...new Set(receipt.items.map((i) => i.tax_indicator))]
      .map((flag) => `${flag}=${TAX_INDICATOR_LABELS[flag] ?? flag}`)
      .join(' ');
    p.wrapped(flags);
    p.feed(1);
  }

  p.twoCol('Subtotal', formatMoney(parseFloat(receipt.subtotal)));
  p.twoCol('Discount', `-${formatMoney(parseFloat(receipt.discount_total))}`);

  if (receipt.show_bir_details) {
    if (receipt.vatable_sales > 0) p.twoCol(`${tax}able Sales`, formatMoney(receipt.vatable_sales));
    if (receipt.vat_amount > 0) p.twoCol(tax, formatMoney(receipt.vat_amount));
    if (showBir && receipt.vat_exempt_amount > 0) p.twoCol('VAT Exempt', formatMoney(receipt.vat_exempt_amount));
    if (showBir && receipt.zero_rated_amount > 0) p.twoCol('Zero Rated', formatMoney(receipt.zero_rated_amount));
  }

  p.divider('=');
  p.bold(true).size(1, 2).twoCol('TOTAL', `${symbol}${formatMoney(parseFloat(receipt.total))}`).size(1, 1).bold(false);
  p.divider('=');

  for (const payment of receipt.payments) {
    p.twoCol(methodLabel(payment.method), formatMoney(parseFloat(payment.amount)));
  }
  p.twoCol('Change', formatMoney(parseFloat(receipt.change_due)));

  if (receipt.footer_note) {
    p.feed(1).align('center').wrapped(receipt.footer_note);
  }

  p.cutOrTear();

  return p.toBytes();
}
