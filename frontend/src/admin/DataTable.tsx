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
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
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
  const theme = useTheme();
  /**
   * Below `sm` every list turns into stacked cards instead of a table.
   *
   * A nine-column table on a 390px phone showed about three and a half
   * columns and hid the rest — including the Actions column, so the only
   * way to reach Edit was to scroll sideways and hope. Worse, the empty
   * state was a single cell spanning all nine columns and centred across
   * the table's full ~1300px width, which put "No records found" off the
   * right of the screen and left the phone showing a blank white void.
   *
   * Cards also let the row keep its real content: each column's own
   * render() is reused verbatim, so chips, tinted tiles and formatted
   * money look the same in both layouts rather than degrading to text.
   */
  const stacked = useMediaQuery(theme.breakpoints.down('sm'));

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

  // Flat, not a card. Every list screen now renders inside AdminLayout's
  // own page card, so the border, radius and shadow this used to carry put
  // a card inside a card — two nested rounded outlines a few pixels apart,
  // which the reference design does not have. The table just sits on the
  // surface it's given; only the header band and the pagination rule
  // separate it from what's above.
  return (
    <Paper
      variant="outlined"
      sx={{
        borderRadius: 0,
        overflow: 'hidden',
        border: 0,
        boxShadow: 'none',
        bgcolor: 'transparent',
      }}
    >
      {error && (
        <Alert severity="error" sx={{ borderRadius: 0 }}>
          {error}
        </Alert>
      )}

      {stacked ? (
        <Stack spacing={1.5} sx={{ py: 1 }}>
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Paper key={i} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                <Skeleton variant="text" sx={{ fontSize: 18, width: '60%' }} />
                <Skeleton variant="text" sx={{ fontSize: 14 }} />
                <Skeleton variant="text" sx={{ fontSize: 14, width: '40%' }} />
              </Paper>
            ))
          ) : rows.length === 0 ? (
            <Stack sx={{ alignItems: 'center', gap: 1, py: 6 }}>
              <InboxOutlinedIcon sx={{ fontSize: 32, color: 'text.disabled' }} />
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', px: 2 }}>
                {emptyLabel}
              </Typography>
            </Stack>
          ) : (
            rows.map((row) => {
              // The first column is the row's identity (a name, a code) —
              // it becomes the card's heading, and the rest become
              // label/value pairs underneath.
              const [primary, ...rest] = columns;
              return (
                <Paper key={rowKey(row)} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                  <Box sx={{ fontWeight: 700, fontSize: 15, minWidth: 0 }}>
                    {primary.render ? primary.render(row) : String((row as Record<string, unknown>)[primary.key] ?? '')}
                  </Box>

                  {rest.length > 0 && (
                    <Stack spacing={0.75} sx={{ mt: 1.5 }}>
                      {rest.map((col) => (
                        <Stack
                          key={col.key}
                          direction="row"
                          spacing={2}
                          sx={{ justifyContent: 'space-between', alignItems: 'center', gap: 1 }}
                        >
                          <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
                            {col.label}
                          </Typography>
                          <Box sx={{ fontSize: 14, textAlign: 'right', minWidth: 0, overflowWrap: 'anywhere' }}>
                            {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? '')}
                          </Box>
                        </Stack>
                      ))}
                    </Stack>
                  )}

                  {rowActions && (
                    <>
                      <Divider sx={{ my: 1.5 }} />
                      <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        {rowActions(row)}
                      </Stack>
                    </>
                  )}
                </Paper>
              );
            })
          )}
        </Stack>
      ) : (
      <TableContainer>
        {/* Default (comfortable) density, not `size="small"` — the dense
            variant was what made every list in the app read as cramped
            next to a normal reference UI: small shaves padding *and* font
            size on every cell, table-wide, and there's no isolated way to
            get the row-height back without it. This one line is why every
            list screen looked "not modern" at once, not a per-screen
            issue. */}
        <Table>
          {/* A contained band with rounded ends, not a full-bleed
              stripe — it sits inside the page card's padding, so
              square corners would read as a strip that had been cut
              off at both sides. */}
          <TableHead
            sx={{
              // A light tint of the brand color rather than the neutral
              // gray this was before — matches the same color-mix wash
              // already used for icon tiles and page backgrounds
              // elsewhere (AdminLayout, SettingsScreen), so the header
              // band reads as part of the same design language instead
              // of a plain UI-gray default. 8%, not the 12% those small
              // icon tiles use — a full-width band this large needs a
              // lighter touch to stay a wash rather than a solid color.
              bgcolor: 'color-mix(in srgb, var(--mui-palette-primary-main) 8%, var(--mui-palette-background-paper))',
              '& th:first-of-type': { borderTopLeftRadius: 10, borderBottomLeftRadius: 10 },
              '& th:last-of-type': { borderTopRightRadius: 10, borderBottomRightRadius: 10 },
              '& th': { borderBottom: 0 },
            }}
          >
            <TableRow>
              {columns.map((col) => (
                <TableCell
                  key={col.key}
                  align={col.align ?? 'left'}
                  sortDirection={activeSortKey === col.sortKey ? activeSortDir : false}
                  sx={{
                    fontWeight: 700,
                    fontSize: 13,
                    ...(col.width
                      ? { width: col.width, maxWidth: col.width, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }
                      : null),
                  }}
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
                <TableCell align="right" sx={{ width: '1%', whiteSpace: 'nowrap', fontWeight: 700, fontSize: 13 }}>
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
                    <TableCell
                      key={col.key}
                      align={col.align ?? 'left'}
                      sx={
                        col.width
                          ? { width: col.width, maxWidth: col.width, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }
                          : undefined
                      }
                    >
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
                    <TableCell
                      key={col.key}
                      align={col.align ?? 'left'}
                      sx={
                        col.width
                          ? { width: col.width, maxWidth: col.width, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }
                          : undefined
                      }
                    >
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
      )}

      {meta && (
        <TablePagination
          component="div"
          count={meta.total}
          page={page - 1}
          onPageChange={(_, newPage) => onPageChange(newPage + 1)}
          rowsPerPage={perPage}
          onRowsPerPageChange={(e) => onPerPageChange(Number(e.target.value))}
          rowsPerPageOptions={[10, 20, 50, 100]}
          // First/last only where there's room for six controls in a row.
          // On a phone they pushed next/previous off the right edge, so
          // the page you could actually reach was whichever one fitted.
          showFirstButton={!stacked}
          showLastButton={!stacked}
          // "Rows per page" is the first thing to go when space is tight:
          // it's the least-used control here and the longest label.
          labelRowsPerPage={stacked ? '' : 'Rows per page:'}
          sx={{
            borderTop: '1px solid',
            borderColor: 'divider',
            // Left on the card rather than tinted: the header band above is
            // the one shaded strip in this table, and a second one down here
            // boxed the rows in on both sides.
            minHeight: 56,
            // Wraps to a second line on a phone instead of overflowing —
            // the toolbar is a flex row that does not wrap by default.
            '& .MuiToolbar-root': {
              minHeight: 56,
              pl: { xs: 1, sm: 2.5 },
              pr: { xs: 0.5, sm: 1.5 },
              flexWrap: { xs: 'wrap', sm: 'nowrap' },
              rowGap: 0.5,
            },
            '& .MuiTablePagination-spacer': { flex: { xs: '0 0 0px', sm: '1 1 100%' } },
            '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': { fontSize: 13.5 },
          }}
        />
      )}
    </Paper>
  );
}

