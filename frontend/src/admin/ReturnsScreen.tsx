import { useState } from 'react';
import { api, ApiError } from '../api/client';
import type { ReturnItem, SaleResponse, SalesReturn } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { useSnackbar } from '../Snackbar';
import { useList } from './useList';
import { useFormErrors } from './useFormErrors';
import { DataTable, type Column } from './DataTable';
import { ListToolbar } from './ListToolbar';
import { InlineSelectFilter } from './InlineSelectFilter';
import { Modal } from './Modal';
import { useRetained } from './useRetained';
import { formatMoney } from '../pos/format';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import type { ChipProps } from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';

interface EligibleItem {
  id: number;
  product_id: number;
  product_name?: string;
  quantity: string;
  unit_price: string;
  remaining_quantity: number;
}

interface FoundSale extends SaleResponse {
  store_id: number;
}

function statusColor(status: string): ChipProps['color'] {
  if (['completed', 'approved', 'received', 'active'].includes(status)) return 'success';
  if (['pending', 'draft', 'held'].includes(status)) return 'warning';
  return 'default';
}

export function ReturnsScreen() {
  const { hasPermission } = useAuth();
  const notify = useSnackbar();
  const [statusFilter, setStatusFilter] = useState('');
  const { data, meta, loading, error, page, setPage, perPage, setPerPage, sort, setSort, reload } = useList<SalesReturn>('/returns', {
    status: statusFilter,
  });

  const [detail, setDetail] = useState<SalesReturn | null>(null);
  const detailR = useRetained(detail);
  const [detailItems, setDetailItems] = useState<ReturnItem[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [saleResults, setSaleResults] = useState<FoundSale[]>([]);
  const [selectedSale, setSelectedSale] = useState<FoundSale | null>(null);
  const [eligibleItems, setEligibleItems] = useState<EligibleItem[]>([]);
  const [returnQty, setReturnQty] = useState<Record<number, string>>({});
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const { formError, clearErrors, reportError } = useFormErrors();

  async function openDetail(ret: SalesReturn) {
    setDetail(ret);
    setActionError(null);
    setDetailItems(await api.get<ReturnItem[]>(`/returns/${ret.id}/items`));
  }

  async function runAction(action: 'approve' | 'reject') {
    if (!detail) return;
    setActionError(null);
    try {
      const updated = await api.post<SalesReturn>(`/returns/${detail.id}/${action}`);
      setDetail(updated);
      reload();
      notify(`Return ${action === 'approve' ? 'approved' : 'rejected'}`);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : `Failed to ${action}`);
    }
  }

  function openCreate() {
    setInvoiceSearch('');
    setSaleResults([]);
    setSelectedSale(null);
    setEligibleItems([]);
    setReturnQty({});
    setReason('');
    clearErrors();
    setShowCreate(true);
  }

  async function searchInvoice() {
    if (!invoiceSearch.trim()) return;
    const results = await api.get<FoundSale[]>(`/sales?q=${encodeURIComponent(invoiceSearch)}&status=completed&per_page=10`);
    setSaleResults(results);
  }

  async function selectSale(sale: FoundSale) {
    setSelectedSale(sale);
    const items = await api.get<EligibleItem[]>(`/returns/eligible-items?sale_id=${sale.id}`);
    setEligibleItems(items);
    setReturnQty({});
  }

  async function submitReturn() {
    if (!selectedSale) return;
    setSaving(true);
    clearErrors();

    const items = eligibleItems
      .filter((item) => Number(returnQty[item.id] || 0) > 0)
      .map((item) => ({ sale_item_id: item.id, quantity: Number(returnQty[item.id]) }));

    if (items.length === 0) {
      reportError(null, 'Enter a return quantity for at least one item.');
      setSaving(false);
      return;
    }

    try {
      await api.post('/returns', {
        sale_id: selectedSale.id,
        store_id: selectedSale.store_id,
        reason: reason || null,
        items,
      });
      setShowCreate(false);
      reload();
      notify('Return created');
    } catch (err) {
      reportError(err, 'Failed to create return');
    } finally {
      setSaving(false);
    }
  }

  const columns: Column<SalesReturn>[] = [
    { key: 'return_number', label: 'Return #', sortKey: 'return_number' },
    { key: 'sale_id', label: 'Sale ID', render: (r) => `#${r.sale_id}` },
    { key: 'return_date', label: 'Date', sortKey: 'return_date', render: (r) => r.return_date?.slice(0, 10) },
    { key: 'total_refund', label: 'Refund', align: 'right', sortKey: 'total_refund', render: (r) => formatMoney(parseFloat(r.total_refund)) },
    {
      key: 'status',
      label: 'Status',
      width: 120,
      render: (r) => <Chip size="small" label={r.status} color={statusColor(r.status)} sx={{ textTransform: 'capitalize' }} />,
    },
  ];

  return (
    <div>
      <ListToolbar
        search=""
        onSearchChange={() => {}}
        onAdd={hasPermission('returns.create') ? openCreate : undefined}
        addLabel="New Return"
        onRefresh={reload}
        refreshing={loading}
        extra={
          <InlineSelectFilter
            label="Status"
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'pending', label: 'Pending' },
              { value: 'completed', label: 'Completed' },
              { value: 'cancelled', label: 'Cancelled' },
            ]}
          />
        }
      />

      <DataTable
        columns={columns}
        rows={data}
        rowKey={(r) => r.id}
        loading={loading}
        error={error}
        meta={meta}
        page={page}
        onPageChange={setPage}
        perPage={perPage}
        onPerPageChange={setPerPage}
        sort={sort}
        onSortChange={setSort}
        rowActions={(r) => (
          <Tooltip title="View">
            <IconButton size="small" aria-label="View" onClick={() => openDetail(r)}>
              <VisibilityOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      />

      <Modal open={detail !== null} title={detailR ? `Return ${detailR.return_number}` : ''} onClose={() => setDetail(null)} wide>
        {detailR && (
          <>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.5, color: 'text.secondary', fontSize: 13.5 }}>
            <span>Sale #{detailR.sale_id}</span>
            <Chip size="small" label={detailR.status} color={statusColor(detailR.status)} sx={{ textTransform: 'capitalize' }} />
            {detailR.reason && <span>· {detailR.reason}</span>}
          </Stack>

          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Product</TableCell>
                <TableCell align="right">Qty</TableCell>
                <TableCell align="right">Unit Price</TableCell>
                <TableCell align="right">Refund</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {detailItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.product_name ?? `#${item.product_id}`}</TableCell>
                  <TableCell align="right">{parseFloat(item.quantity)}</TableCell>
                  <TableCell align="right">{formatMoney(parseFloat(item.unit_price))}</TableCell>
                  <TableCell align="right">{formatMoney(parseFloat(item.refund_amount))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Stack direction="row" sx={{ justifyContent: 'space-between', mt: 1.5, mb: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              Total Refund
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {formatMoney(parseFloat(detailR.total_refund))}
            </Typography>
          </Stack>

          {actionError && (
            <Alert severity="error" sx={{ mb: 1.5 }}>
              {actionError}
            </Alert>
          )}

          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <Button type="button" variant="text" onClick={() => setDetail(null)}>
              Close
            </Button>
            {detailR.status === 'pending' && hasPermission('returns.approve') && (
              <Stack direction="row" spacing={1}>
                <Button type="button" variant="text" onClick={() => runAction('reject')}>
                  Reject
                </Button>
                <Button type="button" variant="contained" onClick={() => runAction('approve')}>
                  Approve &amp; Refund
                </Button>
              </Stack>
            )}
          </Stack>
          </>
        )}
      </Modal>

      <Modal open={showCreate} title="New Return" onClose={() => setShowCreate(false)} wide>
          {!selectedSale ? (
            <>
              <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
                <TextField
                  label="Invoice Number"
                  value={invoiceSearch}
                  onChange={(e) => setInvoiceSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchInvoice()}
                  fullWidth
                />
                <Button type="button" variant="contained" onClick={searchInvoice}>
                  Search
                </Button>
              </Stack>
              {saleResults.length > 0 && (
                <List disablePadding sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
                  {saleResults.map((sale) => (
                    <ListItemButton
                      key={sale.id}
                      onClick={() => selectSale(sale)}
                      sx={{ display: 'flex', justifyContent: 'space-between' }}
                    >
                      <span>{sale.invoice_number}</span>
                      <span>{formatMoney(parseFloat(sale.total))}</span>
                    </ListItemButton>
                  ))}
                </List>
              )}
            </>
          ) : (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                Invoice: {selectedSale.invoice_number}
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Product</TableCell>
                    <TableCell align="right">Remaining</TableCell>
                    <TableCell sx={{ width: 120 }}>Return Qty</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {eligibleItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.product_name ?? `#${item.product_id}`}</TableCell>
                      <TableCell align="right">{item.remaining_quantity}</TableCell>
                      <TableCell>
                        <TextField
                          type="number"
                          fullWidth
                          slotProps={{ htmlInput: { min: '0', max: item.remaining_quantity, step: '0.0001' } }}
                          value={returnQty[item.id] ?? ''}
                          onChange={(e) => setReturnQty({ ...returnQty, [item.id]: e.target.value })}
                          disabled={item.remaining_quantity <= 0}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <TextField
                label="Reason"
                fullWidth
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                sx={{ mt: 2 }}
              />

              {formError && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {formError}
                </Alert>
              )}

              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                <Button type="button" variant="text" onClick={() => setSelectedSale(null)}>
                  ← Choose a different sale
                </Button>
                <Button type="button" variant="contained" onClick={submitReturn} disabled={saving}>
                  {saving ? 'Submitting…' : 'Submit Return'}
                </Button>
              </Stack>
            </>
          )}
      </Modal>
    </div>
  );
}
