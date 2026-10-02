import type { InventoryMovement, InventoryStockRow, InventorySummary } from '../api/types';
import { formatMoney } from '../pos/format';
import { currencySymbol, formatDate, formatDateTime } from '../regional';
import { escapeHtml as esc, PRINT_BASE_CSS, printHtml } from './printDocument';
import { fmtDelta, fmtQty, MOVEMENT_META, n, stockStatus, STOCK_STATUS_META } from './inventoryUtils';

interface Header {
  title: string;
  companyName: string | null;
  branch: string;
  /** "Category: Beverages · Status: Low stock" — whatever narrowed the list, so the page says what it covers. */
  filters: string[];
  printedBy: string | null;
  currency: string | null | undefined;
}

const STATUS_COLOR = { in_stock: '#1e7d46', low: '#a86a00', out: '#b42318' } as const;

const DOC_CSS = `
  ${PRINT_BASE_CSS}
  .head { display: flex; justify-content: space-between; align-items: flex-end; gap: 24px; padding-bottom: 12px; border-bottom: 2px solid #1c2430; margin-bottom: 12px; }
  .head h1 { margin: 0; font-size: 20px; }
  .head .company { font-weight: 700; font-size: 13px; }
  .head .right { text-align: right; }
  .filters { margin-bottom: 12px; }
  .chip { display: inline-block; margin: 0 6px 4px 0; padding: 2px 9px; border: 1px solid #c6ced9; border-radius: 999px; font-size: 10px; }
  .stats { display: grid; grid-template-columns: repeat(4, 1fr); border: 1px solid #d5dbe3; border-radius: 6px; overflow: hidden; margin-bottom: 14px; }
  .stats div { padding: 8px 10px; border-right: 1px solid #d5dbe3; }
  .stats div:last-child { border-right: 0; }
  .stats b { display: block; font-size: 9.5px; text-transform: uppercase; letter-spacing: .06em; color: #5b6677; }
  .stats span { font-size: 15px; font-weight: 800; }
  .status { font-weight: 700; font-size: 10.5px; }
  .count-box { display: inline-block; width: 70px; height: 20px; border-bottom: 1px solid #1c2430; }
  .sign { display: grid; grid-template-columns: repeat(3, 1fr); gap: 28px; margin-top: 44px; page-break-inside: avoid; }
  .sign div { border-top: 1px solid #1c2430; padding-top: 5px; font-weight: 700; }
  .foot { margin-top: 22px; font-size: 9.5px; color: #7a8595; display: flex; justify-content: space-between; }
  .in { color: #1e7d46; font-weight: 700; }
  .out { color: #b42318; font-weight: 700; }
`;

function wrapDocument(header: Header, body: string): string {
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>${esc(header.title)} - ${esc(header.branch)} - ${esc(formatDate(new Date(), header.currency))}</title><style>${DOC_CSS}</style></head>
<body>
  <div class="head">
    <div>
      ${header.companyName ? `<div class="company">${esc(header.companyName)}</div>` : ''}
      <h1>${esc(header.title)}</h1>
    </div>
    <div class="right muted">
      <div><b style="color:#1c2430">${esc(header.branch)}</b></div>
      <div>As of ${esc(formatDateTime(new Date(), header.currency))}</div>
    </div>
  </div>
  ${header.filters.length ? `<div class="filters">${header.filters.map((f) => `<span class="chip">${esc(f)}</span>`).join('')}</div>` : ''}
  ${body}
  <div class="foot">
    <span>${header.printedBy ? `Printed by ${esc(header.printedBy)}` : ''}</span>
    <span>${esc(header.title)} · ${esc(header.branch)}</span>
  </div>
</body>
</html>`;
}

/** Everything on hand at one branch, with value at cost — the page a manager files or sends to head office. */
export function printStockReport(rows: InventoryStockRow[], summary: InventorySummary | null, header: Omit<Header, 'title'>) {
  const symbol = currencySymbol(header.currency);
  const money = (v: number) => `${esc(symbol)}${formatMoney(v)}`;
  let totalUnits = 0;
  let totalValue = 0;

  const body = rows
    .map((r, i) => {
      const qty = n(r.quantity);
      const value = Math.max(qty, 0) * n(r.cost_price);
      totalUnits += qty;
      totalValue += value;
      const status = stockStatus(qty, n(r.reorder_level));
      return `<tr>
        <td class="c">${i + 1}</td>
        <td class="mono">${esc(r.sku)}</td>
        <td>${esc(r.name)}</td>
        <td>${esc(r.category_name ?? '')}</td>
        <td class="r"><b>${esc(fmtQty(qty))}</b> ${esc(r.unit ?? '')}</td>
        <td class="r">${esc(fmtQty(r.reorder_level))}</td>
        <td class="status" style="color:${STATUS_COLOR[status]}">${esc(STOCK_STATUS_META[status].label)}</td>
        <td class="r">${r.cost_price === null ? '—' : money(n(r.cost_price))}</td>
        <td class="r">${money(value)}</td>
      </tr>`;
    })
    .join('');

  const stats = summary
    ? `<div class="stats">
        <div><b>Products</b><span>${rows.length}</span></div>
        <div><b>Units on hand</b><span>${esc(fmtQty(totalUnits))}</span></div>
        <div><b>Value at cost</b><span>${money(totalValue)}</span></div>
        <div><b>Low / out</b><span>${summary.low_count} / ${summary.out_count}</span></div>
      </div>`
    : '';

  printHtml(
    wrapDocument(
      { ...header, title: 'Stock on hand' },
      `${stats}
      <table>
        <thead><tr>
          <th class="c" style="width:26px">#</th><th style="width:86px">SKU</th><th>Product</th><th style="width:100px">Category</th>
          <th class="r" style="width:76px">On hand</th><th class="r" style="width:56px">Reorder</th><th style="width:64px">Status</th>
          <th class="r" style="width:70px">Unit cost</th><th class="r" style="width:84px">Value</th>
        </tr></thead>
        <tbody>${body || '<tr><td colspan="9" class="c muted">No products match.</td></tr>'}</tbody>
        <tfoot><tr><td colspan="4" class="r">Totals</td><td class="r">${esc(fmtQty(totalUnits))}</td><td colspan="3"></td><td class="r">${money(totalValue)}</td></tr></tfoot>
      </table>`
    )
  );
}

/**
 * A sheet to take to the shelf. "Blind" leaves out what the system
 * thinks is there, so whoever counts writes down what they actually see
 * instead of confirming the expected number.
 */
export function printCountSheet(rows: InventoryStockRow[], header: Omit<Header, 'title'>, blind: boolean) {
  const body = rows
    .map(
      (r, i) => `<tr>
        <td class="c">${i + 1}</td>
        <td class="mono">${esc(r.sku)}</td>
        <td>${esc(r.name)}${r.barcode ? `<div class="muted mono">${esc(r.barcode)}</div>` : ''}</td>
        <td>${esc(r.category_name ?? '')}</td>
        <td class="c">${esc(r.unit ?? '')}</td>
        ${blind ? '' : `<td class="r">${esc(fmtQty(r.quantity))}</td>`}
        <td class="c"><span class="count-box"></span></td>
        ${blind ? '' : '<td class="c"><span class="count-box"></span></td>'}
      </tr>`
    )
    .join('');

  printHtml(
    wrapDocument(
      { ...header, title: blind ? 'Stock count sheet (blind)' : 'Stock count sheet' },
      `<p class="muted" style="margin:0 0 10px">Count every item on the shelf and in the stock room, then enter the totals with Inventory → Adjust stock → Set counted.</p>
      <table>
        <thead><tr>
          <th class="c" style="width:26px">#</th><th style="width:90px">SKU</th><th>Product</th><th style="width:110px">Category</th><th class="c" style="width:44px">Unit</th>
          ${blind ? '' : '<th class="r" style="width:64px">System</th>'}
          <th class="c" style="width:84px">Counted</th>
          ${blind ? '' : '<th class="c" style="width:84px">Difference</th>'}
        </tr></thead>
        <tbody>${body || `<tr><td colspan="${blind ? 6 : 8}" class="c muted">No products match.</td></tr>`}</tbody>
      </table>
      <div class="sign"><div>Counted by</div><div>Checked by</div><div>Date</div></div>`
    )
  );
}

/** Every stock movement matching the screen's filters, with units in/out totals. */
export function printMovementsReport(rows: InventoryMovement[], header: Omit<Header, 'title'>, totals: { unitsIn: number; unitsOut: number }) {
  const body = rows
    .map((m) => {
      const qty = n(m.quantity);
      return `<tr>
        <td style="white-space:nowrap">${esc(formatDateTime(m.created_at, header.currency))}</td>
        <td>${esc(m.product_name ?? `#${m.product_id}`)}<div class="muted mono">${esc(m.product_sku ?? '')}</div></td>
        <td>${esc(m.store_name ?? '')}</td>
        <td>${esc(MOVEMENT_META[m.type]?.label ?? m.type)}</td>
        <td class="r ${qty >= 0 ? 'in' : 'out'}">${esc(fmtDelta(qty))}</td>
        <td class="r">${esc(fmtQty(m.balance_after))}</td>
        <td>${esc([m.reference_label, m.notes].filter(Boolean).join(' · '))}</td>
        <td>${esc(m.user_name ?? '')}</td>
      </tr>`;
    })
    .join('');

  printHtml(
    wrapDocument(
      { ...header, title: 'Stock movements' },
      `<div class="stats" style="grid-template-columns:repeat(3,1fr)">
        <div><b>Movements</b><span>${rows.length}</span></div>
        <div><b>Units in</b><span class="in">+${esc(fmtQty(totals.unitsIn))}</span></div>
        <div><b>Units out</b><span class="out">−${esc(fmtQty(totals.unitsOut))}</span></div>
      </div>
      <table>
        <thead><tr>
          <th style="width:104px">Date</th><th>Product</th><th style="width:96px">Branch</th><th style="width:74px">Type</th>
          <th class="r" style="width:52px">Qty</th><th class="r" style="width:56px">Balance</th><th>Reference / notes</th><th style="width:84px">By</th>
        </tr></thead>
        <tbody>${body || '<tr><td colspan="8" class="c muted">No movements match.</td></tr>'}</tbody>
      </table>`
    )
  );
}
