import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { api, ApiError, assetUrl } from '../api/client';
import type { Category, Inventory, Product, Store, StoreProductPrice, TaxRate, Unit } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { useSnackbar } from '../Snackbar';
import { DetailView, StatusChip } from './DetailView';
import { ProductEditModal } from './ProductEditModal';
import { SearchableSelect } from './SearchableSelect';
import { ImageHoverPreview } from './ImageHoverPreview';
import { formatMoney } from '../pos/format';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Tooltip from '@mui/material/Tooltip';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import SearchIcon from '@mui/icons-material/Search';
import QrCodeScannerOutlinedIcon from '@mui/icons-material/QrCodeScannerOutlined';
import ImageNotSupportedOutlinedIcon from '@mui/icons-material/ImageNotSupportedOutlined';
import SearchOffOutlinedIcon from '@mui/icons-material/SearchOffOutlined';
import ReplayOutlinedIcon from '@mui/icons-material/ReplayOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';

interface StoreRow {
  store_id: number;
  store_name: string;
  quantity: string | null;
  reorder_level: string | null;
  cost_price: string | null;
  selling_price: string | null;
}

// Chrome/Safari draw a spinner overlapping the right edge of a number
// input, and Firefox reserves space for one even when hidden — both push
// right-aligned digits left of where they'd otherwise sit, so they no
// longer line up with the plain (non-editable) Typography values above
// and below them in the same card. Hiding the spinner altogether keeps
// every amount flush against the same right edge.
const priceFieldSx = {
  width: 96,
  '& input[type=number]': { MozAppearance: 'textfield' },
  '& input[type=number]::-webkit-outer-spin-button, & input[type=number]::-webkit-inner-spin-button': {
    WebkitAppearance: 'none',
    margin: 0,
  },
};

/**
 * A scan-and-lookup tool, distinct from the Products tab's paginated list:
 * one search resolves to one product, shown with everything a cashier or
 * stocktaker would otherwise have to open two separate screens for — the
 * product's own fields, AND its stock level and price at every store,
 * combined into a single table.
 */
export function ProductLookupScreen() {
  const notify = useSnackbar();
  const { hasPermission } = useAuth();
  const canViewInventory = hasPermission('inventory.view');
  const canEditPrices = hasPermission('products.update');
  const inputRef = useRef<HTMLInputElement>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [taxes, setTaxes] = useState<TaxRate[]>([]);
  // Same store-scoping as ProductsScreen's Prices dialog: GET /stores is
  // scoped server-side to whatever store(s) the caller is restricted to,
  // so a view-only, store-restricted viewer (e.g. a Store Admin tied to
  // one store) sees only their own store's price here instead of every
  // store in the company. null = not resolved yet (still loading, or the
  // call failed because this viewer lacks stores.view) — must NOT be
  // treated as "zero stores", or an unrestricted viewer who merely lacks
  // stores.view would wrongly see every price hidden instead of all of them.
  const [myStores, setMyStores] = useState<Store[] | null>(null);

  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [candidates, setCandidates] = useState<Product[]>([]);

  const [selected, setSelected] = useState<Product | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [storeRows, setStoreRows] = useState<StoreRow[]>([]);
  const [editing, setEditing] = useState<Product | null>(null);
  const [pricesDirty, setPricesDirty] = useState(false);
  const [pricesSaving, setPricesSaving] = useState(false);

  useEffect(() => {
    api.get<Category[]>('/categories?per_page=200').then(setCategories);
    api.get<Unit[]>('/units?per_page=100').then(setUnits);
    api.get<TaxRate[]>('/taxes?per_page=100').then(setTaxes);
    // No .catch() falling back to [] on purpose — see the null case above.
    api
      .get<Store[]>('/stores?per_page=50&is_active=1')
      .then(setMyStores)
      .catch(() => {});
    inputRef.current?.focus();
  }, []);

  const categoryName = (id: number | null) => categories.find((c) => c.id === id)?.name ?? '—';
  const unitName = (id: number | null) => units.find((u) => u.id === id)?.name ?? '—';
  const taxName = (id: number | null) => {
    const t = taxes.find((tax) => tax.id === id);
    return t ? `${t.name} (${t.rate}%)` : '—';
  };

  async function runSearch() {
    const term = query.trim();
    if (!term && !categoryId && !statusFilter) return;

    setSearching(true);
    setSearched(false);
    setCandidates([]);
    setSelected(null);
    try {
      const params = new URLSearchParams({ per_page: '25' });
      if (term) params.set('q', term);
      if (categoryId) params.set('category_id', categoryId);
      if (statusFilter) params.set('is_active', statusFilter);
      const { data } = await api.getPaged<Product>(`/products?${params.toString()}`);

      // A scanned barcode (or a typed exact SKU) should resolve straight to
      // the product, not force a pick from a list it happens to also be in
      // — only meaningful when the caller actually typed/scanned something,
      // not when they're just browsing a category.
      const exact = term
        ? data.find((p) => p.sku.toLowerCase() === term.toLowerCase() || (p.barcode ?? '').toLowerCase() === term.toLowerCase())
        : undefined;

      if (exact) {
        await selectProduct(exact);
      } else if (data.length === 1) {
        await selectProduct(data[0]);
      } else {
        setCandidates(data);
        setSearched(true);
      }
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Search failed', 'error');
    } finally {
      setSearching(false);
    }
  }

  async function selectProduct(product: Product) {
    setSelected(product);
    // Deliberately not clearing candidates here — if this selection came
    // from a multi-result list, keeping it around (just hidden while
    // `selected` is set, see the render below) lets "Back to results"
    // return to it without re-running the search.
    setSearched(true);
    setDetailLoading(true);
    try {
      // Fetched independently, not via Promise.all — a viewer who can see
      // prices (products.view, already required just to be on this tab)
      // but lacks inventory.view would otherwise have the whole detail
      // view fail because of the one call they're not allowed to make.
      const pricesPromise = api.get<StoreProductPrice[]>(`/products/${product.id}/prices`);
      const inventoryPromise = canViewInventory
        ? api.get<Inventory[]>(`/inventory?product_id=${product.id}&per_page=100`).catch(() => [] as Inventory[])
        : Promise.resolve([] as Inventory[]);

      const [prices, inventory] = await Promise.all([pricesPromise, inventoryPromise]);
      const invByStore = new Map(inventory.map((row) => [row.store_id, row]));
      setStoreRows(
        prices.map((p) => ({
          store_id: p.store_id,
          store_name: p.store_name,
          cost_price: p.cost_price,
          selling_price: p.selling_price,
          quantity: invByStore.get(p.store_id)?.quantity ?? null,
          reorder_level: invByStore.get(p.store_id)?.reorder_level ?? null,
        }))
      );
      setPricesDirty(false);
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Failed to load product detail', 'error');
    } finally {
      setDetailLoading(false);
    }
  }

  function updatePriceField(storeId: number, field: 'cost_price' | 'selling_price', value: string) {
    setStoreRows((rows) => rows.map((r) => (r.store_id === storeId ? { ...r, [field]: value } : r)));
    setPricesDirty(true);
  }

  async function savePrices() {
    if (!selected) return;
    setPricesSaving(true);
    try {
      const updated = await api.put<StoreProductPrice[]>(`/products/${selected.id}/prices`, {
        prices: storeRows.map((r) => ({
          store_id: r.store_id,
          cost_price: r.cost_price || '0',
          selling_price: r.selling_price || '0',
        })),
      });
      setStoreRows((rows) =>
        rows.map((r) => {
          const p = updated.find((u) => u.store_id === r.store_id);
          return p ? { ...r, cost_price: p.cost_price, selling_price: p.selling_price } : r;
        })
      );
      setPricesDirty(false);
      notify('Prices updated');
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Failed to save prices', 'error');
    } finally {
      setPricesSaving(false);
    }
  }

  function reset() {
    setQuery('');
    setCategoryId('');
    setStatusFilter('');
    setSearched(false);
    setCandidates([]);
    setSelected(null);
    setStoreRows([]);
    setPricesDirty(false);
    inputRef.current?.focus();
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      runSearch();
    }
  }

  // Also fires for a photo upload/remove, which don't close the modal
  // (ProductEditModal only calls onClose() itself after a field save) —
  // so this keeps `editing` set to the fresh product rather than clearing
  // it, and refreshes the detail header (candidates.length is 0 here since
  // this only ever runs while a single product is already selected).
  function handleSaved(updated: Product) {
    setSelected(updated);
    setEditing(updated);
  }

  const idle = !searched && !searching;
  const selectedCategoryName = categories.find((c) => String(c.id) === categoryId)?.name;
  // Edit access already sees every company store's stock/pricing
  // (unchanged) — a view-only viewer is narrowed to just their own
  // store(s). Number(...) on both sides because GET /stores serializes
  // id as a string while this row's store_id is a number — a plain ===
  // would never match either way, silently hiding every row.
  const visibleStoreRows =
    canEditPrices || myStores === null
      ? storeRows
      : storeRows.filter((r) => myStores.some((s) => Number(s.id) === Number(r.store_id)));
  const filterDescriptions = [selectedCategoryName, statusFilter === '1' ? 'Active' : statusFilter === '0' ? 'Inactive' : null].filter(
    (v): v is string => !!v
  );

  const searchBar = (
    // alignItems: 'center' at sm+ — Stack defaults to flexbox's 'stretch',
    // which (since TextField/SearchableSelect reach their 48px look via an
    // inner input box, not their outer root) let the row's overall height
    // grow past 48px to whatever the tallest child's true outer height is,
    // then stretched every *other* unconstrained child (both buttons) to
    // match — the exact source of the uneven heights/gap below, not
    // something a height fix on one button alone could resolve.
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} sx={{ alignItems: { xs: 'stretch', sm: 'center' } }}>
      <TextField
        inputRef={inputRef}
        fullWidth
        placeholder="Scan a barcode, or type a SKU / name…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={onKeyDown}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <QrCodeScannerOutlinedIcon fontSize="small" sx={{ color: 'primary.main' }} />
              </InputAdornment>
            ),
            sx: { bgcolor: 'background.paper', borderRadius: 3, height: 48, fontSize: '0.95rem' },
          },
        }}
      />
      <SearchableSelect
        placeholder="All categories"
        value={categoryId}
        onChange={setCategoryId}
        options={categories.map((c) => ({ value: String(c.id), label: c.name }))}
        sx={{
          width: { xs: '100%', sm: 220 },
          flexShrink: 0,
          '& .MuiInputBase-root': { bgcolor: 'background.paper', borderRadius: 3, height: 48 },
        }}
      />
      <SearchableSelect
        placeholder="Any status"
        value={statusFilter}
        onChange={setStatusFilter}
        options={[
          { value: '1', label: 'Active' },
          { value: '0', label: 'Inactive' },
        ]}
        sx={{
          width: { xs: '100%', sm: 160 },
          flexShrink: 0,
          '& .MuiInputBase-root': { bgcolor: 'background.paper', borderRadius: 3, height: 48 },
        }}
      />
      <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
        <Button
          variant="contained"
          startIcon={!searching ? <SearchIcon fontSize="small" /> : undefined}
          onClick={runSearch}
          disabled={searching || (!query.trim() && !categoryId && !statusFilter)}
          sx={{ borderRadius: 3, px: 2.5, height: 48, flexShrink: 0, flex: { xs: 1, sm: 'initial' } }}
        >
          {searching ? <CircularProgress size={18} sx={{ color: 'inherit' }} /> : 'Search'}
        </Button>
        {(selected || candidates.length > 0) && (
          <Button
            startIcon={<ReplayOutlinedIcon fontSize="small" />}
            onClick={reset}
            sx={{ borderRadius: 3, height: 48, flexShrink: 0, flex: { xs: 1, sm: 'initial' } }}
          >
            New Search
          </Button>
        )}
      </Stack>
    </Stack>
  );

  return (
    <Box>
      {idle ? (
        <Box
          sx={{
            minHeight: '60vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            px: 2,
          }}
        >
          <Box
            sx={{
              width: 72,
              height: 72,
              mb: 2.5,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'color-mix(in srgb, var(--mui-palette-primary-main) 12%, transparent)',
            }}
          >
            <QrCodeScannerOutlinedIcon sx={{ fontSize: 34, color: 'primary.main' }} />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Find any product instantly
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 1, mb: 4, maxWidth: 460 }}>
            Search by name, SKU, or scan a barcode — or narrow it down by category — to see full details, stock, and pricing
            across every store.
          </Typography>
          <Box sx={{ width: '100%', maxWidth: 900 }}>{searchBar}</Box>
        </Box>
      ) : (
        <Paper
          variant="outlined"
          sx={{
            p: 1,
            mb: 2,
            borderRadius: 4,
            background: 'linear-gradient(135deg, color-mix(in srgb, var(--mui-palette-primary-main) 6%, var(--mui-palette-background-paper)), var(--mui-palette-background-paper))',
          }}
        >
          {searchBar}
        </Paper>
      )}

      {searched && !selected && candidates.length === 0 && (
        <Paper variant="outlined" sx={{ p: 4, maxWidth: 640, mx: 'auto', borderRadius: 4, textAlign: 'center' }}>
          <SearchOffOutlinedIcon sx={{ fontSize: 32, color: 'text.disabled', mb: 1 }} />
          <Typography color="text.secondary">
            {query.trim() && filterDescriptions.length > 0
              ? `No product matches "${query.trim()}" in ${filterDescriptions.join(', ')}.`
              : query.trim()
                ? `No product matches "${query.trim()}".`
                : `No products found in ${filterDescriptions.join(', ')}.`}
          </Typography>
        </Paper>
      )}

      {candidates.length > 0 && !selected && (
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {candidates.length} matches — pick one
          </Typography>
          <Grid container spacing={1.5}>
            {candidates.map((p) => (
              <Grid key={p.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                <Paper
                  variant="outlined"
                  onClick={() => selectProduct(p)}
                  sx={{
                    p: 1.5,
                    borderRadius: 3,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    cursor: 'pointer',
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease',
                    '&:hover': {
                      borderColor: 'primary.main',
                      boxShadow: '0 8px 20px -8px rgba(16, 24, 40, 0.18)',
                      transform: 'translateY(-1px)',
                    },
                  }}
                >
                  <ImageHoverPreview src={p.image_path ? assetUrl(p.image_path) : undefined}>
                    <Avatar
                      variant="rounded"
                      src={p.image_path ? assetUrl(p.image_path) : undefined}
                      sx={{ width: 44, height: 44, bgcolor: 'action.hover', color: 'text.disabled', flexShrink: 0 }}
                    >
                      <ImageNotSupportedOutlinedIcon fontSize="small" />
                    </Avatar>
                  </ImageHoverPreview>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
                      {p.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                      {p.sku}
                      {p.barcode ? ` · ${p.barcode}` : ''}
                    </Typography>
                  </Box>
                  <ChevronRightRoundedIcon sx={{ color: 'text.disabled', flexShrink: 0 }} />
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {selected && (
        <Paper variant="outlined" sx={{ borderRadius: 4, overflow: 'hidden' }}>
          <Box
            sx={{
              p: 3,
              background: 'linear-gradient(135deg, color-mix(in srgb, var(--mui-palette-primary-main) 8%, transparent), transparent)',
            }}
          >
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { xs: 'stretch', sm: 'center' } }}>
              <Stack direction="row" spacing={2} sx={{ alignItems: 'center', minWidth: 0, flex: 1 }}>
                <ImageHoverPreview src={selected.image_path ? assetUrl(selected.image_path) : undefined}>
                  <Avatar
                    variant="rounded"
                    src={selected.image_path ? assetUrl(selected.image_path) : undefined}
                    sx={{
                      width: { xs: 56, sm: 72 },
                      height: { xs: 56, sm: 72 },
                      flexShrink: 0,
                      bgcolor: 'action.hover',
                      color: 'text.disabled',
                      boxShadow: '0 0 0 3px var(--mui-palette-background-paper), 0 0 0 4px color-mix(in srgb, var(--mui-palette-primary-main) 25%, transparent)',
                    }}
                  >
                    <ImageNotSupportedOutlinedIcon />
                  </Avatar>
                </ImageHoverPreview>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700 }} noWrap>
                    {selected.name}
                  </Typography>
                  {/* Column on mobile — a narrow, wrapping row can leave a
                      later chip landing mid-line with no shared left edge
                      to line up against; stacking guarantees every chip
                      starts at the same x regardless of its own width. */}
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={{ xs: 0.5, sm: 1 }}
                    sx={{ alignItems: { xs: 'flex-start', sm: 'center' }, mt: 0.5, flexWrap: 'wrap', rowGap: 0.5 }}
                  >
                    <Chip size="small" label={`SKU: ${selected.sku}`} />
                    {selected.barcode && <Chip size="small" label={`Barcode: ${selected.barcode}`} />}
                    <StatusChip active={Number(selected.is_active) === 1} />
                  </Stack>
                </Box>
              </Stack>
              {(candidates.length > 0 || hasPermission('products.update')) && (
                <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
                  {candidates.length > 0 && (
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<ArrowBackRoundedIcon fontSize="small" />}
                      onClick={() => setSelected(null)}
                      sx={{ flexShrink: 0, flex: { xs: 1, sm: 'initial' }, borderRadius: 3, bgcolor: 'background.paper' }}
                    >
                      Back to Results
                    </Button>
                  )}
                  {hasPermission('products.update') && (
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<EditOutlinedIcon fontSize="small" />}
                      onClick={() => setEditing(selected)}
                      sx={{ flexShrink: 0, flex: { xs: 1, sm: 'initial' }, borderRadius: 3, bgcolor: 'background.paper' }}
                    >
                      Edit
                    </Button>
                  )}
                </Stack>
              )}
            </Stack>
          </Box>

          <Box sx={{ p: 3, pt: 2.5 }}>
            <DetailView
              dense
              fields={[
                { label: 'Category', value: categoryName(selected.category_id) },
                { label: 'Unit', value: unitName(selected.unit_id) },
                { label: 'Tax Rate', value: taxName(selected.tax_rate_id) },
                { label: 'Minimum Stock', value: selected.minimum_stock },
                { label: 'Track Inventory', value: Number(selected.track_inventory) === 1 ? 'Yes' : 'No' },
                { label: 'Description', value: selected.description, fullWidth: true },
              ]}
            />

            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between', mt: 3, mb: 1.5 }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <StorefrontOutlinedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  Stock &amp; Price by Store
                </Typography>
              </Stack>
              {canEditPrices && pricesDirty && (
                <Button size="small" variant="contained" onClick={savePrices} disabled={pricesSaving} sx={{ borderRadius: 3 }}>
                  {pricesSaving ? <CircularProgress size={16} sx={{ color: 'inherit' }} /> : 'Save Prices'}
                </Button>
              )}
            </Stack>

            {detailLoading ? (
              <Stack sx={{ alignItems: 'center', py: 3 }}>
                <CircularProgress size={22} />
              </Stack>
            ) : (
              <Grid container spacing={1.5}>
                {visibleStoreRows.map((row) => {
                  const qty = row.quantity !== null ? parseFloat(row.quantity) : null;
                  const reorder = row.reorder_level !== null ? parseFloat(row.reorder_level) : null;
                  const low = qty !== null && reorder !== null && qty <= reorder;
                  const cost = parseFloat(row.cost_price ?? '') || 0;
                  const price = parseFloat(row.selling_price ?? '') || 0;
                  const profit = price - cost;
                  const hasPrice = !!(row.cost_price || row.selling_price);
                  const profitColor = profit > 0 ? 'success.main' : profit < 0 ? 'error.main' : 'text.secondary';
                  // Margin relative to the selling price (the conventional
                  // definition) — undefined at price 0, and only worth
                  // showing once there's an actual price to be a % of.
                  const margin = hasPrice && price > 0 ? (profit / price) * 100 : null;

                  return (
                    <Grid key={row.store_id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                      <Paper
                        variant="outlined"
                        sx={{
                          p: 2,
                          borderRadius: 3,
                          height: '100%',
                          transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                          borderColor: low ? 'warning.main' : undefined,
                          '&:hover': { borderColor: low ? 'warning.main' : 'primary.main' },
                        }}
                      >
                        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', mb: 1.25 }}>
                          <StorefrontOutlinedIcon sx={{ fontSize: 16, color: 'text.disabled', flexShrink: 0 }} />
                          <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
                            {row.store_name}
                          </Typography>
                        </Stack>

                        <Stack direction="row" sx={{ alignItems: 'baseline', justifyContent: 'space-between' }}>
                          <Typography variant="caption" color="text.secondary">
                            Stock
                          </Typography>
                          {qty === null ? (
                            <Tooltip title={canViewInventory ? '' : "You don't have permission to view stock levels"}>
                              <Typography variant="body2" color="text.secondary" sx={{ cursor: canViewInventory ? 'default' : 'help' }}>
                                —
                              </Typography>
                            </Tooltip>
                          ) : (
                            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                              <Typography variant="body1" sx={{ fontWeight: 700, color: low ? 'warning.main' : 'text.primary' }}>
                                {qty}
                              </Typography>
                              {low && (
                                <Tooltip title="At or below reorder level">
                                  <WarningAmberRoundedIcon sx={{ fontSize: 16, color: 'warning.main' }} />
                                </Tooltip>
                              )}
                            </Stack>
                          )}
                        </Stack>
                        {reorder !== null && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'right', mt: -0.25 }}>
                            reorder at {reorder}
                          </Typography>
                        )}

                        <Divider sx={{ my: 1.25 }} />

                        <Stack spacing={0.75}>
                          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                            <Typography variant="caption" color="text.secondary">
                              Cost
                            </Typography>
                            {canEditPrices ? (
                              <TextField
                                type="number"
                                size="small"
                                variant="standard"
                                slotProps={{
                                  htmlInput: { step: '0.01', style: { textAlign: 'right', fontSize: '0.8rem' } },
                                }}
                                value={row.cost_price ?? ''}
                                onChange={(e) => updatePriceField(row.store_id, 'cost_price', e.target.value)}
                                sx={priceFieldSx}
                              />
                            ) : (
                              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                                {row.cost_price ? formatMoney(cost) : '—'}
                              </Typography>
                            )}
                          </Stack>
                          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                            <Typography variant="caption" color="text.secondary">
                              Price
                            </Typography>
                            {canEditPrices ? (
                              <TextField
                                type="number"
                                size="small"
                                variant="standard"
                                slotProps={{
                                  htmlInput: { step: '0.01', style: { textAlign: 'right', fontSize: '0.8rem' } },
                                }}
                                value={row.selling_price ?? ''}
                                onChange={(e) => updatePriceField(row.store_id, 'selling_price', e.target.value)}
                                sx={priceFieldSx}
                              />
                            ) : (
                              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                                {row.selling_price ? formatMoney(price) : '—'}
                              </Typography>
                            )}
                          </Stack>
                          <Stack direction="row" sx={{ alignItems: 'baseline', justifyContent: 'space-between' }}>
                            <Typography variant="caption" color="text.secondary">
                              Profit
                            </Typography>
                            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'baseline' }}>
                              {margin !== null && (
                                <Typography variant="caption" color="text.secondary">
                                  ({margin.toFixed(0)}%)
                                </Typography>
                              )}
                              <Typography variant="caption" sx={{ fontWeight: 700, color: hasPrice ? profitColor : 'text.secondary' }}>
                                {hasPrice ? formatMoney(profit) : '—'}
                              </Typography>
                            </Stack>
                          </Stack>
                        </Stack>
                      </Paper>
                    </Grid>
                  );
                })}
              </Grid>
            )}
          </Box>
        </Paper>
      )}

      <ProductEditModal
        product={editing}
        categories={categories}
        units={units}
        taxes={taxes}
        onClose={() => setEditing(null)}
        onSaved={handleSaved}
      />
    </Box>
  );
}
