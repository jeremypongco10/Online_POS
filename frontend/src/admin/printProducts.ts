import { assetUrl } from '../api/client';
import type { CatalogProduct } from '../api/types';
import { formatMoney } from '../pos/format';
import { currencySymbol, formatDate, formatDateTime } from '../regional';
import { escapeHtml as esc, PRINT_BASE_CSS, printHtml } from './printDocument';

export interface ProductPrintHeader {
  companyName: string | null;
  branch: string;
  filters: string[];
  printedBy: string | null;
  currency: string | null | undefined;
}

const num = (v: string | number | null | undefined) => {
  const n = typeof v === 'number' ? v : parseFloat(v ?? '');
  return Number.isFinite(n) ? n : null;
};
const qty = (v: string | number | null | undefined) => String(parseFloat((num(v) ?? 0).toFixed(4)));

/** Gross margin as a share of the selling price, or null when either price is missing. */
export function marginPercent(p: Pick<CatalogProduct, 'cost_price' | 'selling_price'>): number | null {
  const cost = num(p.cost_price);
  const price = num(p.selling_price);
  if (cost === null || price === null || price === 0) return null;
  return ((price - cost) / price) * 100;
}

const CSS = `
  ${PRINT_BASE_CSS}
  .head { display: flex; justify-content: space-between; align-items: flex-end; gap: 24px; padding-bottom: 12px; border-bottom: 2px solid #1c2430; margin-bottom: 12px; }
  .head h1 { margin: 0; font-size: 20px; }
  .head .company { font-weight: 700; font-size: 13px; }
  .head .right { text-align: right; }
  .chip { display: inline-block; margin: 0 6px 10px 0; padding: 2px 9px; border: 1px solid #c6ced9; border-radius: 999px; font-size: 10px; }
  .cat { margin: 16px 0 6px; font-size: 13px; font-weight: 800; border-bottom: 1px solid #c6ced9; padding-bottom: 4px; page-break-after: avoid; }
  .price { font-weight: 800; }
  .inactive { color: #8a94a3; }
  .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
  .card { border: 1px solid #d5dbe3; border-radius: 8px; padding: 8px; page-break-inside: avoid; }
  .photo { height: 110px; display: flex; align-items: center; justify-content: center; background: #f4f6f9; border-radius: 6px; margin-bottom: 6px; overflow: hidden; }
  .photo img { max-width: 100%; max-height: 110px; object-fit: contain; }
  .photo span { color: #9aa3b0; font-size: 10px; }
  .card .name { font-weight: 700; font-size: 11px; line-height: 1.3; min-height: 28px; }
  .card .row { display: flex; justify-content: space-between; align-items: baseline; margin-top: 4px; }
  .foot { margin-top: 22px; font-size: 9.5px; color: #7a8595; display: flex; justify-content: space-between; }
`;

function wrap(title: string, h: ProductPrintHeader, body: string): string {
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>${esc(title)} - ${esc(h.branch)} - ${esc(formatDate(new Date(), h.currency))}</title><style>${CSS}</style></head>
<body>
  <div class="head">
    <div>${h.companyName ? `<div class="company">${esc(h.companyName)}</div>` : ''}<h1>${esc(title)}</h1></div>
    <div class="right muted"><div><b style="color:#1c2430">${esc(h.branch)}</b></div><div>As of ${esc(formatDateTime(new Date(), h.currency))}</div></div>
  </div>
  ${h.filters.map((f) => `<span class="chip">${esc(f)}</span>`).join('')}
  ${body}
  <div class="foot"><span>${h.printedBy ? `Printed by ${esc(h.printedBy)}` : ''}</span><span>${esc(title)} · ${esc(h.branch)}</span></div>
</body>
</html>`;
}

/** Internal list: cost, price, margin and stock — for managers, not for customers. */
export function printProductList(rows: CatalogProduct[], h: ProductPrintHeader) {
  const symbol = currencySymbol(h.currency);
  const money = (v: string | null) => (num(v) === null ? '—' : `${esc(symbol)}${formatMoney(num(v) as number)}`);
  const body = rows
    .map((p, i) => {
      const margin = marginPercent(p);
      return `<tr class="${Number(p.is_active) === 1 ? '' : 'inactive'}">
        <td class="c">${i + 1}</td>
        <td class="mono">${esc(p.sku)}${p.barcode ? `<div class="muted">${esc(p.barcode)}</div>` : ''}</td>
        <td>${esc(p.name)}${Number(p.is_active) === 1 ? '' : ' <i>(inactive)</i>'}</td>
        <td>${esc(p.category_name ?? '—')}</td>
        <td class="c">${esc(p.unit ?? '')}</td>
        <td class="r">${money(p.cost_price)}</td>
        <td class="r price">${money(p.selling_price)}</td>
        <td class="r">${margin === null ? '—' : `${margin.toFixed(1)}%`}</td>
        <td class="r">${Number(p.track_inventory) === 1 ? esc(qty(p.stock_quantity)) : '<span class="muted">n/a</span>'}</td>
      </tr>`;
    })
    .join('');

  printHtml(
    wrap(
      'Product list',
      h,
      `<table>
        <thead><tr>
          <th class="c" style="width:26px">#</th><th style="width:96px">SKU / barcode</th><th>Product</th><th style="width:100px">Category</th>
          <th class="c" style="width:40px">Unit</th><th class="r" style="width:70px">Cost</th><th class="r" style="width:74px">Price</th>
          <th class="r" style="width:52px">Margin</th><th class="r" style="width:50px">Stock</th>
        </tr></thead>
        <tbody>${body || '<tr><td colspan="9" class="c muted">No products match.</td></tr>'}</tbody>
        <tfoot><tr><td colspan="9">${rows.length} product${rows.length === 1 ? '' : 's'}</td></tr></tfoot>
      </table>`
    )
  );
}

/** Customer-facing: active products with a price, grouped by category — no costs, no stock. */
export function printPriceList(rows: CatalogProduct[], h: ProductPrintHeader) {
  const symbol = currencySymbol(h.currency);
  const sellable = rows.filter((p) => Number(p.is_active) === 1 && num(p.selling_price) !== null);
  const groups = new Map<string, CatalogProduct[]>();
  for (const p of sellable) {
    const key = p.category_name ?? 'Other';
    groups.set(key, [...(groups.get(key) ?? []), p]);
  }
  const sections = [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(
      ([category, items]) => `<div class="cat">${esc(category)}</div>
        <table><tbody>${items
          .map(
            (p) => `<tr><td>${esc(p.name)}</td><td class="mono muted" style="width:110px">${esc(p.sku)}</td><td class="c" style="width:44px">${esc(p.unit ?? '')}</td><td class="r price" style="width:90px">${esc(symbol)}${formatMoney(num(p.selling_price) as number)}</td></tr>`
          )
          .join('')}</tbody></table>`
    )
    .join('');

  printHtml(wrap('Price list', h, sections || '<p class="muted">No priced, active products match.</p>'));
}

/** Photo catalog — four cards across, for a supplier meeting or a shelf-labelling check. */
export function printPhotoCatalog(rows: CatalogProduct[], h: ProductPrintHeader) {
  const symbol = currencySymbol(h.currency);
  const cards = rows
    .map(
      (p) => `<div class="card">
        <div class="photo">${p.image_path ? `<img src="${esc(assetUrl(p.image_path))}" alt="">` : '<span>No photo</span>'}</div>
        <div class="name">${esc(p.name)}</div>
        <div class="row"><span class="mono muted">${esc(p.sku)}</span><span class="price">${num(p.selling_price) === null ? '—' : `${esc(symbol)}${formatMoney(num(p.selling_price) as number)}`}</span></div>
      </div>`
    )
    .join('');
  printHtml(wrap('Product catalog', h, `<div class="grid">${cards || '<p class="muted">No products match.</p>'}</div>`));
}
