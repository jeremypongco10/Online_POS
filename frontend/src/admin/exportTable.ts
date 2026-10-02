import { downloadCsv, toCsv } from './csv';

export interface ExportColumn<T> {
  header: string;
  /** Excel column width, in characters. */
  width?: number;
  /** 'money' and 'number' are written as real numbers, so totals and sorting work in Excel. */
  kind?: 'text' | 'number' | 'money';
  value: (row: T) => string | number | null | undefined;
}

/** "products-puregold-dau-2026-10-01" — safe on every OS, sorts by date in a downloads folder. */
export function exportFileName(...parts: string[]): string {
  const d = new Date();
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return [...parts, date]
    .filter(Boolean)
    .join('-')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function exportCsv<T>(rows: T[], columns: ExportColumn<T>[], fileName: string): void {
  const body = rows.map((row) =>
    columns.map((c) => {
      const v = c.value(row);
      return v === undefined ? null : v;
    })
  );
  // The BOM makes Excel open the file as UTF-8, so "₱" and "ñ" survive.
  downloadCsv(`${fileName}.csv`, '﻿' + toCsv(columns.map((c) => c.header), body));
}

/**
 * A real .xlsx: frozen bold header row, numbers stored as numbers, money
 * formatted to two decimals. The writer library is loaded only when
 * someone actually exports, so it adds nothing to the app's normal load.
 * `title` lines go above the table (company, branch, date).
 */
export async function exportExcel<T>(rows: T[], columns: ExportColumn<T>[], fileName: string, sheet: string, title: string[] = []): Promise<void> {
  const { default: writeXlsxFile } = await import('write-excel-file');

  const titleRows = title.map((line, i) => [
    { value: line, fontWeight: i === 0 ? ('bold' as const) : undefined, fontSize: i === 0 ? 14 : 11, span: columns.length },
    ...columns.slice(1).map(() => null),
  ]);
  const spacer = title.length ? [columns.map(() => null)] : [];
  const header = columns.map((c) => ({
    value: c.header,
    fontWeight: 'bold' as const,
    backgroundColor: '#EEF1F5',
    bottomBorderStyle: 'thin' as const,
    align: c.kind === 'money' || c.kind === 'number' ? ('right' as const) : undefined,
  }));
  const body = rows.map((row) =>
    columns.map((c) => {
      const v = c.value(row);
      if (v === null || v === undefined || v === '') return null;
      if (c.kind === 'money' || c.kind === 'number') {
        const num = typeof v === 'number' ? v : parseFloat(v);
        if (!Number.isFinite(num)) return { value: String(v) };
        return { value: num, type: Number, format: c.kind === 'money' ? '#,##0.00' : '#,##0.####' };
      }
      return { value: String(v) };
    })
  );

  await writeXlsxFile([...titleRows, ...spacer, header, ...body], {
    fileName: `${fileName}.xlsx`,
    sheet: sheet.slice(0, 31),
    columns: columns.map((c) => ({ width: c.width ?? 14 })),
    stickyRowsCount: titleRows.length + spacer.length + 1,
  });
}
