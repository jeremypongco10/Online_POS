import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { Inventory, Product, Store } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { useSnackbar } from '../Snackbar';
import { useList } from './useList';
import { useFormErrors } from './useFormErrors';
import { DataTable, type Column } from './DataTable';
import { ListToolbar } from './ListToolbar';
import { Modal } from './Modal';
import { SectionTabs } from './SectionTabs';
import { InventoryMovementsScreen } from './InventoryMovementsScreen';
import { InlineSelectFilter } from './InlineSelectFilter';
import { useRouteState } from '../routing';
import Stack from '@mui/material/Stack';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Tab from '@mui/material/Tab';

type InventoryTab = 'stock' | 'movements';
const TABS: InventoryTab[] = ['stock', 'movements'];

export function InventoryScreen() {
  const [tab, setTab] = useRouteState<InventoryTab>(2, TABS, 'stock', (t) => `/admin/inventory/${t}`);

  return (
    <div>
      <SectionTabs value={tab} onChange={setTab}>
        <Tab value="stock" label="Stock Levels" />
        <Tab value="movements" label="Movements" />
      </SectionTabs>

      {tab === 'stock' && <StockLevelsScreen />}
      {tab === 'movements' && <InventoryMovementsScreen />}
    </div>
  );
}

function StockLevelsScreen() {
  const { hasPermission } = useAuth();
  const notify = useSnackbar();
  const [storeFilter, setStoreFilter] = useState('');
  const { data, meta, loading, error, page, setPage, perPage, setPerPage, sort, setSort, reload } = useList<Inventory>('/inventory', {
    store_id: storeFilter,
  });

  const [products, setProducts] = useState<Product[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [showAdjust, setShowAdjust] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const { fieldErrors, formError, clearErrors, clearField, reportError } = useFormErrors();
  const [saving, setSaving] = useState(false);

  const [adjustForm, setAdjustForm] = useState({ product_id: '', store_id: '', quantity_delta: '', reason: '' });
  const [transferForm, setTransferForm] = useState({
    product_id: '',
    from_store_id: '',
    to_store_id: '',
    quantity: '',
    notes: '',
  });

  useEffect(() => {
    api.get<Product[]>('/products?per_page=200&is_active=1').then(setProducts);
    api.get<Store[]>('/stores?per_page=50').then(setStores);
  }, []);

  const productLabel = (id: number) => {
    const p = products.find((x) => x.id === id);
    return p ? `${p.name} (${p.sku})` : `#${id}`;
  };
  const storeLabel = (id: number) => stores.find((s) => s.id === id)?.name ?? `#${id}`;

  function openAdjust() {
    setAdjustForm({ product_id: '', store_id: storeFilter, quantity_delta: '', reason: '' });
    clearErrors();
    setShowAdjust(true);
  }

  function openTransfer() {
    setTransferForm({ product_id: '', from_store_id: '', to_store_id: '', quantity: '', notes: '' });
    clearErrors();
    setShowTransfer(true);
  }

  async function submitAdjust() {
    setSaving(true);
    clearErrors();
    try {
      await api.post('/inventory/adjust', {
        product_id: Number(adjustForm.product_id),
        store_id: Number(adjustForm.store_id),
        quantity_delta: Number(adjustForm.quantity_delta),
        notes: adjustForm.reason || null,
      });
      setShowAdjust(false);
      reload();
      notify('Inventory adjusted');
    } catch (err) {
      reportError(err, 'Adjustment failed');
    } finally {
      setSaving(false);
    }
  }

  async function submitTransfer() {
    setSaving(true);
    clearErrors();
    try {
      await api.post('/inventory/transfer', {
        product_id: Number(transferForm.product_id),
        from_store_id: Number(transferForm.from_store_id),
        to_store_id: Number(transferForm.to_store_id),
        quantity: Number(transferForm.quantity),
        notes: transferForm.notes || null,
      });
      setShowTransfer(false);
      reload();
      notify('Stock transferred');
    } catch (err) {
      reportError(err, 'Transfer failed');
    } finally {
      setSaving(false);
    }
  }

  const columns: Column<Inventory>[] = [
    { key: 'product', label: 'Product', render: (i) => productLabel(i.product_id) },
    { key: 'store', label: 'Store', render: (i) => storeLabel(i.store_id) },
    { key: 'quantity', label: 'Quantity', align: 'right', sortKey: 'quantity', render: (i) => parseFloat(i.quantity) },
    { key: 'reorder_level', label: 'Reorder Level', align: 'right', sortKey: 'reorder_level', render: (i) => parseFloat(i.reorder_level) },
    {
      key: 'status',
      label: 'Status',
      width: 120,
      render: (i) =>
        parseFloat(i.quantity) <= parseFloat(i.reorder_level) ? (
          <Chip size="small" label="Low Stock" color="warning" />
        ) : (
          <Chip size="small" label="OK" color="success" />
        ),
    },
  ];

  return (
    <div>
      <ListToolbar
        search=""
        onSearchChange={() => {}}
        onRefresh={reload}
        refreshing={loading}
        extra={
          <InlineSelectFilter label="Store" value={storeFilter} onChange={setStoreFilter}>
            <MenuItem value="">All Stores</MenuItem>
            {stores.map((s) => (
              <MenuItem key={s.id} value={s.id}>
                {s.name}
              </MenuItem>
            ))}
          </InlineSelectFilter>
        }
        actions={
          <Stack direction="row" spacing={1.5}>
            {hasPermission('inventory.adjust') && (
              <Button variant="contained" onClick={openAdjust}>
                Adjust Stock
              </Button>
            )}
            {hasPermission('inventory.transfer') && (
              <Button variant="contained" onClick={openTransfer}>
                Transfer Stock
              </Button>
            )}
          </Stack>
        }
      />

      <DataTable
        columns={columns}
        rows={data}
        rowKey={(i) => i.id}
        loading={loading}
        error={error}
        meta={meta}
        page={page}
        onPageChange={setPage}
        perPage={perPage}
        onPerPageChange={setPerPage}
        sort={sort}
        onSortChange={setSort}
        emptyLabel="No inventory records. Pick a store above, or adjust stock to create one."
      />

      <Modal open={showAdjust} title="Adjust Stock" onClose={() => setShowAdjust(false)}>
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              submitAdjust();
            }}
          >
            <Grid container spacing={2} sx={{ pt: 1 }}>
              <Grid size={{ xs: 12 }}>
                <TextField
                  select
                  label="Product"
                  fullWidth
                  value={adjustForm.product_id}
                  onChange={(e) => {
                    setAdjustForm({ ...adjustForm, product_id: e.target.value });
                    clearField('product_id');
                  }}
                  error={!!fieldErrors?.product_id}
                  helperText={fieldErrors?.product_id}
                  required
                >
                  <MenuItem value="">— Select —</MenuItem>
                  {products.map((p) => (
                    <MenuItem key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  select
                  label="Store"
                  fullWidth
                  value={adjustForm.store_id}
                  onChange={(e) => {
                    setAdjustForm({ ...adjustForm, store_id: e.target.value });
                    clearField('store_id');
                  }}
                  error={!!fieldErrors?.store_id}
                  helperText={fieldErrors?.store_id}
                  required
                >
                  <MenuItem value="">— Select —</MenuItem>
                  {stores.map((s) => (
                    <MenuItem key={s.id} value={s.id}>
                      {s.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  label="Quantity Change (+/-)"
                  type="number"
                  fullWidth
                  slotProps={{ htmlInput: { step: '0.0001' } }}
                  value={adjustForm.quantity_delta}
                  onChange={(e) => {
                    setAdjustForm({ ...adjustForm, quantity_delta: e.target.value });
                    clearField('quantity_delta');
                  }}
                  error={!!fieldErrors?.quantity_delta}
                  helperText={fieldErrors?.quantity_delta}
                  placeholder="e.g. 10 or -5"
                  required
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  label="Reason"
                  fullWidth
                  value={adjustForm.reason}
                  onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                  placeholder="e.g. Stock count correction"
                />
              </Grid>

              {formError && (
                <Grid size={{ xs: 12 }}>
                  <Alert severity="error">{formError}</Alert>
                </Grid>
              )}

              <Grid size={{ xs: 12 }}>
                <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'flex-end' }}>
                  <Button type="button" variant="text" onClick={() => setShowAdjust(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="contained" disabled={saving}>
                    {saving ? 'Saving…' : 'Apply'}
                  </Button>
                </Stack>
              </Grid>
            </Grid>
          </form>
      </Modal>

      <Modal open={showTransfer} title="Transfer Stock" onClose={() => setShowTransfer(false)}>
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              submitTransfer();
            }}
          >
            <Grid container spacing={2} sx={{ pt: 1 }}>
              <Grid size={{ xs: 12 }}>
                <TextField
                  select
                  label="Product"
                  fullWidth
                  value={transferForm.product_id}
                  onChange={(e) => {
                    setTransferForm({ ...transferForm, product_id: e.target.value });
                    clearField('product_id');
                  }}
                  error={!!fieldErrors?.product_id}
                  helperText={fieldErrors?.product_id}
                  required
                >
                  <MenuItem value="">— Select —</MenuItem>
                  {products.map((p) => (
                    <MenuItem key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  select
                  label="From Store"
                  fullWidth
                  value={transferForm.from_store_id}
                  onChange={(e) => {
                    setTransferForm({ ...transferForm, from_store_id: e.target.value });
                    clearField('from_store_id');
                  }}
                  error={!!fieldErrors?.from_store_id}
                  helperText={fieldErrors?.from_store_id}
                  required
                >
                  <MenuItem value="">— Select —</MenuItem>
                  {stores.map((s) => (
                    <MenuItem key={s.id} value={s.id}>
                      {s.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  select
                  label="To Store"
                  fullWidth
                  value={transferForm.to_store_id}
                  onChange={(e) => {
                    setTransferForm({ ...transferForm, to_store_id: e.target.value });
                    clearField('to_store_id');
                  }}
                  error={!!fieldErrors?.to_store_id}
                  helperText={fieldErrors?.to_store_id}
                  required
                >
                  <MenuItem value="">— Select —</MenuItem>
                  {stores.map((s) => (
                    <MenuItem key={s.id} value={s.id}>
                      {s.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  label="Quantity"
                  type="number"
                  fullWidth
                  slotProps={{ htmlInput: { step: '0.0001', min: '0.0001' } }}
                  value={transferForm.quantity}
                  onChange={(e) => {
                    setTransferForm({ ...transferForm, quantity: e.target.value });
                    clearField('quantity');
                  }}
                  error={!!fieldErrors?.quantity}
                  helperText={fieldErrors?.quantity}
                  required
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  label="Notes"
                  fullWidth
                  value={transferForm.notes}
                  onChange={(e) => setTransferForm({ ...transferForm, notes: e.target.value })}
                />
              </Grid>

              {formError && (
                <Grid size={{ xs: 12 }}>
                  <Alert severity="error">{formError}</Alert>
                </Grid>
              )}

              <Grid size={{ xs: 12 }}>
                <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'flex-end' }}>
                  <Button type="button" variant="text" onClick={() => setShowTransfer(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="contained" disabled={saving}>
                    {saving ? 'Saving…' : 'Transfer'}
                  </Button>
                </Stack>
              </Grid>
            </Grid>
          </form>
      </Modal>
    </div>
  );
}
