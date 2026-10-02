import type { ReactNode } from 'react';
import Table from '@mui/material/Table';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableFooter from '@mui/material/TableFooter';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';
import { formatMoney } from '../../pos/format';
import { cellText, qtyText, type ReportColumn } from './reportUtils';

export type { ReportColumn } from './reportUtils';

interface Props<T> {
  columns: ReportColumn<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string | number;
  loading: boolean;
  emptyLabel?: string;
  /** A closing totals row, keyed by column key; the first column reads "Total" unless given. */
  totals?: Partial<Record<string, ReactNode | number>>;
  /** Shown under the table (paging, notes). */
  footer?: ReactNode;
}

const alignOf = <T,>(c: ReportColumn<T>) => c.align ?? (c.kind === 'money' || c.kind === 'number' ? 'right' : 'left');

/**
 * A report's read-only result table, in the same outlined, striped look as
 * every list page (see DataTable) — no sorting or paging of its own, since
 * the report endpoints return the whole result for the period.
 */
export function ReportTable<T>({ columns, rows, rowKey, loading, emptyLabel = 'No data for this period.', totals, footer }: Props<T>) {
  const headSx = {
    bgcolor: 'color-mix(in srgb, var(--mui-palette-primary-main) 8%, var(--mui-palette-background-paper))',
    '& th': { fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap', borderBottom: '1px solid', borderColor: 'divider' },
  };

  const totalCell = (c: ReportColumn<T>, i: number): ReactNode => {
    const v = totals?.[c.key];
    if (v === undefined) return i === 0 ? 'Total' : '';
    if (typeof v === 'number') return c.kind === 'money' ? formatMoney(v) : c.kind === 'number' ? qtyText(v) : v;
    return v;
  };

  return (
    <>
      <TableContainer sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '12px' }}>
        <Table>
          <TableHead sx={headSx}>
            <TableRow>
              {columns.map((col) => (
                <TableCell key={col.key} align={alignOf(col)}>
                  {col.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {columns.map((col) => (
                    <TableCell key={col.key} align={alignOf(col)}>
                      <Skeleton variant="text" sx={{ fontSize: 14 }} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} align="center" sx={{ py: 6, border: 0 }}>
                  <Stack sx={{ alignItems: 'center', gap: 1 }}>
                    <InboxOutlinedIcon sx={{ fontSize: 32, color: 'text.disabled' }} />
                    <Typography variant="body2" color="text.secondary">
                      {emptyLabel}
                    </Typography>
                  </Stack>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, i) => (
                <TableRow key={rowKey(row, i)} hover sx={totals ? undefined : { '&:last-of-type td': { borderBottom: 0 } }}>
                  {columns.map((col) => (
                    <TableCell
                      key={col.key}
                      align={alignOf(col)}
                      sx={col.kind === 'money' || col.kind === 'number' ? { fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' } : undefined}
                    >
                      {col.render ? col.render(row) : cellText(col, row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
          {totals && !loading && rows.length > 0 && (
            <TableFooter>
              <TableRow sx={{ '& td': { fontWeight: 800, fontSize: 14, color: 'text.primary', bgcolor: 'action.hover', borderBottom: 0, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' } }}>
                {columns.map((col, i) => (
                  <TableCell key={col.key} align={alignOf(col)}>
                    {totalCell(col, i)}
                  </TableCell>
                ))}
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </TableContainer>
      {footer}
    </>
  );
}
