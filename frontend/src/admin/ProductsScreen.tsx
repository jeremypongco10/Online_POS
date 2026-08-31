import { useEffect, useState } from 'react';
import { api, ApiError, assetUrl } from '../api/client';
import type { Category, Product, Store, TaxRate, Unit } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { useConfirm } from '../ConfirmDialog';
import { useSnackbar } from '../Snackbar';
import { useList } from './useList';
import { DataTable, type Column } from './DataTable';
import { ListToolbar } from './ListToolbar';
import { InlineSelectFilter } from './InlineSelectFilter';
import { Modal } from './Modal';
import { ProductEditModal } from './ProductEditModal';
import { ProductPricesModal } from './ProductPricesModal';
import { DetailView, StatusChip } from './DetailView';
import { ImageHoverPreview } from './ImageHoverPreview';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Chip from '@mui/material/Chip';
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
  const [pricingProduct, setPricingProduct] = useState<Product | null>(null);

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

  const columns: Column<Product>[] = [
    {
      key: 'image',
      label: '',
      width: 52,
      render: (p) => (
        <ImageHoverPreview src={p.image_path ? assetUrl(p.image_path) : undefined}>
          <Avatar
            variant="rounded"
            src={p.image_path ? assetUrl(p.image_path) : undefined}
            sx={{ width: 36, height: 36, bgcolor: 'action.hover', color: 'text.disabled' }}
          >
            <ImageNotSupportedOutlinedIcon fontSize="small" />
          </Avatar>
        </ImageHoverPreview>
      ),
    },
    { key: 'sku', label: 'SKU', sortKey: 'sku' },
    { key: 'name', label: 'Name', sortKey: 'name' },
    { key: 'category', label: 'Category', sortKey: 'category', render: (p) => categoryName(p.category_id) },
    {
      key: 'is_active',
      label: 'Status',
      width: 120,
      sortKey: 'is_active',
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
          <>
            <InlineSelectFilter
              label="Category"
              compactOnMobile
              value={categoryFilter}
              onChange={setCategoryFilter}
              options={[{ value: '', label: 'All Categories' }, ...categories.map((c) => ({ value: String(c.id), label: c.name }))]}
            />
            <InlineSelectFilter
              label="Status"
              compactOnMobile
              value={statusFilter}
              onChange={setStatusFilter}
              minWidth={140}
              options={[
                { value: '', label: 'All' },
                { value: '1', label: 'Active' },
                { value: '0', label: 'Inactive' },
              ]}
            />
          </>
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
              <IconButton size="small" aria-label={canEditPrices ? 'Prices' : 'View Prices'} onClick={() => setPricingProduct(p)}>
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

      <ProductPricesModal
        product={pricingProduct}
        canEdit={canEditPrices}
        myStores={myStores}
        onClose={() => setPricingProduct(null)}
      />

      <Modal open={!!viewing} title="View Product" onClose={() => setViewing(null)} compact>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center', mb: 2.5 }}>
          <ImageHoverPreview src={viewing?.image_path ? assetUrl(viewing.image_path) : undefined}>
            <Avatar
              variant="rounded"
              src={viewing?.image_path ? assetUrl(viewing.image_path) : undefined}
              sx={{ width: 64, height: 64, bgcolor: 'action.hover', color: 'text.disabled', flexShrink: 0 }}
            >
              <ImageNotSupportedOutlinedIcon />
            </Avatar>
          </ImageHoverPreview>
          <Stack sx={{ minWidth: 0 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, wordBreak: 'break-word' }}>
              {viewing?.name}
            </Typography>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={{ xs: 0.5, sm: 0.75 }}
              sx={{ alignItems: { xs: 'flex-start', sm: 'center' }, mt: 0.5, flexWrap: 'wrap', rowGap: 0.5 }}
            >
              <Chip size="small" variant="outlined" label={`SKU: ${viewing?.sku ?? '—'}`} />
              {viewing?.barcode && <Chip size="small" variant="outlined" label={`Barcode: ${viewing.barcode}`} />}
              {viewing && <StatusChip active={Number(viewing.is_active) === 1} />}
            </Stack>
          </Stack>
        </Stack>
        <DetailView
          dense
          fields={[
            { label: 'Category', value: viewing ? categoryName(viewing.category_id) : undefined },
            { label: 'Unit', value: viewing ? unitName(viewing.unit_id) : undefined },
            { label: 'Tax Rate', value: viewing ? taxName(viewing.tax_rate_id) : undefined },
            { label: 'Minimum Stock', value: viewing?.minimum_stock },
            { label: 'Track Inventory', value: viewing ? (Number(viewing.track_inventory) === 1 ? 'Yes' : 'No') : undefined },
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
