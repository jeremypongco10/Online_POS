import type { ReactNode } from 'react';
import Table from '@mui/material/Table';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableSortLabel from '@mui/material/TableSortLabel';
import TablePagination from '@mui/material/TablePagination';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Skeleton from '@mui/material/Skeleton';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';
import type { ApiEnvelope } from '../api/types';

export interface Column<T> {
  key: string;
  label: string;
  render?: (row: T) => ReactNode;
  align?: 'left' | 'right';
  /** Column on the backend's allow-list for ?sort= — omit to leave this column unsortable. */
  sortKey?: string;
  /**
   * CSS width for columns with short, fixed-size content (a status chip, a
   * short code) — without it, a table with few/narrow columns lets one of
   * them stretch to fill the leftover space instead of the content-heavy
   * column(s) absorbing it, which reads as a huge accidental gap.
   */
  width?: number | string;
}

interface Props<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  loading: boolean;
  error: string | null;
  meta: ApiEnvelope<unknown>['meta'];
  page: number;
  onPageChange: (page: number) => void;
  perPage: number;
  onPerPageChange: (perPage: number) => void;
  sort?: string;
  onSortChange?: (sort: string) => void;
  emptyLabel?: string;
  rowActions?: (row: T) => ReactNode;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading,
  error,
  meta,
  page,
  onPageChange,
  perPage,
  onPerPageChange,
  sort,
  onSortChange,
  emptyLabel = 'No records found.',
  rowActions,
}: Props<T>) {
  const colSpan = columns.length + (rowActions ? 1 : 0);
  const activeSortKey = sort?.replace(/^-/, '');
  const activeSortDir: 'asc' | 'desc' = sort?.startsWith('-') ? 'desc' : 'asc';

  function toggleSort(key: string) {
    if (!onSortChange) return;
    if (activeSortKey !== key) {
      onSortChange(key);
    } else if (activeSortDir === 'asc') {
      onSortChange(`-${key}`);
    } else {
      onSortChange('');
    }
  }

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
      {error && (
        <Alert severity="error" sx={{ borderRadius: 0 }}>
          {error}
        </Alert>
      )}
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              {columns.map((col) => (
                <TableCell
                  key={col.key}
                  align={col.align ?? 'left'}
                  sortDirection={activeSortKey === col.sortKey ? activeSortDir : false}
                  sx={col.width ? { width: col.width, whiteSpace: 'nowrap' } : undefined}
                >
                  {col.sortKey ? (
                    <TableSortLabel
                      active={activeSortKey === col.sortKey}
                      direction={activeSortKey === col.sortKey ? activeSortDir : 'asc'}
                      onClick={() => toggleSort(col.sortKey!)}
                    >
                      {col.label}
                    </TableSortLabel>
                  ) : (
                    col.label
                  )}
                </TableCell>
              ))}
              {rowActions && (
                <TableCell align="right" sx={{ width: '1%', whiteSpace: 'nowrap' }}>
                  Actions
                </TableCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {columns.map((col) => (
                    <TableCell key={col.key} align={col.align ?? 'left'} sx={col.width ? { width: col.width, whiteSpace: 'nowrap' } : undefined}>
                      <Skeleton variant="text" sx={{ fontSize: 14 }} />
                    </TableCell>
                  ))}
                  {rowActions && (
                    <TableCell align="right" sx={{ width: '1%', whiteSpace: 'nowrap' }}>
                      <Skeleton variant="text" sx={{ fontSize: 14 }} />
                    </TableCell>
                  )}
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
                    <TableCell key={col.key} align={col.align ?? 'left'} sx={col.width ? { width: col.width, whiteSpace: 'nowrap' } : undefined}>
                      {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? '')}
                    </TableCell>
                  ))}
                  {rowActions && (
                    <TableCell align="right" sx={{ width: '1%', whiteSpace: 'nowrap' }}>
                      <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
                        {rowActions(row)}
                      </Stack>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {meta && (
        <TablePagination
          component="div"
          count={meta.total}
          page={page - 1}
          onPageChange={(_, newPage) => onPageChange(newPage + 1)}
          rowsPerPage={perPage}
          onRowsPerPageChange={(e) => onPerPageChange(Number(e.target.value))}
          rowsPerPageOptions={[10, 20, 50, 100]}
          sx={{ borderTop: '1px solid', borderColor: 'divider', bgcolor: 'action.hover' }}
        />
      )}
    </Paper>
  );
}
