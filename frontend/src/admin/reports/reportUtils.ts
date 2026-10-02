import type { ReactNode } from 'react';
import { formatMoney } from '../../pos/format';
import { currencySymbol } from '../../regional';
import { exportCsv, exportExcel, exportFileName } from '../exportTable';
import { printReport } from '../printReport';

/** One column of a report: how it shows on screen and what it exports as. */
export interface ReportColumn<T> {
  key: string;
  label: string;
  align?: 'left' | 'right';
  /** money / number cells are right-aligned and formatted; exports keep them as real numbers. */
  kind?: 'text' | 'number' | 'money';
  /** On-screen cell. Defaults to the formatted value. */
  render?: (row: T) => ReactNode;
  /** Plain value for display defaults and exports. Defaults to row[key]. */
  value?: (row: T) => string | number | null | undefined;
  /** Excel column width, in characters. */
  width?: number;
  /** Left out of exports (e.g. a share-of-total bar). */
  screenOnly?: boolean;
}

export const num = (v: unknown): number => {
  const x = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
  return Number.isFinite(x) ? x : 0;
};

/** Sums a numeric field across rows, for totals rows and cards. */
export function sumOf<T>(rows: T[], pick: (row: T) => unknown): number {
  return rows.reduce((total, r) => total + num(pick(r)), 0);
}

export const qtyText = (v: unknown): string => {
  const x = num(v);
  return Number.isInteger(x) ? x.toLocaleString() : (Math.round(x * 1000) / 1000).toLocaleString();
};

export function cellValue<T>(col: ReportColumn<T>, row: T): string | number | null | undefined {
  if (col.value) return col.value(row);
  const raw = (row as Record<string, unknown>)[col.key];
  if (raw === null || raw === undefined) return null;
  if (col.kind === 'money' || col.kind === 'number') return num(raw);
  return String(raw);
}

/** The text a cell shows when it has no custom render. */
export function cellText<T>(col: ReportColumn<T>, row: T): string {
  const v = cellValue(col, row);
  if (v === null || v === undefined || v === '') return '—';
  if (col.kind === 'money') return formatMoney(num(v));
  if (col.kind === 'number') return qtyText(v);
  return String(v);
}

export function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export interface DateRange {
  from: string;
  to: string;
}

/** Quick picks above every report. `all` leaves both dates empty. */
export const RANGE_PRESETS: { key: string; label: string; range: () => DateRange }[] = [
  { key: 'today', label: 'Today', range: () => ({ from: iso(new Date()), to: iso(new Date()) }) },
  {
    key: 'yesterday',
    label: 'Yesterday',
    range: () => {
      const d = new Date(Date.now() - 86_400_000);
      return { from: iso(d), to: iso(d) };
    },
  },
  { key: '7d', label: 'Last 7 days', range: () => ({ from: iso(new Date(Date.now() - 6 * 86_400_000)), to: iso(new Date()) }) },
  { key: '30d', label: 'Last 30 days', range: () => ({ from: iso(new Date(Date.now() - 29 * 86_400_000)), to: iso(new Date()) }) },
  {
    key: 'month',
    label: 'This month',
    range: () => {
      const d = new Date();
      return { from: iso(new Date(d.getFullYear(), d.getMonth(), 1)), to: iso(d) };
    },
  },
  {
    key: 'last-month',
    label: 'Last month',
    range: () => {
      const d = new Date();
      return { from: iso(new Date(d.getFullYear(), d.getMonth() - 1, 1)), to: iso(new Date(d.getFullYear(), d.getMonth(), 0)) };
    },
  },
  {
    key: 'year',
    label: 'This year',
    range: () => {
      const d = new Date();
      return { from: iso(new Date(d.getFullYear(), 0, 1)), to: iso(d) };
    },
  },
  { key: 'all', label: 'All time', range: () => ({ from: '', to: '' }) },
];

export const defaultRange = (): DateRange => RANGE_PRESETS.find((p) => p.key === 'month')!.range();

export function rangeLabel(r: DateRange): string {
  const preset = RANGE_PRESETS.find((p) => {
    const v = p.range();
    return v.from === r.from && v.to === r.to;
  });
  if (preset) return preset.label;
  if (!r.from && !r.to) return 'All time';
  return `${r.from || '…'} to ${r.to || '…'}`;
}

export interface ExportSpec<T> {
  /** "Sales by cashier" — the document and sheet title. */
  title: string;
  /** Branch, or "All branches". */
  subtitle: string;
  range: DateRange;
  /** Any other filter worth printing ("Category: Beverages"). */
  filters?: string[];
  stats?: { label: string; value: string }[];
  columns: ReportColumn<T>[];
  rows: T[];
  /** A closing totals row, keyed by column key. */
  totals?: Partial<Record<string, string | number>>;
  printedBy: string | null;
  currency: string | null | undefined;
}

/** Excel, CSV or a printable PDF of whatever report is on screen — one path for every report. */
export async function exportReport<T>(format: 'xlsx' | 'csv' | 'pdf', spec: ExportSpec<T>): Promise<void> {
  const cols = spec.columns.filter((c) => !c.screenOnly);
  const filters = [`Dates: ${rangeLabel(spec.range)}`, ...(spec.filters ?? [])];
  const fileName = exportFileName(spec.title, spec.subtitle, spec.range.from || 'all', spec.range.to || '');
  const symbol = currencySymbol(spec.currency);

  const exportCols = cols.map((c) => ({
    header: c.label,
    width: c.width ?? (c.kind === 'money' ? 14 : c.kind === 'number' ? 10 : 22),
    kind: c.kind,
    value: (row: T) => cellValue(c, row),
  }));

  if (format === 'csv') {
    exportCsv(spec.rows, exportCols, fileName);
    return;
  }
  if (format === 'xlsx') {
    await exportExcel(spec.rows, exportCols, fileName, spec.title, [spec.title, `${spec.subtitle} · ${rangeLabel(spec.range)}`, ...(spec.filters ?? [])]);
    return;
  }

  const footer = spec.totals
    ? cols.map((c, i) => {
        const v = spec.totals![c.key];
        if (v === undefined) return i === 0 ? 'Total' : '';
        if (c.kind === 'money') return `${symbol}${formatMoney(num(v))}`;
        if (c.kind === 'number') return qtyText(v);
        return String(v);
      })
    : undefined;

  printReport({
    title: spec.title,
    companyName: null,
    subtitle: spec.subtitle,
    filters,
    stats: spec.stats ?? [],
    columns: cols.map((c) => ({
      header: c.label,
      align: c.align ?? (c.kind === 'money' || c.kind === 'number' ? 'right' : 'left'),
      bold: c.kind === 'money' && c === cols[cols.length - 1],
      value: (row: T) => {
        const v = cellValue(c, row);
        if (v === null || v === undefined || v === '') return '—';
        if (c.kind === 'money') return `${symbol}${formatMoney(num(v))}`;
        if (c.kind === 'number') return qtyText(v);
        return v;
      },
    })),
    rows: spec.rows,
    footer,
    printedBy: spec.printedBy,
    currency: spec.currency,
  });
}
