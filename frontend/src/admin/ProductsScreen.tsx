import { useEffect, useState } from 'react';
import { api, ApiError, assetUrl } from '../api/client';
import type { Category, Product, Store, StoreProductPrice, TaxRate, Unit } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { useConfirm } from '../ConfirmDialog';
import { useSnackbar } from '../Snackbar';
import { useList } from './useList';
import { useRetained } from './useRetained';
import { DataTable, type Column } from './DataTable';
import { ListToolbar } from './ListToolbar';
import { InlineSelectFilter } from './InlineSelectFilter';
import { Modal } from './Modal';
import { ProductEditModal } from './ProductEditModal';
import { DetailView, StatusChip } from './DetailView';
import { formatMoney } from '../pos/format';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import CircularProgress from '@mui/material/CircularProgress';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PriceChangeIcon from '@mui/icons-material/PriceChange';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import ImageNotSupportedOutlinedIcon from '@mui/icons-material/ImageNotSupportedOutlined';

export function ProductsScreen() {
  const { hasPermission } = useAuth();
  const confirm = useConfirm();
  const notify = useSnackbar();
  const canEditPrices = hasPermission('products.update');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const { data, meta, loading, error, page, setPage, perPage, setPerPage, sort, setSort, q, setQ, reload } = useList<Product>('/products', {
    category_id: categoryFilter,
    is_active: statusFilter,
  });

  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [taxes, setTaxes] = useState<TaxRate[]>([]);
  // GET /stores is scoped server-side to whatever store(s) the caller is
  // restricted to (see StoresController's storeColumn scoping) — a
  // company-wide user gets every store back, a user tied to one store via
  // user_stores gets just that one. Fetched once so a view-only viewer's
  // Prices dialog can be narrowed to their own store(s) below, rather than
  // exposing every store's pricing to someone who can't edit it anyway.
  // null means "not resolved yet" (still loading, or the call failed
  // because this viewer lacks the separate stores.view permission) — that
  // must NOT be treated the same as "resolved to zero stores", or a
  // viewer who's actually unrestricted but merely lacks stores.view would
  // wrongly see every price hidden instead of all of them.
  const [myStores, setMyStores] = useState<Store[] | null>(null);

  const [editing, setEditing] = useState<Product | null>(null);
  const [viewing, setViewing] = useState<Product | null>(null);

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
    // No .catch() falling back to [] here on purpose — that would resolve
    // to "zero stores" and hit the exact bug the null state above exists
    // to avoid. Swallow the rejection and leave it null (== unresolved).
    api
      .get<Store[]>('/stores?per_page=50&is_active=1')
      .then(setMyStores)
      .catch(() => {});
  }, []);

  // Full price-edit access already sees every company store's pricing
  // (unchanged) — a view-only user is narrowed to just their own
  // store(s), the "dedicated store" restriction above pares down to.
  // While that scope is still unresolved (see the null case above),
  // fall back to showing every store rather than hiding all of them.
  // Number(...) on both sides because GET /stores serializes `id` as a
  // JSON string ("3") while GET /products/{id}/prices serializes
  // `store_id` as a number (3) — a plain === would never match either
  // way, silently hiding every price for every view-only viewer.
  const visiblePrices =
    canEditPrices || myStores === null
      ? prices
      : prices.filter((r) => myStores.some((s) => Number(s.id) === Number(r.store_id)));

  const categoryName = (id: number | null) => categories.find((c) => c.id === id)?.name ?? '—';
  const unitName = (id: number | null) => units.find((u) => u.id === id)?.name ?? '—';
  const taxName = (id: number | null) => {
    const t = taxes.find((tax) => tax.id === id);
    return t ? `${t.name} (${t.rate}%)` : '—';
  };

  // Fires for a field save AND for a photo upload/remove — the latter two
  // don't close the modal (ProductEditModal only calls onClose() itself
  // after a successful field save), so this must keep it open with the
  // fresh product rather than unconditionally clearing `editing`.
  function handleSaved(updated: Product) {
    setEditing(updated);
    reload();
    if (viewing?.id === updated.id) setViewing(updated);
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
    {
      key: 'image',
      label: '',
      width: 52,
      render: (p) => (
        <Avatar
          variant="rounded"
          src={p.image_path ? assetUrl(p.image_path) : undefined}
          sx={{ width: 36, height: 36, bgcolor: 'action.hover', color: 'text.disabled' }}
        >
          <ImageNotSupportedOutlinedIcon fontSize="small" />
        </Avatar>
      ),
    },
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
        onRefresh={reload}
        refreshing={loading}
        extra={
          <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
            <InlineSelectFilter
              label="Category"
              value={categoryFilter}
              onChange={setCategoryFilter}
              options={[{ value: '', label: 'All Categories' }, ...categories.map((c) => ({ value: String(c.id), label: c.name }))]}
            />
            <InlineSelectFilter
              label="Status"
              value={statusFilter}
              onChange={setStatusFilter}
              minWidth={140}
              options={[
                { value: '', label: 'All' },
                { value: '1', label: 'Active' },
                { value: '0', label: 'Inactive' },
              ]}
            />
          </Stack>
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
        rowActions={(p) => (
          <>
            <Tooltip title="View">
              <IconButton size="small" aria-label="View" onClick={() => setViewing(p)}>
                <VisibilityOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={canEditPrices ? 'Prices' : 'View Prices'}>
              <IconButton size="small" aria-label={canEditPrices ? 'Prices' : 'View Prices'} onClick={() => openPricing(p)}>
                <PriceChangeIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            {hasPermission('products.update') && (
              <Tooltip title="Edit">
                <IconButton size="small" aria-label="Edit" onClick={() => setEditing(p)}>
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {hasPermission('products.delete') && (
              <Tooltip title="Delete">
                <IconButton size="small" aria-label="Delete" color="error" onClick={() => deactivate(p)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </>
        )}
      />

      <ProductEditModal product={editing} categories={categories} units={units} taxes={taxes} onClose={() => setEditing(null)} onSaved={handleSaved} />

      <Modal open={pricing !== null} title={pricingR ? `Prices: ${pricingR.name}` : ''} onClose={() => setPricing(null)}>
        {pricingR && (
          <>
            {pricesLoading ? (
              <Stack sx={{ alignItems: 'center', py: 4 }}>
                <CircularProgress size={22} />
              </Stack>
            ) : visiblePrices.length === 0 ? (
              <Typography color="text.secondary" sx={{ py: 2 }}>
                You aren't assigned to a store, so there's no price to show here.
              </Typography>
            ) : (
              <TableContainer>
                <Table size="small" sx={{ minWidth: 460 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Store</TableCell>
                    <TableCell align="right">Cost</TableCell>
                    <TableCell align="right">Price</TableCell>
                    <TableCell align="right">Profit</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {visiblePrices.map((row) => (
                    <TableRow key={row.store_id}>
                      <TableCell>{row.store_name}</TableCell>
                      <TableCell align="right">
                        {canEditPrices ? (
                          <TextField
                            type="number"
                            size="small"
                            slotProps={{ htmlInput: { step: '0.01', style: { textAlign: 'right' } } }}
                            value={row.cost_price ?? ''}
                            onChange={(e) => updatePriceRow(row.store_id, 'cost_price', e.target.value)}
                            sx={{ width: 110 }}
                          />
                        ) : (
                          <Typography variant="body2">{row.cost_price ? formatMoney(parseFloat(row.cost_price)) : '—'}</Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        {canEditPrices ? (
                          <TextField
                            type="number"
                            size="small"
                            slotProps={{ htmlInput: { step: '0.01', style: { textAlign: 'right' } } }}
                            value={row.selling_price ?? ''}
                            onChange={(e) => updatePriceRow(row.store_id, 'selling_price', e.target.value)}
                            sx={{ width: 110 }}
                          />
                        ) : (
                          <Typography variant="body2">{row.selling_price ? formatMoney(parseFloat(row.selling_price)) : '—'}</Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        {(() => {
                          const cost = parseFloat(row.cost_price ?? '') || 0;
                          const price = parseFloat(row.selling_price ?? '') || 0;
                          const profit = price - cost;
                          // Margin is relative to the selling price (not cost) — the
                          // conventional definition, and undefined at price 0.
                          const margin = price > 0 ? (profit / price) * 100 : null;
                          const color = profit > 0 ? 'success.main' : profit < 0 ? 'error.main' : 'text.secondary';
                          return (
                            <Stack sx={{ alignItems: 'flex-end' }}>
                              <Typography variant="body2" sx={{ fontWeight: 600, color }}>
                                {formatMoney(profit)}
                              </Typography>
                              {margin !== null && (
                                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                  {margin.toFixed(1)}%
                                </Typography>
                              )}
                            </Stack>
                          );
                        })()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                </Table>
              </TableContainer>
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
              {canEditPrices && (
                <Button type="button" variant="contained" onClick={savePrices} disabled={pricesSaving || pricesLoading}>
                  {pricesSaving ? 'Saving…' : 'Save Prices'}
                </Button>
              )}
            </Stack>
          </>
        )}
      </Modal>

      <Modal open={!!viewing} title="View Product" onClose={() => setViewing(null)} compact>
        <Avatar
          variant="rounded"
          src={viewing?.image_path ? assetUrl(viewing.image_path) : undefined}
          sx={{ width: 96, height: 96, mb: 2, bgcolor: 'action.hover', color: 'text.disabled' }}
        >
          <ImageNotSupportedOutlinedIcon />
        </Avatar>
        <DetailView
          fields={[
            { label: 'SKU', value: viewing?.sku },
            { label: 'Barcode', value: viewing?.barcode },
            { label: 'Name', value: viewing?.name },
            { label: 'Category', value: viewing ? categoryName(viewing.category_id) : undefined },
            { label: 'Unit', value: viewing ? unitName(viewing.unit_id) : undefined },
            { label: 'Tax Rate', value: viewing ? taxName(viewing.tax_rate_id) : undefined },
            { label: 'Minimum Stock', value: viewing?.minimum_stock },
            { label: 'Track Inventory', value: viewing ? (Number(viewing.track_inventory) === 1 ? 'Yes' : 'No') : undefined },
            { label: 'Status', value: viewing ? <StatusChip active={Number(viewing.is_active) === 1} /> : undefined },
            { label: 'Description', value: viewing?.description, fullWidth: true },
          ]}
        />
        <Stack direction="row" sx={{ justifyContent: 'flex-end', mt: 3 }}>
          <Button variant="text" onClick={() => setViewing(null)}>
            Close
          </Button>
        </Stack>
      </Modal>
    </div>
  );
}
