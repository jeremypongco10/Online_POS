import { assetUrl } from '../api/client';
import type { PurchaseOrderDetail } from '../api/types';
import { formatMoney } from '../pos/format';
import { currencySymbol, formatDate, formatDateTime } from '../regional';
import { formatQty, num, PO_STATUS_META } from './purchaseOrderUtils';
import { poBarcodeSvg } from './barcodeSvg';
import { escapeHtml, printHtml } from './printDocument';

const esc = escapeHtml;

const line = (value: string | null | undefined) => (value ? `<div>${esc(value)}</div>` : '');

/**
 * The PO as a standalone A4 document. Built as its own HTML page and
 * printed from a hidden iframe rather than through the app's own
 * window.print(): the app's global print styles are tuned for 80mm
 * receipts, and an isolated document can't be affected by them. The
 * browser's print dialog offers "Save as PDF" as a destination, and the
 * document title becomes the suggested file name.
 */
export function buildPurchaseOrderHtml(po: PurchaseOrderDetail, currency: string | null | undefined): string {
  const symbol = currencySymbol(currency);
  const money = (v: string | number) => `${esc(symbol)}${formatMoney(num(v))}`;
  const company = po.company;
  const supplier = po.supplier;
  const store = po.store;
  const status = PO_STATUS_META[po.status];
  const watermark = po.status === 'draft' ? 'DRAFT' : po.status === 'cancelled' ? 'CANCELLED' : '';
  // Scanning this on the Purchase Orders screen opens the order straight away (see useBarcodeScanner).
  let barcode: string;
  try {
    barcode = poBarcodeSvg(po.po_number);
  } catch {
    barcode = `<div style="font-family:Consolas,monospace;font-weight:700;font-size:14px">${esc(po.po_number)}</div>`;
  }
  const logo = company?.logo_path ? `<img class="logo" src="${esc(assetUrl(company.logo_path))}" alt="">` : '';

  const rows = po.items
    .map(
      (item, i) => `
      <tr>
        <td class="c">${i + 1}</td>
        <td class="mono">${esc(item.product_sku ?? '')}</td>
        <td>${esc(item.product_name ?? `Product #${item.product_id}`)}</td>
        <td class="r">${esc(formatQty(item.quantity))}</td>
        <td class="c">${esc(item.unit_abbreviation ?? '')}</td>
        <td class="r">${money(item.unit_cost)}</td>
        <td class="r">${money(item.line_total)}</td>
      </tr>`
    )
    .join('');

  const totalQty = po.items.reduce((sum, item) => sum + num(item.quantity), 0);

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${esc(po.po_number)}</title>
<style>
  @page { size: A4; margin: 14mm 14mm 16mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1c2430; font-size: 11.5px; line-height: 1.45; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; padding-bottom: 14px; border-bottom: 2px solid #1c2430; }
  .brand { display: flex; gap: 12px; align-items: flex-start; }
  .logo { max-height: 56px; max-width: 140px; object-fit: contain; }
  .brand h1 { margin: 0 0 2px; font-size: 18px; }
  .brand .legal { font-weight: 600; color: #4a5566; }
  .muted { color: #5b6677; }
  .doc { text-align: right; }
  .doc .title { font-size: 22px; font-weight: 800; letter-spacing: .04em; margin: 0; }
  .doc .barcode { margin-top: 8px; line-height: 0; }
  .doc .barcode svg { display: inline-block; max-width: 220px; height: auto; }
  .badge { display: inline-block; margin-top: 6px; padding: 2px 10px; border-radius: 999px; border: 1px solid #1c2430; font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; }
  .meta { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0; margin: 14px 0; border: 1px solid #d5dbe3; border-radius: 6px; overflow: hidden; }
  .meta div { padding: 7px 10px; border-right: 1px solid #d5dbe3; }
  .meta div:last-child { border-right: 0; }
  .meta b { display: block; font-size: 9.5px; text-transform: uppercase; letter-spacing: .06em; color: #5b6677; font-weight: 700; }
  .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px; }
  .box { border: 1px solid #d5dbe3; border-radius: 6px; padding: 10px 12px; }
  .box h3 { margin: 0 0 6px; font-size: 9.5px; text-transform: uppercase; letter-spacing: .08em; color: #5b6677; }
  .box .name { font-size: 13px; font-weight: 700; }
  table { width: 100%; border-collapse: collapse; }
  thead th { background: #eef1f5; font-size: 9.5px; text-transform: uppercase; letter-spacing: .05em; color: #3d4757; text-align: left; padding: 7px 8px; border-bottom: 1px solid #c6ced9; }
  tbody td { padding: 7px 8px; border-bottom: 1px solid #e3e7ed; vertical-align: top; }
  tfoot td { padding: 8px; font-weight: 700; background: #eef1f5; border-top: 1px solid #c6ced9; }
  tr { page-break-inside: avoid; }
  .r { text-align: right; white-space: nowrap; }
  .c { text-align: center; }
  thead th.r { text-align: right; }
  thead th.c { text-align: center; }
  .mono { font-family: Consolas, "Courier New", monospace; font-size: 10.5px; }
  .bottom { display: flex; justify-content: space-between; gap: 24px; margin-top: 14px; }
  .notes { flex: 1; }
  .notes h3 { margin: 0 0 4px; font-size: 9.5px; text-transform: uppercase; letter-spacing: .08em; color: #5b6677; }
  .totals { width: 260px; }
  .totals div { display: flex; justify-content: space-between; padding: 4px 0; }
  .totals .grand { border-top: 2px solid #1c2430; margin-top: 4px; padding-top: 8px; font-size: 15px; font-weight: 800; }
  .sign { display: grid; grid-template-columns: repeat(3, 1fr); gap: 28px; margin-top: 48px; page-break-inside: avoid; }
  .sign div { border-top: 1px solid #1c2430; padding-top: 5px; }
  .sign b { display: block; }
  .foot { margin-top: 28px; font-size: 9.5px; color: #7a8595; display: flex; justify-content: space-between; }
  .watermark { position: fixed; top: 42%; left: 0; right: 0; text-align: center; font-size: 110px; font-weight: 900; color: rgba(200, 30, 30, .08); transform: rotate(-24deg); pointer-events: none; letter-spacing: .08em; }
</style>
</head>
<body>
  ${watermark ? `<div class="watermark">${watermark}</div>` : ''}
  <div class="head">
    <div class="brand">
      ${logo}
      <div>
        <h1>${esc(company?.trade_name ?? '')}</h1>
        ${company?.legal_name && company.legal_name !== company.trade_name ? `<div class="legal">${esc(company.legal_name)}</div>` : ''}
        <div class="muted">
          ${line(company?.address)}
          ${line([company?.phone, company?.email].filter(Boolean).join(' · '))}
          ${company?.tax_id ? `<div>TIN: ${esc(company.tax_id)}</div>` : ''}
        </div>
      </div>
    </div>
    <div class="doc">
      <p class="title">PURCHASE ORDER</p>
      <span class="badge">${esc(status.label)}</span>
      <div class="barcode">${barcode}</div>
    </div>
  </div>

  <div class="meta">
    <div><b>Order date</b>${esc(formatDate(po.order_date, currency))}</div>
    <div><b>Expected delivery</b>${esc(po.expected_date ? formatDate(po.expected_date, currency) : 'Not set')}</div>
    <div><b>Received</b>${esc(po.received_date ? formatDate(po.received_date, currency) : '—')}</div>
    <div><b>Items</b>${po.items.length} line${po.items.length === 1 ? '' : 's'} · ${esc(formatQty(totalQty))} units</div>
  </div>

  <div class="parties">
    <div class="box">
      <h3>Supplier</h3>
      <div class="name">${esc(supplier?.name ?? po.supplier_name ?? '')}</div>
      <div class="muted">
        ${supplier?.contact_name ? `<div>Attn: ${esc(supplier.contact_name)}</div>` : ''}
        ${line(supplier?.address)}
        ${line([supplier?.phone, supplier?.email].filter(Boolean).join(' · '))}
        ${supplier?.tax_id ? `<div>TIN: ${esc(supplier.tax_id)}</div>` : ''}
      </div>
    </div>
    <div class="box">
      <h3>Deliver to</h3>
      <div class="name">${esc(store?.name ?? po.store_name ?? '')}${store?.code ? ` <span class="muted">(${esc(store.code)})</span>` : ''}</div>
      <div class="muted">
        ${line(store?.address)}
        ${line([store?.phone, store?.email].filter(Boolean).join(' · '))}
      </div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th class="c" style="width:28px">#</th>
        <th style="width:90px">SKU</th>
        <th>Description</th>
        <th class="r" style="width:56px">Qty</th>
        <th class="c" style="width:44px">Unit</th>
        <th class="r" style="width:84px">Unit cost</th>
        <th class="r" style="width:96px">Amount</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
    <tfoot>
      <tr>
        <td colspan="3" class="r">Total quantity</td>
        <td class="r">${esc(formatQty(totalQty))}</td>
        <td colspan="3"></td>
      </tr>
    </tfoot>
  </table>

  <div class="bottom">
    <div class="notes">
      ${po.notes ? `<h3>Notes</h3><div>${esc(po.notes)}</div>` : ''}
    </div>
    <div class="totals">
      <div class="grand"><span>Total</span><span>${money(po.total)}</span></div>
    </div>
  </div>

  <div class="sign">
    <div><b>Prepared by</b><span class="muted">${esc(po.created_by_name ?? '')}</span></div>
    <div><b>Approved by</b><span class="muted">${esc(po.approved_by_name ?? '')}</span></div>
    <div><b>Received by</b><span class="muted">&nbsp;</span></div>
  </div>

  <div class="foot">
    <span>${esc(company?.trade_name ?? '')} · ${esc(po.po_number)}</span>
    <span>Printed ${esc(formatDateTime(new Date(), currency))}</span>
  </div>
</body>
</html>`;
}

export function printPurchaseOrder(po: PurchaseOrderDetail, currency: string | null | undefined): void {
  printHtml(buildPurchaseOrderHtml(po, currency));
}
