import { useEffect, useState } from 'react';
import { api, ApiError } from '../api/client';
import type { Category, Product, StoreProductPrice, TaxRate, Unit } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { useConfirm } from '../ConfirmDialog';
import { useSnackbar } from '../Snackbar';
import { useList } from './useList';
import { useFormErrors } from './useFormErrors';
import { useRetained } from './useRetained';
import { DataTable, type Column } from './DataTable';
import { ListToolbar } from './ListToolbar';
import { InlineSelectFilter } from './InlineSelectFilter';
import { Modal } from './Modal';
import Stack from '@mui/material/Stack';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import CircularProgress from '@mui/material/CircularProgress';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PriceChangeIcon from '@mui/icons-material/PriceChange';

interface FormState {
  sku: string;
  barcode: string;
  name: string;
  description: string;
  category_id: string;
  unit_id: string;
  tax_rate_id: string;
  minimum_stock: string;
  is_active: boolean;
  track_inventory: boolean;
}

const EMPTY_FORM: FormState = {
  sku: '',
  barcode: '',
  name: '',
  description: '',
  category_id: '',
  unit_id: '',
  tax_rate_id: '',
  minimum_stock: '0',
  is_active: true,
  track_inventory: true,
};

export function ProductsScreen() {
  const { hasPermission } = useAuth();
  const confirm = useConfirm();
  const notify = useSnackbar();
  const [categoryFilter, setCategoryFilter] = useState('');
  const { data, meta, loading, error, page, setPage, perPage, setPerPage, sort, setSort, q, setQ, reload } = useList<Product>('/products', {
    category_id: categoryFilter,
  });

  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [taxes, setTaxes] = useState<TaxRate[]>([]);

  const [editing, setEditing] = useState<Product | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const { fieldErrors, formError, clearErrors, clearField, reportError } = useFormErrors();

  const [pricing, setPricing] = useState<Product | null>(null);
  const pricingR = useRetained(pricing);
  const [prices, setPrices] = useState<StoreProductPrice[]>([]);
  const [pricesLoading, setPricesLoading] = useState(false);
  const [pricesSaving, setPricesSaving] = useState(false);
  const [pricesError, setPricesError] = useState<string | null>(null);

  useEffect(() => {
    api.get<Category[]>('/categories?per_page=200').then(setCategories);
    api.get<Unit[]>('/units?per_page=100').then(setUnits);
    api.get<TaxRate[]>('/taxes?per_page=100').then(setTaxes);
  }, []);

  const categoryName = (id: number | null) => categories.find((c) => c.id === id)?.name ?? '—';

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    clearErrors();
    setShowForm(true);
  }

  function openEdit(product: Product) {
    setEditing(product);
    setForm({
      sku: product.sku,
      barcode: product.barcode ?? '',
      name: product.name,
      description: product.description ?? '',
      category_id: product.category_id ? String(product.category_id) : '',
      unit_id: product.unit_id ? String(product.unit_id) : '',
      tax_rate_id: product.tax_rate_id ? String(product.tax_rate_id) : '',
      minimum_stock: product.minimum_stock,
      is_active: Number(product.is_active) === 1,
      track_inventory: Number(product.track_inventory) === 1,
    });
    clearErrors();
    setShowForm(true);
  }

  async function submitForm() {
    setSaving(true);
    clearErrors();

    const payload = {
      sku: form.sku,
      barcode: form.barcode || null,
      name: form.name,
      description: form.description || null,
      category_id: form.category_id || null,
      unit_id: form.unit_id || null,
      tax_rate_id: form.tax_rate_id || null,
      minimum_stock: form.minimum_stock,
      is_active: form.is_active ? 1 : 0,
      track_inventory: form.track_inventory ? 1 : 0,
    };

    try {
      if (editing) {
        await api.put(`/products/${editing.id}`, payload);
      } else {
        await api.post('/products', payload);
      }
      setShowForm(false);
      reload();
      notify(editing ? 'Product updated' : 'Product created');
    } catch (err) {
      reportError(err, 'Failed to save product');
    } finally {
      setSaving(false);
    }
  }

  async function deactivate(product: Product) {
    if (!(await confirm(`Delete product "${product.name}"? This cannot be undone.`, { title: 'Delete Product', confirmLabel: 'Delete' }))) return;
    try {
      await api.del(`/products/${product.id}`);
      reload();
      notify('Product deleted');
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Failed to delete product', 'error');
    }
  }

  function openPricing(product: Product) {
    setPricing(product);
    setPricesError(null);
    setPricesLoading(true);
    api
      .get<StoreProductPrice[]>(`/products/${product.id}/prices`)
      .then(setPrices)
      .catch((err) => setPricesError(err instanceof ApiError ? err.message : 'Failed to load prices'))
      .finally(() => setPricesLoading(false));
  }

  function updatePriceRow(storeId: number, field: 'cost_price' | 'selling_price', value: string) {
    setPrices((rows) => rows.map((r) => (r.store_id === storeId ? { ...r, [field]: value } : r)));
  }

  async function savePrices() {
    if (!pricing) return;
    setPricesSaving(true);
    setPricesError(null);
    try {
      const updated = await api.put<StoreProductPrice[]>(`/products/${pricing.id}/prices`, {
        prices: prices.map((r) => ({
          store_id: r.store_id,
          cost_price: r.cost_price || '0',
          selling_price: r.selling_price || '0',
        })),
      });
      setPrices(updated);
      notify('Prices updated');
    } catch (err) {
      setPricesError(err instanceof ApiError ? err.message : 'Failed to save prices');
    } finally {
      setPricesSaving(false);
    }
  }

  const columns: Column<Product>[] = [
    { key: 'sku', label: 'SKU', sortKey: 'sku' },
    { key: 'name', label: 'Name', sortKey: 'name' },
    { key: 'category', label: 'Category', render: (p) => categoryName(p.category_id) },
    {
      key: 'is_active',
      label: 'Status',
      width: 120,
      render: (p) => (
        <Chip
          size="small"
          label={Number(p.is_active) === 1 ? 'Active' : 'Inactive'}
          color={Number(p.is_active) === 1 ? 'success' : 'default'}
        />
      ),
    },
  ];

  return (
    <div>
      <ListToolbar
        search={q}
        onSearchChange={setQ}
        onAdd={hasPermission('products.create') ? openCreate : undefined}
        addLabel="Add Product"
        onRefresh={reload}
        refreshing={loading}
        extra={
          <InlineSelectFilter label="Category" value={categoryFilter} onChange={setCategoryFilter}>
            <MenuItem value="">All Categories</MenuItem>
            {categories.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.name}
              </MenuItem>
            ))}
          </InlineSelectFilter>
        }
      />

      <DataTable
        columns={columns}
        rows={data}
        rowKey={(p) => p.id}
        loading={loading}
        error={error}
        meta={meta}
        page={page}
        onPageChange={setPage}
        perPage={perPage}
        onPerPageChange={setPerPage}
        sort={sort}
        onSortChange={setSort}
        rowActions={
          hasPermission('products.update') || hasPermission('products.delete')
            ? (p) => (
                <>
                  {hasPermission('products.update') && (
                    <IconButton size="small" aria-label="Prices" onClick={() => openPricing(p)}>
                      <PriceChangeIcon fontSize="small" />
                    </IconButton>
                  )}
                  {hasPermission('products.update') && (
                    <IconButton size="small" aria-label="Edit" onClick={() => openEdit(p)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  )}
                  {hasPermission('products.delete') && (
                    <IconButton size="small" aria-label="Delete" color="error" onClick={() => deactivate(p)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  )}
                </>
              )
            : undefined
        }
      />

      <Modal open={showForm} title={editing ? 'Edit Product' : 'Add Product'} onClose={() => setShowForm(false)} wide>
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              submitForm();
            }}
          >
            <Grid container spacing={2} sx={{ pt: 1 }}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="SKU"
                  fullWidth
                  value={form.sku}
                  onChange={(e) => {
                    setForm({ ...form, sku: e.target.value });
                    clearField('sku');
                  }}
                  error={!!fieldErrors?.sku}
                  helperText={fieldErrors?.sku}
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Barcode"
                  fullWidth
                  value={form.barcode}
                  onChange={(e) => {
                    setForm({ ...form, barcode: e.target.value });
                    clearField('barcode');
                  }}
                  error={!!fieldErrors?.barcode}
                  helperText={fieldErrors?.barcode}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  label="Name"
                  fullWidth
                  value={form.name}
                  onChange={(e) => {
                    setForm({ ...form, name: e.target.value });
                    clearField('name');
                  }}
                  error={!!fieldErrors?.name}
                  helperText={fieldErrors?.name}
                  required
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  label="Description"
                  fullWidth
                  multiline
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  select
                  label="Category"
                  fullWidth
                  value={form.category_id}
                  onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                >
                  <MenuItem value="">— None —</MenuItem>
                  {categories.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  select
                  label="Unit"
                  fullWidth
                  value={form.unit_id}
                  onChange={(e) => setForm({ ...form, unit_id: e.target.value })}
                >
                  <MenuItem value="">— None —</MenuItem>
                  {units.map((u) => (
                    <MenuItem key={u.id} value={u.id}>
                      {u.name} ({u.abbreviation})
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  select
                  label="Tax Rate"
                  fullWidth
                  value={form.tax_rate_id}
                  onChange={(e) => setForm({ ...form, tax_rate_id: e.target.value })}
                >
                  <MenuItem value="">— None —</MenuItem>
                  {taxes.map((t) => (
                    <MenuItem key={t.id} value={t.id}>
                      {t.name} ({t.rate}%)
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Minimum Stock"
                  type="number"
                  fullWidth
                  slotProps={{ htmlInput: { step: '0.0001' } }}
                  value={form.minimum_stock}
                  onChange={(e) => {
                    setForm({ ...form, minimum_stock: e.target.value });
                    clearField('minimum_stock');
                  }}
                  error={!!fieldErrors?.minimum_stock}
                  helperText={fieldErrors?.minimum_stock}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={form.is_active}
                      onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                    />
                  }
                  label="Active"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={form.track_inventory}
                      onChange={(e) => setForm({ ...form, track_inventory: e.target.checked })}
                    />
                  }
                  label="Track Inventory"
                />
              </Grid>

              {formError && (
                <Grid size={{ xs: 12 }}>
                  <Alert severity="error">{formError}</Alert>
                </Grid>
              )}

              <Grid size={{ xs: 12 }}>
                <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'flex-end' }}>
                  <Button type="button" variant="text" onClick={() => setShowForm(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="contained" disabled={saving}>
                    {saving ? 'Saving…' : 'Save'}
                  </Button>
                </Stack>
              </Grid>
            </Grid>
          </form>
      </Modal>

      <Modal open={pricing !== null} title={pricingR ? `Prices: ${pricingR.name}` : ''} onClose={() => setPricing(null)}>
        {pricingR && (
          <>
            {pricesLoading ? (
              <Stack sx={{ alignItems: 'center', py: 4 }}>
                <CircularProgress size={22} />
              </Stack>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Store</TableCell>
                    <TableCell align="right">Cost</TableCell>
                    <TableCell align="right">Price</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {prices.map((row) => (
                    <TableRow key={row.store_id}>
                      <TableCell>{row.store_name}</TableCell>
                      <TableCell align="right">
                        <TextField
                          type="number"
                          size="small"
                          slotProps={{ htmlInput: { step: '0.01', style: { textAlign: 'right' } } }}
                          value={row.cost_price ?? ''}
                          onChange={(e) => updatePriceRow(row.store_id, 'cost_price', e.target.value)}
                          sx={{ width: 110 }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <TextField
                          type="number"
                          size="small"
                          slotProps={{ htmlInput: { step: '0.01', style: { textAlign: 'right' } } }}
                          value={row.selling_price ?? ''}
                          onChange={(e) => updatePriceRow(row.store_id, 'selling_price', e.target.value)}
                          sx={{ width: 110 }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {pricesError && (
              <Alert severity="error" sx={{ mt: 1.5 }}>
                {pricesError}
              </Alert>
            )}

            <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'flex-end', mt: 2 }}>
              <Button type="button" variant="text" onClick={() => setPricing(null)}>
                Close
              </Button>
              <Button type="button" variant="contained" onClick={savePrices} disabled={pricesSaving || pricesLoading}>
                {pricesSaving ? 'Saving…' : 'Save Prices'}
              </Button>
            </Stack>
          </>
        )}
      </Modal>
    </div>
  );
}
