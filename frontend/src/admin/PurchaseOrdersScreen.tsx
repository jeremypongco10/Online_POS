import { useEffect, useRef, useState } from 'react';
import { api, ApiError } from '../api/client';
import type { Product, PurchaseOrder, PurchaseOrderItem, Store, Supplier, TaxRate } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { useSnackbar } from '../Snackbar';
import { useList } from './useList';
import { useFormErrors } from './useFormErrors';
import { DataTable, type Column } from './DataTable';
import { ListToolbar } from './ListToolbar';
import { InlineSelectFilter } from './InlineSelectFilter';
import { SectionTabs } from './SectionTabs';
import { Modal } from './Modal';
import { SearchableSelect } from './SearchableSelect';
import { SearchField } from '../SearchField';
import { useRetained } from './useRetained';
import { formatMoney } from '../pos/format';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Chip from '@mui/material/Chip';
import type { ChipProps } from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Paper from '@mui/material/Paper';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import Tab from '@mui/material/Tab';
import CloseIcon from '@mui/icons-material/Close';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';

interface LineDraft {
  product_id: string;
  product_label: string;
  quantity: string;
  unit_cost: string;
  tax_rate_id: string;
}

function statusColor(status: string): ChipProps['color'] {
  if (['completed', 'approved', 'received', 'active'].includes(status)) return 'success';
  if (['pending', 'draft', 'held'].includes(status)) return 'warning';
  return 'default';
}

export function PurchaseOrdersScreen() {
  const { hasPermission } = useAuth();
  const notify = useSnackbar();
  const [statusFilter, setStatusFilter] = useState('');
  const { data, meta, loading, error, page, setPage, perPage, setPerPage, sort, setSort, reload } = useList<PurchaseOrder>('/purchases', {
    status: statusFilter,
  });

  const [stores, setStores] = useState<Store[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [taxes, setTaxes] = useState<TaxRate[]>([]);

  const [showCreate, setShowCreate] = useState(false);
  const [createTab, setCreateTab] = useState<'details' | 'products'>('details');
  const [storeId, setStoreId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<LineDraft[]>([]);
  const [saving, setSaving] = useState(false);
  const { fieldErrors, formError, clearErrors, clearField, reportError } = useFormErrors();

  // Type-to-search product picker for the Products tab — never loads the
  // full catalog, only the handful of matches for the current query, same
  // pattern as the POS product search.
  const [productQuery, setProductQuery] = useState('');
  const [productResults, setProductResults] = useState<Product[]>([]);
  const [productSearchLoading, setProductSearchLoading] = useState(false);
  const productDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [detail, setDetail] = useState<PurchaseOrder | null>(null);
  const detailR = useRetained(detail);
  const [detailItems, setDetailItems] = useState<PurchaseOrderItem[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    api.get<Store[]>('/stores?per_page=50').then(setStores);
    api.get<Supplier[]>('/suppliers?per_page=200&is_active=1').then(setSuppliers);
    api.get<TaxRate[]>('/taxes?per_page=100').then(setTaxes);
  }, []);

  useEffect(() => {
    if (productDebounceRef.current) clearTimeout(productDebounceRef.current);

    if (productQuery.trim() === '') {
      setProductResults([]);
      return;
    }

    productDebounceRef.current = setTimeout(() => {
      setProductSearchLoading(true);
      api
        .get<Product[]>(`/products?is_active=1&per_page=8&q=${encodeURIComponent(productQuery)}`)
        .then(setProductResults)
        .catch(() => setProductResults([]))
        .finally(() => setProductSearchLoading(false));
    }, 250);

    return () => {
      if (productDebounceRef.current) clearTimeout(productDebounceRef.current);
    };
  }, [productQuery]);

  const storeName = (id: number) => stores.find((s) => s.id === id)?.name ?? `#${id}`;
  const supplierName = (id: number) => suppliers.find((s) => s.id === id)?.name ?? `#${id}`;

  function addProductLine(product: Product) {
    if (lines.some((l) => l.product_id === String(product.id))) return;
    setLines((prev) => [
      ...prev,
      { product_id: String(product.id), product_label: `${product.name} (${product.sku})`, quantity: '1', unit_cost: '0', tax_rate_id: '' },
    ]);
    setProductQuery('');
    setProductResults([]);
  }

  function openCreate() {
    setStoreId('');
    setSupplierId('');
    setNotes('');
    setLines([]);
    setCreateTab('details');
    setProductQuery('');
    setProductResults([]);
    clearErrors();
    setShowCreate(true);
  }

  function updateLine(index: number, patch: Partial<LineDraft>) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  async function submitCreate() {
    setSaving(true);
    clearErrors();
    try {
      await api.post('/purchases', {
        store_id: Number(storeId),
        supplier_id: Number(supplierId),
        notes: notes || null,
        items: lines
          .filter((l) => l.product_id)
          .map((l) => ({
            product_id: Number(l.product_id),
            quantity: Number(l.quantity),
            unit_cost: Number(l.unit_cost),
            tax_rate_id: l.tax_rate_id ? Number(l.tax_rate_id) : null,
          })),
      });
      setShowCreate(false);
      reload();
      notify('Purchase order created');
    } catch (err) {
      reportError(err, 'Failed to create purchase order');
    } finally {
      setSaving(false);
    }
  }

  async function openDetail(po: PurchaseOrder) {
    setDetail(po);
    setActionError(null);
    setDetailItems(await api.get<PurchaseOrderItem[]>(`/purchases/${po.id}/items`));
  }

  async function runAction(action: 'approve' | 'receive' | 'cancel') {
    if (!detail) return;
    setActionError(null);
    try {
      const updated = await api.post<PurchaseOrder>(`/purchases/${detail.id}/${action}`);
      setDetail(updated);
      reload();
      notify(`Purchase order ${action === 'receive' ? 'received' : action === 'approve' ? 'approved' : 'cancelled'}`);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : `Failed to ${action}`);
    }
  }

  const columns: Column<PurchaseOrder>[] = [
    { key: 'po_number', label: 'PO Number', sortKey: 'po_number' },
    { key: 'supplier', label: 'Supplier', render: (po) => supplierName(po.supplier_id) },
    { key: 'store', label: 'Store', render: (po) => storeName(po.store_id) },
    { key: 'order_date', label: 'Order Date', sortKey: 'order_date', render: (po) => po.order_date ?? '—' },
    { key: 'total', label: 'Total', align: 'right', sortKey: 'total', render: (po) => formatMoney(parseFloat(po.total)) },
    {
      key: 'status',
      label: 'Status',
      width: 120,
      render: (po) => <Chip size="small" label={po.status} color={statusColor(po.status)} sx={{ textTransform: 'capitalize' }} />,
    },
  ];

  return (
    <div>
      <ListToolbar
        search=""
        onSearchChange={() => {}}
        onAdd={hasPermission('purchases.create') ? openCreate : undefined}
        addLabel="New Purchase Order"
        onRefresh={reload}
        refreshing={loading}
        extra={
          <InlineSelectFilter
            label="Status"
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'draft', label: 'Draft' },
              { value: 'approved', label: 'Approved' },
              { value: 'received', label: 'Received' },
              { value: 'cancelled', label: 'Cancelled' },
            ]}
          />
        }
      />

      <DataTable
        columns={columns}
        rows={data}
        rowKey={(po) => po.id}
        loading={loading}
        error={error}
        meta={meta}
        page={page}
        onPageChange={setPage}
        perPage={perPage}
        onPerPageChange={setPerPage}
        sort={sort}
        onSortChange={setSort}
        rowActions={(po) => (
          <Tooltip title="View">
            <IconButton size="small" aria-label="View" onClick={() => openDetail(po)}>
              <VisibilityOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      />

      <Modal open={showCreate} title="New Purchase Order" onClose={() => setShowCreate(false)} wide>
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              submitCreate();
            }}
          >
            <SectionTabs value={createTab} onChange={setCreateTab}>
              <Tab value="details" label="Details" />
              <Tab value="products" label={lines.length > 0 ? `Products (${lines.length})` : 'Products'} />
            </SectionTabs>

            {createTab === 'details' ? (
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <SearchableSelect
                    label="Store"
                    fullWidth
                    value={storeId}
                    onChange={(v) => {
                      setStoreId(v);
                      clearField('store_id');
                    }}
                    error={!!fieldErrors?.store_id}
                    helperText={fieldErrors?.store_id}
                    required
                    options={[{ value: '', label: '— Select —' }, ...stores.map((s) => ({ value: String(s.id), label: s.name }))]}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <SearchableSelect
                    label="Supplier"
                    fullWidth
                    value={supplierId}
                    onChange={(v) => {
                      setSupplierId(v);
                      clearField('supplier_id');
                    }}
                    error={!!fieldErrors?.supplier_id}
                    helperText={fieldErrors?.supplier_id}
                    required
                    options={[{ value: '', label: '— Select —' }, ...suppliers.map((s) => ({ value: String(s.id), label: s.name }))]}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField label="Notes" fullWidth value={notes} onChange={(e) => setNotes(e.target.value)} />
                </Grid>
              </Grid>
            ) : (
              <Stack spacing={2}>
                <div>
                  <SearchField
                    value={productQuery}
                    onChange={setProductQuery}
                    placeholder="Search products by SKU or name…"
                    fullWidth
                    autoFocus
                  />
                  {productSearchLoading && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Searching…
                    </Typography>
                  )}
                  {productResults.length > 0 && (
                    <Paper variant="outlined" sx={{ mt: 1, borderRadius: 1, overflow: 'hidden' }}>
                      <List disablePadding>
                        {productResults.map((p) => (
                          <ListItemButton key={p.id} divider onClick={() => addProductLine(p)}>
                            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: 1.25 }}>
                              <Typography variant="body2" sx={{ flex: 1 }}>
                                {p.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {p.sku}
                              </Typography>
                            </Stack>
                          </ListItemButton>
                        ))}
                      </List>
                    </Paper>
                  )}
                </div>

                {lines.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No products added yet — search above to add a line.
                  </Typography>
                ) : (
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Product</TableCell>
                        <TableCell sx={{ width: 100 }}>Qty</TableCell>
                        <TableCell sx={{ width: 120 }}>Unit Cost</TableCell>
                        <TableCell sx={{ width: 160 }}>Tax Rate</TableCell>
                        <TableCell sx={{ width: 40 }} />
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {lines.map((line, i) => (
                        <TableRow key={line.product_id}>
                          <TableCell>{line.product_label}</TableCell>
                          <TableCell>
                            <TextField
                              type="number"
                              fullWidth
                              slotProps={{ htmlInput: { step: '0.0001', min: '0.0001' } }}
                              value={line.quantity}
                              onChange={(e) => updateLine(i, { quantity: e.target.value })}
                              required
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              type="number"
                              fullWidth
                              slotProps={{ htmlInput: { step: '0.01' } }}
                              value={line.unit_cost}
                              onChange={(e) => updateLine(i, { unit_cost: e.target.value })}
                              required
                            />
                          </TableCell>
                          <TableCell>
                            <SearchableSelect
                              fullWidth
                              value={line.tax_rate_id}
                              onChange={(v) => updateLine(i, { tax_rate_id: v })}
                              options={[
                                { value: '', label: 'None' },
                                ...taxes.map((t) => ({ value: String(t.id), label: `${t.name} (${t.rate}%)` })),
                              ]}
                            />
                          </TableCell>
                          <TableCell>
                            <Tooltip title="Remove line">
                              <IconButton
                                size="small"
                                aria-label="Remove line"
                                onClick={() => setLines((prev) => prev.filter((_, idx) => idx !== i))}
                              >
                                <CloseIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </Stack>
            )}

            {formError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {formError}
              </Alert>
            )}

            <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'flex-end', mt: 2 }}>
              <Button type="button" variant="text" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="contained" disabled={saving || lines.length === 0}>
                {saving ? 'Creating…' : 'Create'}
              </Button>
            </Stack>
          </form>
      </Modal>

      <Modal open={detail !== null} title={detailR ? `Purchase Order ${detailR.po_number}` : ''} onClose={() => setDetail(null)} wide>
        {detailR && (
          <>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.5, color: 'text.secondary', fontSize: 13.5 }}>
            <span>
              {supplierName(detailR.supplier_id)} · {storeName(detailR.store_id)}
            </span>
            <Chip size="small" label={detailR.status} color={statusColor(detailR.status)} sx={{ textTransform: 'capitalize' }} />
          </Stack>

          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Product</TableCell>
                <TableCell align="right">Qty</TableCell>
                <TableCell align="right">Unit Cost</TableCell>
                <TableCell align="right">Line Total</TableCell>
                <TableCell align="right">Received</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {detailItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.product_name ? `${item.product_name} (${item.product_sku})` : `#${item.product_id}`}</TableCell>
                  <TableCell align="right">{parseFloat(item.quantity)}</TableCell>
                  <TableCell align="right">{formatMoney(parseFloat(item.unit_cost))}</TableCell>
                  <TableCell align="right">{formatMoney(parseFloat(item.line_total))}</TableCell>
                  <TableCell align="right">{parseFloat(item.received_quantity)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Stack direction="row" sx={{ justifyContent: 'space-between', mt: 1.5, mb: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              Total
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {formatMoney(parseFloat(detailR.total))}
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
            <Stack direction="row" spacing={1}>
              {detailR.status === 'draft' && hasPermission('purchases.manage') && (
                <>
                  <Button type="button" variant="text" onClick={() => runAction('cancel')}>
                    Cancel PO
                  </Button>
                  <Button type="button" variant="contained" onClick={() => runAction('approve')}>
                    Approve
                  </Button>
                </>
              )}
              {detailR.status === 'approved' && hasPermission('purchases.manage') && (
                <>
                  <Button type="button" variant="text" onClick={() => runAction('cancel')}>
                    Cancel PO
                  </Button>
                  <Button type="button" variant="contained" onClick={() => runAction('receive')}>
                    Receive into Inventory
                  </Button>
                </>
              )}
            </Stack>
          </Stack>
          </>
        )}
      </Modal>
    </div>
  );
}
