import type { ReactNode } from 'react';
import Table from '@mui/material/Table';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';

export interface ReportColumn<T> {
  key: string;
  label: string;
  align?: 'left' | 'right';
  render?: (row: T) => ReactNode;
}

interface Props<T> {
  columns: ReportColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  loading: boolean;
  emptyLabel?: string;
  footer?: ReactNode;
}

/** A report's read-only result table — no sorting/pagination controls (the reports endpoints don't carry a total count), just the shared visual language from admin/DataTable. */
export function ReportTable<T>({ columns, rows, rowKey, loading, emptyLabel = 'No data for this period.', footer }: Props<T>) {
  const colSpan = columns.length;

  return (
    <Paper
      variant="outlined"
      sx={{
        borderRadius: 2.5,
        overflow: 'hidden',
        borderColor: 'divider',
        boxShadow: '0 1px 2px rgba(16, 24, 40, 0.04)',
      }}
    >
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              {columns.map((col) => (
                <TableCell key={col.key} align={col.align ?? 'left'}>
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
                    <TableCell key={col.key} align={col.align ?? 'left'}>
                      <Skeleton variant="text" sx={{ fontSize: 14 }} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={colSpan} align="center" sx={{ py: 6, border: 0 }}>
                  <Stack sx={{ alignItems: 'center', gap: 1 }}>
                    <InboxOutlinedIcon sx={{ fontSize: 32, color: 'text.disabled' }} />
                    <Typography variant="body2" color="text.secondary">
                      {emptyLabel}
                    </Typography>
                  </Stack>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={rowKey(row)} hover sx={{ '&:last-of-type td': { borderBottom: 0 } }}>
                  {columns.map((col) => (
                    <TableCell key={col.key} align={col.align ?? 'left'}>
                      {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? '')}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      {footer}
    </Paper>
  );
}
