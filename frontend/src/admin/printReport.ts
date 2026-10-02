import { formatDate, formatDateTime } from '../regional';
import { escapeHtml as esc, PRINT_BASE_CSS, printHtml } from './printDocument';

export interface ReportColumn<T> {
  header: string;
  align?: 'left' | 'right' | 'center';
  /** Plain text — escaped here. */
  value: (row: T, index: number) => string | number | null | undefined;
  /** Bold and monospace are the only two looks a list needs. */
  bold?: boolean;
  mono?: boolean;
}

export interface ReportOptions<T> {
  title: string;
  companyName: string | null;
  /** Right-hand line under the date: a branch, or "All branches". */
  subtitle: string;
  /** "Status: Active · Search: "dela"" — whatever narrowed the list. */
  filters: string[];
  stats: { label: string; value: string }[];
  columns: ReportColumn<T>[];
  rows: T[];
  /** One closing row, aligned to the columns; '' leaves a cell empty. */
  footer?: string[];
  printedBy: string | null;
  currency: string | null | undefined;
}

const CSS = `
  ${PRINT_BASE_CSS}
  .head { display: flex; justify-content: space-between; align-items: flex-end; gap: 24px; padding-bottom: 12px; border-bottom: 2px solid #1c2430; margin-bottom: 12px; }
  .head h1 { margin: 0; font-size: 20px; }
  .head .company { font-weight: 700; font-size: 13px; }
  .head .right { text-align: right; }
  .filters { margin-bottom: 12px; }
  .chip { display: inline-block; margin: 0 6px 4px 0; padding: 2px 9px; border: 1px solid #c6ced9; border-radius: 999px; font-size: 10px; }
  .stats { display: grid; border: 1px solid #d5dbe3; border-radius: 6px; overflow: hidden; margin-bottom: 14px; }
  .stats div { padding: 8px 10px; border-right: 1px solid #d5dbe3; }
  .stats div:last-child { border-right: 0; }
  .stats b { display: block; font-size: 9.5px; text-transform: uppercase; letter-spacing: .06em; color: #5b6677; }
  .stats span { font-size: 15px; font-weight: 800; }
  .foot { margin-top: 22px; font-size: 9.5px; color: #7a8595; display: flex; justify-content: space-between; }
`;

/**
 * A list page as an A4 report (Returns, Customers): header with company and
 * date, the active filters, a row of figures, then the table. Same look as
 * the inventory and purchase order printouts; the print dialog's "Save as
 * PDF" makes the PDF.
 */
export function printReport<T>(o: ReportOptions<T>): void {
  const cls = (c: ReportColumn<T>) => [c.align === 'right' ? 'r' : c.align === 'center' ? 'c' : '', c.mono ? 'mono' : ''].filter(Boolean).join(' ');
  const cell = (c: ReportColumn<T>, row: T, i: number) => {
    const text = esc(c.value(row, i) ?? '');
    return `<td class="${cls(c)}">${c.bold ? `<b>${text}</b>` : text}</td>`;
  };

  const html = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>${esc(o.title)} - ${esc(o.subtitle)} - ${esc(formatDate(new Date(), o.currency))}</title><style>${CSS}</style></head>
<body>
  <div class="head">
    <div>
      ${o.companyName ? `<div class="company">${esc(o.companyName)}</div>` : ''}
      <h1>${esc(o.title)}</h1>
    </div>
    <div class="right muted">
      <div><b style="color:#1c2430">${esc(o.subtitle)}</b></div>
      <div>As of ${esc(formatDateTime(new Date(), o.currency))}</div>
    </div>
  </div>
  ${o.filters.length ? `<div class="filters">${o.filters.map((f) => `<span class="chip">${esc(f)}</span>`).join('')}</div>` : ''}
  ${
    o.stats.length
      ? `<div class="stats" style="grid-template-columns: repeat(${o.stats.length}, 1fr)">${o.stats
          .map((s) => `<div><b>${esc(s.label)}</b><span>${esc(s.value)}</span></div>`)
          .join('')}</div>`
      : ''
  }
  <table>
    <thead><tr>${o.columns.map((c) => `<th class="${cls(c)}">${esc(c.header)}</th>`).join('')}</tr></thead>
    <tbody>${
      o.rows.length
        ? o.rows.map((row, i) => `<tr>${o.columns.map((c) => cell(c, row, i)).join('')}</tr>`).join('')
        : `<tr><td colspan="${o.columns.length}" class="c muted">Nothing to show for these filters.</td></tr>`
    }</tbody>
    ${o.footer ? `<tfoot><tr>${o.footer.map((f, i) => `<td class="${cls(o.columns[i])}">${esc(f)}</td>`).join('')}</tr></tfoot>` : ''}
  </table>
  <div class="foot">
    <span>${o.printedBy ? `Printed by ${esc(o.printedBy)}` : ''}</span>
    <span>${esc(o.title)} · ${o.rows.length} row${o.rows.length === 1 ? '' : 's'}</span>
  </div>
</body>
</html>`;

  printHtml(html);
}
