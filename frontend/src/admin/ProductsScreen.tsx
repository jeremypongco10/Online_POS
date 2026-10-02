import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { api, ApiError, assetUrl } from '../api/client';
import type { CatalogProduct, CatalogSummary, Category, Product, Store, TaxRate, Unit } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { useSnackbar } from '../Snackbar';
import { useList } from './useList';
import { DataTable, type Column } from './DataTable';
import { ListToolbar } from './ListToolbar';
import { InlineSelectFilter } from './InlineSelectFilter';
import { Modal } from './Modal';
import { ProductEditModal } from './ProductEditModal';
import { ProductPricesModal } from './ProductPricesModal';
import { DiscountEligibilityForm } from './DiscountEligibilityForm';
import { ProductDetailDrawer } from './ProductDetailDrawer';
import { DotBadge } from './InventoryBadges';
import { useBarcodeScanner } from './useBarcodeScanner';
import { exportCsv, exportExcel, exportFileName, type ExportColumn } from './exportTable';
import { marginPercent, printPhotoCatalog, printPriceList, printProductList } from './printProducts';
import { formatMoney } from '../pos/format';
import { currencySymbol } from '../regional';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Chip from '@mui/material/Chip';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import ListSubheader from '@mui/material/ListSubheader';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import TablePagination from '@mui/material/TablePagination';
import Skeleton from '@mui/material/Skeleton';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import PauseCircleOutlineOutlinedIcon from '@mui/icons-material/PauseCircleOutlineOutlined';
import MoneyOffOutlinedIcon from '@mui/icons-material/MoneyOffOutlined';
import RemoveShoppingCartOutlinedIcon from '@mui/icons-material/RemoveShoppingCartOutlined';
import ImageNotSupportedOutlinedIcon from '@mui/icons-material/ImageNotSupportedOutlined';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import GridOnOutlinedIcon from '@mui/icons-material/GridOnOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import RequestQuoteOutlinedIcon from '@mui/icons-material/RequestQuoteOutlined';
import PhotoLibraryOutlinedIcon from '@mui/icons-material/PhotoLibraryOutlined';
import AddIcon from '@mui/icons-material/Add';
import ViewListOutlinedIcon from '@mui/icons-material/ViewListOutlined';
import GridViewOutlinedIcon from '@mui/icons-material/GridViewOutlined';
import OpenInNewOutlinedIcon from '@mui/icons-material/OpenInNewOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import PriceChangeOutlinedIcon from '@mui/icons-material/PriceChangeOutlined';
import QrCodeScannerOutlinedIcon from '@mui/icons-material/QrCodeScannerOutlined';

type View = 'all' | 'active' | 'inactive' | 'no_price' | 'out_of_stock' | 'no_photo';
type Layout = 'table' | 'grid';

const VIEW_PARAMS: Record<View, { is_active?: string; issue?: string }> = {
  all: {},
  active: { is_active: '1' },
  inactive: { is_active: '0' },
  no_price: { issue: 'no_price' },
  out_of_stock: { issue: 'out_of_stock' },
  no_photo: { issue: 'no_photo' },
};

const BRANCH_KEY = 'products.branch';
const LAYOUT_KEY = 'products.layout';

function remembered(key: string, fallback: string): string {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}
function remember(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Private mode — just not remembered.
  }
}

const num = (v: string | null | undefined) => {
  const x = parseFloat(v ?? '');
  return Number.isFinite(x) ? x : null;
};
const qty = (v: string | null | undefined) => String(parseFloat((num(v) ?? 0).toFixed(4)));
const tint = (css: string, pct: number) => `color-mix(in srgb, ${css} ${pct}%, transparent)`;

function stockColor(p: CatalogProduct): string {
  const q = num(p.stock_quantity) ?? 0;
  if (q <= 0) return 'error.main';
  if (q <= (num(p.reorder_level) ?? num(p.minimum_stock) ?? 0)) return 'warning.main';
  return 'success.main';
}

function Thumb({ p, size }: { p: CatalogProduct; size: number }) {
  return (
    <Box
      sx={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: size > 60 ? '12px' : '8px',
        overflow: 'hidden',
        display: 'grid',
        placeItems: 'center',
        bgcolor: 'action.hover',
        color: 'text.disabled',
      }}
    >
      {p.image_path ? (
        <Box component="img" src={assetUrl(p.image_path)} alt="" loading="lazy" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <ImageNotSupportedOutlinedIcon sx={{ fontSize: size > 60 ? 32 : 18 }} />
      )}
    </Box>
  );
}

function SummaryCard({
  label,
  hint,
  count,
  css,
  icon,
  selected,
  onClick,
}: {
  label: string;
  hint: string;
  count: number | null;
  css: string;
  icon: ReactNode;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <ButtonBase
      onClick={onClick}
      aria-pressed={selected}
      sx={{
        display: 'block',
        textAlign: 'left',
        p: 1.75,
        borderRadius: '14px',
        border: '1.5px solid',
        borderColor: selected ? css : 'divider',
        bgcolor: selected ? tint(css, 8) : 'background.paper',
        transition: 'border-color .15s ease, background-color .15s ease, transform .15s ease',
        '&:hover': { borderColor: tint(css, 55), transform: 'translateY(-1px)' },
        '&.Mui-focusVisible': { borderColor: css },
      }}
    >
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {label}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {hint}
          </Typography>
        </Box>
        <Box sx={{ width: 32, height: 32, flexShrink: 0, borderRadius: '10px', display: 'grid', placeItems: 'center', bgcolor: tint(css, 14), color: css }}>{icon}</Box>
      </Stack>
      <Typography sx={{ mt: 0.75, fontWeight: 800, fontSize: 24, lineHeight: 1.15 }}>{count ?? '–'}</Typography>
    </ButtonBase>
  );
}

export function ProductsScreen() {
  const { user, hasPermission } = useAuth();
  const notify = useSnackbar();
  const currency = user?.currency;
  const symbol = currencySymbol(currency);
  const canEditPrices = hasPermission('products.update');

  const [stores, setStores] = useState<Store[]>([]);
  const [storesLoaded, setStoresLoaded] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [taxes, setTaxes] = useState<TaxRate[]>([]);
  const [storeId, setStoreIdState] = useState(() => remembered(BRANCH_KEY, ''));
  const [view, setView] = useState<View>('all');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [layout, setLayoutState] = useState<Layout>(() => (remembered(LAYOUT_KEY, 'table') === 'grid' ? 'grid' : 'table'));
  const [summary, setSummary] = useState<CatalogSummary | null>(null);

  const [detail, setDetail] = useState<CatalogProduct | null>(null);
  const [editing, setEditing] = useState<Product | null>(null);
  const [pricingProduct, setPricingProduct] = useState<Product | null>(null);
  const [eligibilityProduct, setEligibilityProduct] = useState<Product | null>(null);
  const [exportAnchor, setExportAnchor] = useState<HTMLElement | null>(null);
  const [exporting, setExporting] = useState(false);

  const branchValid = stores.some((s) => String(s.id) === storeId);
  const { data, meta, loading, error, page, setPage, perPage, setPerPage, sort, setSort, q, setQ, reload } = useList<CatalogProduct>(
    '/products/catalog',
    { store_id: storeId, category_id: categoryFilter, ...VIEW_PARAMS[view] },
    branchValid
  );

  useEffect(() => {
    api
      .get<Store[]>('/stores?per_page=100')
      .then((rows) => {
        setStores(rows);
        setStoreIdState((current) => (rows.some((s) => String(s.id) === current) ? current : rows[0] ? String(rows[0].id) : ''));
      })
      .catch(() => setStores([]))
      .finally(() => setStoresLoaded(true));
    api.get<Category[]>('/categories?per_page=200').then(setCategories).catch(() => setCategories([]));
    api.get<Unit[]>('/units?per_page=100').then(setUnits).catch(() => setUnits([]));
    api.get<TaxRate[]>('/taxes?per_page=100').then(setTaxes).catch(() => setTaxes([]));
  }, []);

  const loadSummary = useCallback(() => {
    if (!branchValid) return;
    api
      .get<CatalogSummary>(`/products/catalog/summary?store_id=${storeId}`)
      .then(setSummary)
      .catch(() => setSummary(null));
  }, [storeId, branchValid]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  function refreshAll() {
    reload();
    loadSummary();
  }

  function setStoreId(id: string) {
    setStoreIdState(id);
    remember(BRANCH_KEY, id);
  }

  function setLayout(next: Layout) {
    setLayoutState(next);
    remember(LAYOUT_KEY, next);
  }

  function goToAdd() {
    window.history.pushState(null, '', '/admin/products/add');
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  // A scanned barcode or SKU opens that product; anything else becomes the search.
  async function onScan(code: string) {
    if (!branchValid) return;
    try {
      const rows = await api.get<CatalogProduct[]>(`/products/catalog?store_id=${storeId}&per_page=5&q=${encodeURIComponent(code)}`);
      const exact = rows.find((p) => p.barcode === code || p.sku.toLowerCase() === code.toLowerCase());
      setQ('');
      if (exact) setDetail(exact);
      else setQ(code);
    } catch {
      setQ(code);
    }
  }
  useBarcodeScanner(onScan, detail === null && editing === null && pricingProduct === null && eligibilityProduct === null);

  const branchName = stores.find((s) => String(s.id) === storeId)?.name ?? '';
  const categoryName = categoryFilter === 'none' ? 'Uncategorized' : categories.find((c) => String(c.id) === categoryFilter)?.name;

  const VIEW_LABELS: Record<View, string> = {
    all: 'All products',
    active: 'Active',
    inactive: 'Inactive',
    no_price: 'No price here',
    out_of_stock: 'Out of stock',
    no_photo: 'No photo',
  };

  async function fetchAll(): Promise<CatalogProduct[]> {
    const params = new URLSearchParams({ store_id: storeId, all: '1' });
    if (q.trim()) params.set('q', q.trim());
    if (categoryFilter) params.set('category_id', categoryFilter);
    Object.entries(VIEW_PARAMS[view]).forEach(([k, v]) => v && params.set(k, v));
    if (sort) params.set('sort', sort);
    return api.get<CatalogProduct[]>(`/products/catalog?${params.toString()}`);
  }

  async function runExport(kind: 'xlsx' | 'csv' | 'list' | 'prices' | 'photos') {
    setExportAnchor(null);
    setExporting(true);
    try {
      const rows = await fetchAll();
      const filters = [
        view !== 'all' ? VIEW_LABELS[view] : '',
        categoryName ? `Category: ${categoryName}` : '',
        q.trim() ? `Search: "${q.trim()}"` : '',
      ].filter(Boolean);
      const header = { companyName: summary?.company_name ?? null, branch: branchName, filters, printedBy: user?.name ?? null, currency };

      if (kind === 'list') printProductList(rows, header);
      else if (kind === 'prices') printPriceList(rows, header);
      else if (kind === 'photos') printPhotoCatalog(rows, header);
      else {
        const columns: ExportColumn<CatalogProduct>[] = [
          { header: 'SKU', width: 16, value: (p) => p.sku },
          { header: 'Barcode', width: 16, value: (p) => p.barcode },
          { header: 'Name', width: 36, value: (p) => p.name },
          { header: 'Category', width: 20, value: (p) => p.category_name },
          { header: 'Unit', width: 8, value: (p) => p.unit },
          { header: 'Tax', width: 14, value: (p) => (p.tax_name ? `${p.tax_name} (${qty(p.tax_rate)}%)` : '') },
          { header: `Cost (${branchName})`, width: 14, kind: 'money', value: (p) => p.cost_price },
          { header: `Price (${branchName})`, width: 14, kind: 'money', value: (p) => p.selling_price },
          { header: 'Margin %', width: 10, kind: 'number', value: (p) => {
            const m = marginPercent(p);
            return m === null ? null : Math.round(m * 10) / 10;
          } },
          { header: `Stock (${branchName})`, width: 12, kind: 'number', value: (p) => (Number(p.track_inventory) === 1 ? (num(p.stock_quantity) ?? 0) : null) },
          { header: 'Minimum stock', width: 12, kind: 'number', value: (p) => p.minimum_stock },
          { header: 'Track inventory', width: 12, value: (p) => (Number(p.track_inventory) === 1 ? 'Yes' : 'No') },
          { header: 'Status', width: 10, value: (p) => (Number(p.is_active) === 1 ? 'Active' : 'Inactive') },
          { header: 'Description', width: 40, value: (p) => p.description },
        ];
        const fileName = exportFileName('products', branchName);
        if (kind === 'csv') exportCsv(rows, columns, fileName);
        else
          await exportExcel(rows, columns, fileName, 'Products', [
            `${summary?.company_name ?? ''} Products`.trim(),
            `Branch: ${branchName} · ${rows.length} products${filters.length ? ` · ${filters.join(' · ')}` : ''}`,
          ]);
        notify(`Exported ${rows.length} product${rows.length === 1 ? '' : 's'}`);
      }
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Could not export the products', 'error');
    } finally {
      setExporting(false);
    }
  }

  const priceCell = (p: CatalogProduct) =>
    num(p.selling_price) === null ? (
      <Typography variant="body2" sx={{ color: 'warning.main', fontWeight: 600 }}>
        No price
      </Typography>
    ) : (
      <Box>
        <Typography variant="body2" sx={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
          {symbol}
          {formatMoney(num(p.selling_price) as number)}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
          {num(p.cost_price) === null ? 'No cost' : `Cost ${symbol}${formatMoney(num(p.cost_price) as number)}`}
        </Typography>
      </Box>
    );

  const stockCell = (p: CatalogProduct) =>
    Number(p.track_inventory) !== 1 ? (
      <Typography variant="body2" color="text.disabled">
        Not tracked
      </Typography>
    ) : (
      <Typography sx={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: stockColor(p), whiteSpace: 'nowrap' }}>
        {qty(p.stock_quantity)}
        <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5, fontWeight: 600 }}>
          {p.unit ?? ''}
        </Typography>
      </Typography>
    );

  const statusBadge = (p: CatalogProduct) => (
    <DotBadge
      css={Number(p.is_active) === 1 ? 'var(--mui-palette-success-main)' : 'var(--mui-palette-text-secondary)'}
      label={Number(p.is_active) === 1 ? 'Active' : 'Inactive'}
    />
  );

  const columns: Column<CatalogProduct>[] = [
    {
      key: 'product',
      label: 'Product',
      sortKey: 'name',
      render: (p) => (
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', minWidth: 0 }}>
          <Thumb p={p} size={40} />
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {p.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {p.sku}
              {p.barcode ? ` · ${p.barcode}` : ''}
            </Typography>
          </Box>
        </Stack>
      ),
    },
    {
      key: 'category',
      label: 'Category',
      sortKey: 'category',
      render: (p) => p.category_name ?? <Typography variant="body2" color="text.disabled">Uncategorized</Typography>,
    },
    { key: 'price', label: 'Price', align: 'right', sortKey: 'price', width: 130, render: priceCell },
    {
      key: 'margin',
      label: 'Margin',
      align: 'right',
      sortKey: 'margin',
      width: 110,
      render: (p) => {
        const m = marginPercent(p);
        return m === null ? (
          <Typography variant="body2" color="text.disabled">
            —
          </Typography>
        ) : (
          <Typography variant="body2" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: m < 0 ? 'error.main' : m < 10 ? 'warning.main' : 'text.primary' }}>
            {m.toFixed(1)}%
          </Typography>
        );
      },
    },
    { key: 'stock', label: 'Stock', align: 'right', sortKey: 'stock', width: 110, render: stockCell },
    { key: 'status', label: 'Status', render: statusBadge },
  ];

  const filtersActive = view !== 'all' || !!categoryFilter || !!q;

  const cards: { view: View; label: string; hint: string; count: number | undefined; css: string; icon: ReactNode }[] = [
    { view: 'all', label: 'All products', hint: 'Everything in the catalog', count: summary?.total, css: 'var(--mui-palette-primary-main)', icon: <Inventory2OutlinedIcon sx={{ fontSize: 18 }} /> },
    { view: 'active', label: 'Active', hint: 'Shown at the POS', count: summary?.active, css: 'var(--mui-palette-success-main)', icon: <CheckCircleOutlinedIcon sx={{ fontSize: 18 }} /> },
    { view: 'inactive', label: 'Inactive', hint: 'Hidden from the POS', count: summary?.inactive, css: 'var(--mui-palette-text-secondary)', icon: <PauseCircleOutlineOutlinedIcon sx={{ fontSize: 18 }} /> },
    { view: 'no_price', label: 'No price here', hint: "Can't be sold at this branch", count: summary?.no_price, css: 'var(--mui-palette-warning-main)', icon: <MoneyOffOutlinedIcon sx={{ fontSize: 18 }} /> },
    { view: 'out_of_stock', label: 'Out of stock', hint: 'Tracked, nothing on hand', count: summary?.out_of_stock, css: 'var(--mui-palette-error-main)', icon: <RemoveShoppingCartOutlinedIcon sx={{ fontSize: 18 }} /> },
    { view: 'no_photo', label: 'No photo', hint: 'Shows a placeholder', count: summary?.no_photo, css: 'var(--mui-palette-info-main)', icon: <ImageNotSupportedOutlinedIcon sx={{ fontSize: 18 }} /> },
  ];

  return (
    <div>
      {/* ── Branch ─────────────────────────────────────────────── */}
      <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' }, gap: 1.5, mb: 2 }}>
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: 18 }}>Product catalog</Typography>
          <Typography variant="body2" color="text.secondary">
            Prices, margins and stock shown for {branchName || 'the selected branch'}.
          </Typography>
        </Box>
        {stores.length > 1 && (
          <InlineSelectFilter
            label="Branch"
            value={storeId}
            onChange={(v) => v && setStoreId(v)}
            minWidth={220}
            options={stores.map((s) => ({ value: String(s.id), label: s.name }))}
          />
        )}
      </Stack>

      {storesLoaded && stores.length === 0 && (
        <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
          Add a branch under Settings → Stores before managing products.
        </Typography>
      )}

      {/* ── Summary cards (also the main filter) ──────────────── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(6, 1fr)' }, gap: 1.5, mb: 2.5 }}>
        {cards.map((c) => (
          <SummaryCard
            key={c.view}
            label={c.label}
            hint={c.hint}
            count={summary ? (c.count ?? 0) : null}
            css={c.css}
            icon={c.icon}
            selected={view === c.view}
            onClick={() => setView(view === c.view && c.view !== 'all' ? 'all' : c.view)}
          />
        ))}
      </Box>

      <ListToolbar
        search={q}
        onSearchChange={setQ}
        onRefresh={refreshAll}
        refreshing={loading}
        extra={
          <InlineSelectFilter
            label="Category"
            compactOnMobile
            value={categoryFilter}
            onChange={setCategoryFilter}
            options={[
              { value: '', label: 'All categories' },
              ...categories.map((c) => ({ value: String(c.id), label: c.name })),
              { value: 'none', label: 'Uncategorized' },
            ]}
          />
        }
        actions={
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }} useFlexGap>
            <ToggleButtonGroup size="small" exclusive value={layout} onChange={(_, v: Layout | null) => v && setLayout(v)} aria-label="Layout">
              <ToggleButton value="table" aria-label="Table view">
                <Tooltip title="Table">
                  <ViewListOutlinedIcon fontSize="small" />
                </Tooltip>
              </ToggleButton>
              <ToggleButton value="grid" aria-label="Grid view">
                <Tooltip title="Cards">
                  <GridViewOutlinedIcon fontSize="small" />
                </Tooltip>
              </ToggleButton>
            </ToggleButtonGroup>
            <Button
              variant="outlined"
              startIcon={<FileDownloadOutlinedIcon />}
              endIcon={<ExpandMoreIcon />}
              disabled={!branchValid || exporting}
              onClick={(e) => setExportAnchor(e.currentTarget)}
            >
              {exporting ? 'Preparing…' : 'Export'}
            </Button>
            {hasPermission('products.create') && (
              <Button variant="contained" startIcon={<AddIcon />} onClick={goToAdd}>
                Add product
              </Button>
            )}
          </Stack>
        }
      />

      <Menu
        anchorEl={exportAnchor}
        open={!!exportAnchor}
        onClose={() => setExportAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <ListSubheader sx={{ lineHeight: '32px' }}>Spreadsheet</ListSubheader>
        <MenuItem onClick={() => runExport('xlsx')}>
          <ListItemIcon>
            <GridOnOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Excel (.xlsx)" secondary="Every column, ready to sort and total" />
        </MenuItem>
        <MenuItem onClick={() => runExport('csv')}>
          <ListItemIcon>
            <DescriptionOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="CSV" secondary="For other systems and Google Sheets" />
        </MenuItem>
        <ListSubheader sx={{ lineHeight: '32px' }}>Print / PDF</ListSubheader>
        <MenuItem onClick={() => runExport('list')}>
          <ListItemIcon>
            <PictureAsPdfOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Product list" secondary="Cost, price, margin and stock — internal" />
        </MenuItem>
        <MenuItem onClick={() => runExport('prices')}>
          <ListItemIcon>
            <RequestQuoteOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Price list" secondary="Selling prices by category — for customers" />
        </MenuItem>
        <MenuItem onClick={() => runExport('photos')}>
          <ListItemIcon>
            <PhotoLibraryOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Photo catalog" secondary="Cards with photos and prices" />
        </MenuItem>
      </Menu>

      <Stack direction="row" spacing={1} sx={{ mb: 1.5, alignItems: 'center', flexWrap: 'wrap', color: 'text.secondary' }} useFlexGap>
        <QrCodeScannerOutlinedIcon sx={{ fontSize: 17 }} />
        <Typography variant="caption" sx={{ mr: 1 }}>
          Scan a barcode to open that product. Exports include everything matching the filters, not just this page.
        </Typography>
        {filtersActive && (
          <>
            <Typography variant="caption">Filtered:</Typography>
            {view !== 'all' && <Chip size="small" label={VIEW_LABELS[view]} onDelete={() => setView('all')} />}
            {categoryName && <Chip size="small" label={categoryName} onDelete={() => setCategoryFilter('')} />}
            {q && <Chip size="small" label={`"${q}"`} onDelete={() => setQ('')} />}
          </>
        )}
      </Stack>

      {layout === 'table' ? (
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
          emptyLabel={filtersActive ? 'No products match these filters.' : 'No products yet. Click "Add product" to create your first one.'}
          rowActions={(p) => (
            <>
              <Tooltip title="Open">
                <IconButton size="small" aria-label={`Open ${p.name}`} onClick={() => setDetail(p)}>
                  <OpenInNewOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              {hasPermission('products.update') && (
                <Tooltip title="Edit">
                  <IconButton size="small" aria-label={`Edit ${p.name}`} onClick={() => setEditing(p)}>
                    <EditOutlinedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
              <Tooltip title={canEditPrices ? 'Prices' : 'View prices'}>
                <IconButton size="small" aria-label={`Prices for ${p.name}`} onClick={() => setPricingProduct(p)}>
                  <PriceChangeOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </>
          )}
        />
      ) : (
        <Box>
          {error && <Typography color="error.main">{error}</Typography>}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(4, 1fr)', xl: 'repeat(6, 1fr)' }, gap: 1.5 }}>
            {loading && data.length === 0
              ? Array.from({ length: 8 }, (_, i) => <Skeleton key={i} variant="rounded" height={240} sx={{ borderRadius: '14px' }} />)
              : data.map((p) => (
                  <ButtonBase
                    key={p.id}
                    onClick={() => setDetail(p)}
                    sx={{
                      display: 'block',
                      textAlign: 'left',
                      p: 1.25,
                      borderRadius: '14px',
                      border: '1px solid',
                      borderColor: 'divider',
                      bgcolor: 'background.paper',
                      opacity: Number(p.is_active) === 1 ? 1 : 0.6,
                      transition: 'border-color .15s ease, transform .15s ease, box-shadow .15s ease',
                      '&:hover': { borderColor: 'primary.main', transform: 'translateY(-2px)', boxShadow: 3 },
                    }}
                  >
                    <Box sx={{ position: 'relative' }}>
                      <Box sx={{ width: '100%', aspectRatio: '1', maxWidth: '100%', borderRadius: '10px', overflow: 'hidden', bgcolor: 'action.hover', display: 'grid', placeItems: 'center', color: 'text.disabled' }}>
                        {p.image_path ? (
                          <Box component="img" src={assetUrl(p.image_path)} alt="" loading="lazy" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <ImageNotSupportedOutlinedIcon sx={{ fontSize: 34 }} />
                        )}
                      </Box>
                      {Number(p.is_active) !== 1 && (
                        <Chip size="small" label="Inactive" sx={{ position: 'absolute', top: 6, left: 6, fontWeight: 700, bgcolor: 'background.paper' }} />
                      )}
                    </Box>
                    <Typography variant="body2" sx={{ fontWeight: 700, mt: 1, lineHeight: 1.3, minHeight: '2.6em', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {p.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                      {p.sku}
                      {p.category_name ? ` · ${p.category_name}` : ''}
                    </Typography>
                    <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline', mt: 0.75 }}>
                      {num(p.selling_price) === null ? (
                        <Typography variant="body2" sx={{ color: 'warning.main', fontWeight: 700 }}>
                          No price
                        </Typography>
                      ) : (
                        <Typography sx={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
                          {symbol}
                          {formatMoney(num(p.selling_price) as number)}
                        </Typography>
                      )}
                      {Number(p.track_inventory) === 1 && (
                        <Typography variant="caption" sx={{ fontWeight: 700, color: stockColor(p) }}>
                          {qty(p.stock_quantity)} in stock
                        </Typography>
                      )}
                    </Stack>
                  </ButtonBase>
                ))}
          </Box>
          {!loading && data.length === 0 && (
            <Typography color="text.secondary" sx={{ py: 6, textAlign: 'center' }}>
              {filtersActive ? 'No products match these filters.' : 'No products yet.'}
            </Typography>
          )}
          {meta && (
            <TablePagination
              component="div"
              count={meta.total}
              page={page - 1}
              onPageChange={(_, p) => setPage(p + 1)}
              rowsPerPage={perPage}
              onRowsPerPageChange={(e) => setPerPage(parseInt(e.target.value, 10))}
              rowsPerPageOptions={[12, 24, 48, 96]}
              labelRowsPerPage="Per page"
            />
          )}
        </Box>
      )}

      <ProductDetailDrawer
        product={detail}
        storeId={storeId}
        onClose={() => setDetail(null)}
        onEdit={(p) => setEditing(p)}
        onPrices={(p) => setPricingProduct(p)}
        onEligibility={(p) => setEligibilityProduct(p)}
        onChanged={refreshAll}
      />

      <ProductEditModal
        product={editing}
        categories={categories}
        units={units}
        taxes={taxes}
        onClose={() => {
          setEditing(null);
          refreshAll();
        }}
        onSaved={(updated) => {
          setEditing(updated);
          reload();
        }}
      />

      <ProductPricesModal
        product={pricingProduct}
        canEdit={canEditPrices}
        myStores={stores.length > 0 ? stores : null}
        onClose={() => {
          setPricingProduct(null);
          refreshAll();
        }}
      />

      <Modal open={!!eligibilityProduct} title={`Discount eligibility — ${eligibilityProduct?.name ?? ''}`} onClose={() => setEligibilityProduct(null)} compact>
        {eligibilityProduct && (
          <DiscountEligibilityForm
            apiPath={`/products/${eligibilityProduct.id}/discount-eligibility`}
            description="What this specific product can currently be discounted with — starts from its category's rule (see Categories' own Discount Eligibility), overridden here only for this one product."
            onClose={() => setEligibilityProduct(null)}
          />
        )}
      </Modal>
    </div>
  );
}
