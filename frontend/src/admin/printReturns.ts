import type { ReturnItem, SalesReturn } from '../api/types';
import { formatMoney } from '../pos/format';
import { currencySymbol, formatDateTime } from '../regional';
import { escapeHtml as esc, PRINT_BASE_CSS, printHtml } from './printDocument';

const CSS = `
  ${PRINT_BASE_CSS}
  .head { display: flex; justify-content: space-between; align-items: flex-end; gap: 24px; padding-bottom: 12px; border-bottom: 2px solid #1c2430; margin-bottom: 14px; }
  .head h1 { margin: 0; font-size: 20px; }
  .head .company { font-weight: 700; font-size: 13px; }
  .head .num { font-size: 16px; font-weight: 800; text-align: right; }
  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px 18px; margin-bottom: 16px; }
  .grid b { display: block; font-size: 9.5px; text-transform: uppercase; letter-spacing: .06em; color: #5b6677; }
  .total { display: flex; justify-content: flex-end; gap: 24px; margin-top: 10px; font-size: 15px; font-weight: 800; }
  .sign { display: grid; grid-template-columns: repeat(3, 1fr); gap: 28px; margin-top: 54px; page-break-inside: avoid; }
  .sign div { border-top: 1px solid #1c2430; padding-top: 5px; font-weight: 700; }
  .sign span { display: block; font-weight: 400; color: #5b6677; }
`;

/** One return on paper, for the file or the customer: what came back, the refund, and who signed for it. */
export function printReturnSlip(
  ret: SalesReturn,
  items: ReturnItem[],
  opts: { companyName: string | null; currency: string | null | undefined; methodName: string }
): void {
  const symbol = currencySymbol(opts.currency);
  const money = (v: string | number) => `${esc(symbol)}${formatMoney(typeof v === 'number' ? v : parseFloat(v) || 0)}`;
  const field = (label: string, value: string | null | undefined) => `<div><b>${esc(label)}</b>${esc(value || '—')}</div>`;

  const rows = items
    .map(
      (it, i) => `<tr>
        <td class="c">${i + 1}</td>
        <td>${esc(it.product_name ?? `#${it.product_id}`)}</td>
        <td class="r">${esc(parseFloat(it.quantity))}</td>
        <td class="r">${money(it.unit_price)}</td>
        <td class="r">${money(it.refund_amount)}</td>
      </tr>`
    )
    .join('');

  const html = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>Return ${esc(ret.return_number)}</title><style>${CSS}</style></head>
<body>
  <div class="head">
    <div>
      ${opts.companyName ? `<div class="company">${esc(opts.companyName)}</div>` : ''}
      <h1>Return &amp; Refund</h1>
    </div>
    <div class="num">${esc(ret.return_number)}<div class="muted" style="font-size:11px;font-weight:400">${esc(formatDateTime(ret.return_date, opts.currency))}</div></div>
  </div>
  <div class="grid">
    ${field('Original invoice', ret.invoice_number ?? `Sale #${ret.sale_id}`)}
    ${field('Branch', ret.store_name)}
    ${field('Terminal', ret.register_name)}
    ${field('Reason', ret.reason)}
    ${field('Refund by', opts.methodName)}
    ${field('Status', ret.status === 'completed' ? 'Refunded' : ret.status === 'cancelled' ? 'Rejected' : 'Pending')}
  </div>
  <table>
    <thead><tr><th class="c">#</th><th>Item</th><th class="r">Qty</th><th class="r">Unit price</th><th class="r">Refund</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="total"><span>Total refund</span><span>${money(ret.total_refund)}</span></div>
  <div class="sign">
    <div>Processed by<span>${esc(ret.cashier_name ?? '')}</span></div>
    <div>Approved by<span>${esc(ret.approved_by_name ?? '')}</span></div>
    <div>Received by (customer)<span>&nbsp;</span></div>
  </div>
</body>
</html>`;

  printHtml(html);
}
