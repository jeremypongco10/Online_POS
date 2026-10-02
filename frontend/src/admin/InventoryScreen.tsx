import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { api, ApiError } from '../api/client';
import type { Category, InventoryStockRow, InventorySummary, Store } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { useSnackbar } from '../Snackbar';
import { useList } from './useList';
import { DataTable, type Column } from './DataTable';
import { ListToolbar } from './ListToolbar';
import { InlineSelectFilter } from './InlineSelectFilter';
import { SectionTabs } from './SectionTabs';
import { InventoryMovementsScreen } from './InventoryMovementsScreen';
import { AdjustStockDialog } from './AdjustStockDialog';
import { TransferStockDialog } from './TransferStockDialog';
import { ProductStockDrawer } from './ProductStockDrawer';
import { StockStatusBadge } from './InventoryBadges';
import { useBarcodeScanner } from './useBarcodeScanner';
import { printCountSheet, printStockReport } from './printInventory';
import { fmtQty, n, stockStatus, STOCK_STATUS_META, tint, type StockStatus } from './inventoryUtils';
import { formatMoney } from '../pos/format';
import { currencySymbol } from '../regional';
import { useRouteState } from '../routing';
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
import Tab from '@mui/material/Tab';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import LayersOutlinedIcon from '@mui/icons-material/LayersOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import RemoveShoppingCartOutlinedIcon from '@mui/icons-material/RemoveShoppingCartOutlined';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import QrCodeScannerOutlinedIcon from '@mui/icons-material/QrCodeScannerOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

type InventoryTab = 'stock' | 'movements';
const TABS: InventoryTab[] = ['stock', 'movements'];

export function InventoryScreen() {
  const [tab, setTab] = useRouteState<InventoryTab>(2, TABS, 'stock', (t) => `/admin/inventory/${t}`);

  return (
    <div>
      <SectionTabs value={tab} onChange={setTab}>
        <Tab value="stock" label="Stock levels" />
        <Tab value="movements" label="Movements" />
      </SectionTabs>

      {tab === 'stock' && <StockLevelsScreen />}
      {tab === 'movements' && <InventoryMovementsScreen />}
    </div>
  );
}

const BRANCH_KEY = 'inventory.branch';

function readBranch(): string {
  try {
    return localStorage.getItem(BRANCH_KEY) ?? '';
  } catch {
    return '';
  }
}

function MetricCard({ icon, label, value, caption }: { icon: ReactNode; label: string; value: string; caption?: string }) {
  return (
    <Box sx={{ p: 1.75, borderRadius: '14px', border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', minWidth: 0 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', color: 'text.secondary' }}>
        {icon}
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {label}
        </Typography>
      </Stack>
      <Typography sx={{ mt: 0.75, fontWeight: 800, fontSize: 24, lineHeight: 1.15, fontVariantNumeric: 'tabular-nums' }} noWrap>
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
        {caption ?? ' '}
      </Typography>
    </Box>
  );
}

function StatusCard({
  status,
  count,
  selected,
  onClick,
  icon,
}: {
  status: StockStatus;
  count: number | null;
  selected: boolean;
  onClick: () => void;
  icon: ReactNode;
}) {
  const meta = STOCK_STATUS_META[status];
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
        borderColor: selected ? meta.sx : 'divider',
        bgcolor: selected ? tint(meta.css, 8) : 'background.paper',
        transition: 'border-color .15s ease, background-color .15s ease, transform .15s ease',
        '&:hover': { borderColor: tint(meta.css, 55), transform: 'translateY(-1px)' },
        '&.Mui-focusVisible': { borderColor: meta.sx },
      }}
    >
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {meta.label}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {meta.hint}
          </Typography>
        </Box>
        <Box sx={{ width: 32, height: 32, borderRadius: '10px', display: 'grid', placeItems: 'center', bgcolor: tint(meta.css, 14), color: meta.sx }}>{icon}</Box>
      </Stack>
      <Typography sx={{ mt: 0.75, fontWeight: 800, fontSize: 24, lineHeight: 1.15 }}>{count ?? '–'}</Typography>
      <Typography variant="caption" color="text.secondary">
        {selected ? 'Showing only these · click to clear' : 'products'}
      </Typography>
    </ButtonBase>
  );
}

function StockLevelsScreen() {
  const { user, hasPermission } = useAuth();
  const notify = useSnackbar();
  const currency = user?.currency;
  const symbol = currencySymbol(currency);

  const [stores, setStores] = useState<Store[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [storeId, setStoreIdState] = useState(readBranch);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<StockStatus | ''>('');
  const [summary, setSummary] = useState<InventorySummary | null>(null);

  const [drawerRow, setDrawerRow] = useState<InventoryStockRow | null>(null);
  const [adjust, setAdjust] = useState<{ open: boolean; product: InventoryStockRow | null }>({ open: false, product: null });
  const [transfer, setTransfer] = useState<{ open: boolean; product: InventoryStockRow | null }>({ open: false, product: null });
  const [printAnchor, setPrintAnchor] = useState<HTMLElement | null>(null);
  const [printing, setPrinting] = useState(false);

  const { data, meta, loading, error, page, setPage, perPage, setPerPage, sort, setSort, q, setQ, reload } = useList<InventoryStockRow>(
    '/inventory/stock',
    { store_id: storeId, category_id: categoryFilter, status: statusFilter },
    !!storeId && stores.some((s) => String(s.id) === storeId)
  );

  function setStoreId(id: string) {
    setStoreIdState(id);
    try {
      localStorage.setItem(BRANCH_KEY, id);
    } catch {
      // Private mode — the choice just won't be remembered.
    }
  }

  useEffect(() => {
    api
      .get<Store[]>('/stores?per_page=100')
      .then((rows) => {
        setStores(rows);
        // Keep a remembered branch only if this user can still see it.
        setStoreIdState((current) => (rows.some((s) => String(s.id) === current) ? current : rows[0] ? String(rows[0].id) : ''));
      })
      .catch(() => setStores([]));
    api.get<Category[]>('/categories?per_page=200').then(setCategories).catch(() => setCategories([]));
  }, []);

  const loadSummary = useCallback(() => {
    if (!storeId) return;
    api
      .get<InventorySummary>(`/inventory/summary?store_id=${storeId}`)
      .then(setSummary)
      .catch(() => setSummary(null));
  }, [storeId]);

  useEffect(() => {
    setSummary(null);
    loadSummary();
  }, [loadSummary]);

  function refreshAll() {
    reload();
    loadSummary();
  }

  // A scanned product barcode or SKU jumps straight to that product's details;
  // anything else becomes the search.
  async function onScan(code: string) {
    if (!storeId) return;
    try {
      const rows = await api.get<InventoryStockRow[]>(`/inventory/stock?store_id=${storeId}&per_page=5&q=${encodeURIComponent(code)}`);
      const exact = rows.find((r) => r.barcode === code || r.sku.toLowerCase() === code.toLowerCase());
      setQ('');
      if (exact) setDrawerRow(exact);
      else setQ(code);
    } catch {
      setQ(code);
    }
  }
  useBarcodeScanner(onScan, drawerRow === null && !adjust.open && !transfer.open);

  const branchName = stores.find((s) => String(s.id) === storeId)?.name ?? '';
  const categoryName = categories.find((c) => String(c.id) === categoryFilter)?.name;

  async function print(kind: 'report' | 'count' | 'blind') {
    setPrintAnchor(null);
    if (!storeId) return;
    setPrinting(true);
    try {
      const params = new URLSearchParams({ store_id: storeId, all: '1' });
      if (q.trim()) params.set('q', q.trim());
      if (categoryFilter) params.set('category_id', categoryFilter);
      if (statusFilter) params.set('status', statusFilter);
      if (sort) params.set('sort', sort);
      const rows = await api.get<InventoryStockRow[]>(`/inventory/stock?${params.toString()}`);
      const filters = [
        categoryName ? `Category: ${categoryName}` : '',
        statusFilter ? `Status: ${STOCK_STATUS_META[statusFilter].label}` : '',
        q.trim() ? `Search: "${q.trim()}"` : '',
      ].filter(Boolean);
      const header = { companyName: summary?.company_name ?? null, branch: branchName, filters, printedBy: user?.name ?? null, currency };
      if (kind === 'report') printStockReport(rows, summary, header);
      else printCountSheet(rows, header, kind === 'blind');
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Could not prepare the printout', 'error');
    } finally {
      setPrinting(false);
    }
  }

  const columns: Column<InventoryStockRow>[] = [
    {
      key: 'product',
      label: 'Product',
      sortKey: 'name',
      render: (r) => (
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {r.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {r.sku}
            {r.barcode ? ` · ${r.barcode}` : ''}
          </Typography>
        </Box>
      ),
    },
    {
      key: 'category',
      label: 'Category',
      sortKey: 'category',
      render: (r) => r.category_name ?? <Typography variant="body2" color="text.disabled">—</Typography>,
    },
    {
      key: 'quantity',
      label: 'On hand',
      align: 'right',
      sortKey: 'quantity',
      width: 120,
      render: (r) => {
        const status = stockStatus(n(r.quantity), n(r.reorder_level));
        return (
          <Typography sx={{ fontWeight: 800, fontSize: 16, color: STOCK_STATUS_META[status].sx, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
            {fmtQty(r.quantity)}
            <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5, fontWeight: 600 }}>
              {r.unit ?? ''}
            </Typography>
          </Typography>
        );
      },
    },
    {
      key: 'reorder_level',
      label: 'Reorder at',
      align: 'right',
      width: 100,
      render: (r) => (
        <Typography variant="body2" color="text.secondary" sx={{ fontVariantNumeric: 'tabular-nums' }}>
          {fmtQty(r.reorder_level)}
        </Typography>
      ),
    },
    { key: 'status', label: 'Status', render: (r) => <StockStatusBadge status={stockStatus(n(r.quantity), n(r.reorder_level))} /> },
    {
      key: 'value',
      label: 'Value at cost',
      align: 'right',
      sortKey: 'value',
      width: 140,
      render: (r) =>
        r.cost_price === null ? (
          <Tooltip title="No cost price set for this branch">
            <Typography variant="body2" color="text.disabled">
              No cost
            </Typography>
          </Tooltip>
        ) : (
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
              {symbol}
              {formatMoney(Math.max(n(r.quantity), 0) * n(r.cost_price))}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
              {symbol}
              {formatMoney(n(r.cost_price))} each
            </Typography>
          </Box>
        ),
    },
  ];

  const filtersActive = !!(categoryFilter || statusFilter || q);

  return (
    <div>
      {/* ── Branch + summary ──────────────────────────────────── */}
      <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' }, gap: 1.5, mb: 2 }}>
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: 18 }}>{branchName || 'Stock levels'}</Typography>
          <Typography variant="body2" color="text.secondary">
            Every tracked product at this branch, including ones that have never had stock.
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

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(6, 1fr)' }, gap: 1.5, mb: 2.5 }}>
        <MetricCard
          icon={<Inventory2OutlinedIcon sx={{ fontSize: 18 }} />}
          label="Products tracked"
          value={summary ? String(summary.products) : '–'}
          caption="Active, with stock tracking on"
        />
        <MetricCard
          icon={<LayersOutlinedIcon sx={{ fontSize: 18 }} />}
          label="Units on hand"
          value={summary ? fmtQty(summary.units) : '–'}
          caption={branchName ? `At ${branchName}` : undefined}
        />
        <MetricCard
          icon={<PaymentsOutlinedIcon sx={{ fontSize: 18 }} />}
          label="Stock value"
          value={summary ? `${symbol}${formatMoney(n(summary.cost_value))}` : '–'}
          caption={summary ? `At cost · ${symbol}${formatMoney(n(summary.retail_value))} at selling price` : undefined}
        />
        <StatusCard
          status="in_stock"
          count={summary?.in_stock_count ?? null}
          selected={statusFilter === 'in_stock'}
          onClick={() => setStatusFilter(statusFilter === 'in_stock' ? '' : 'in_stock')}
          icon={<CheckCircleOutlineIcon sx={{ fontSize: 18 }} />}
        />
        <StatusCard
          status="low"
          count={summary?.low_count ?? null}
          selected={statusFilter === 'low'}
          onClick={() => setStatusFilter(statusFilter === 'low' ? '' : 'low')}
          icon={<WarningAmberOutlinedIcon sx={{ fontSize: 18 }} />}
        />
        <StatusCard
          status="out"
          count={summary?.out_count ?? null}
          selected={statusFilter === 'out'}
          onClick={() => setStatusFilter(statusFilter === 'out' ? '' : 'out')}
          icon={<RemoveShoppingCartOutlinedIcon sx={{ fontSize: 18 }} />}
        />
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
            options={[{ value: '', label: 'All categories' }, ...categories.map((c) => ({ value: String(c.id), label: c.name }))]}
          />
        }
        actions={
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }} useFlexGap>
            <Button variant="outlined" startIcon={<PrintOutlinedIcon />} endIcon={<ExpandMoreIcon />} disabled={!storeId || printing} onClick={(e) => setPrintAnchor(e.currentTarget)}>
              {printing ? 'Preparing…' : 'Print / PDF'}
            </Button>
            {hasPermission('inventory.transfer') && stores.length > 1 && (
              <Button variant="outlined" startIcon={<SwapHorizIcon />} onClick={() => setTransfer({ open: true, product: null })}>
                Transfer
              </Button>
            )}
            {hasPermission('inventory.adjust') && (
              <Button variant="contained" startIcon={<TuneOutlinedIcon />} onClick={() => setAdjust({ open: true, product: null })}>
                Adjust stock
              </Button>
            )}
          </Stack>
        }
      />

      <Menu anchorEl={printAnchor} open={!!printAnchor} onClose={() => setPrintAnchor(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}>
        <MenuItem onClick={() => print('report')}>
          <ListItemIcon>
            <AssessmentOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Stock report" secondary="On hand, status and value at cost" />
        </MenuItem>
        <MenuItem onClick={() => print('count')}>
          <ListItemIcon>
            <FactCheckOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Count sheet" secondary="System quantity with blanks to fill in" />
        </MenuItem>
        <MenuItem onClick={() => print('blind')}>
          <ListItemIcon>
            <VisibilityOffOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Blind count sheet" secondary="Hides the system quantity for an honest count" />
        </MenuItem>
      </Menu>

      <Stack direction="row" spacing={1} sx={{ mb: 1.5, alignItems: 'center', flexWrap: 'wrap', color: 'text.secondary' }} useFlexGap>
        <QrCodeScannerOutlinedIcon sx={{ fontSize: 17 }} />
        <Typography variant="caption" sx={{ mr: 1 }}>
          Scan a product barcode to open it.
        </Typography>
        {filtersActive && (
          <>
            <Typography variant="caption">Filtered:</Typography>
            {statusFilter && <Chip size="small" label={STOCK_STATUS_META[statusFilter].label} onDelete={() => setStatusFilter('')} />}
            {categoryName && <Chip size="small" label={categoryName} onDelete={() => setCategoryFilter('')} />}
            {q && <Chip size="small" label={`"${q}"`} onDelete={() => setQ('')} />}
          </>
        )}
      </Stack>

      <DataTable
        columns={columns}
        rows={data}
        rowKey={(r) => r.product_id}
        loading={loading}
        error={error}
        meta={meta}
        page={page}
        onPageChange={setPage}
        perPage={perPage}
        onPerPageChange={setPerPage}
        sort={sort}
        onSortChange={setSort}
        emptyLabel={filtersActive ? 'No products match these filters.' : 'No tracked products yet. Turn on "Track Inventory" for a product to see it here.'}
        rowActions={(r) => (
          <>
            <Tooltip title="Details and history">
              <IconButton size="small" aria-label={`Details for ${r.name}`} onClick={() => setDrawerRow(r)}>
                <HistoryOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            {hasPermission('inventory.adjust') && (
              <Tooltip title="Adjust">
                <IconButton size="small" aria-label={`Adjust ${r.name}`} onClick={() => setAdjust({ open: true, product: r })}>
                  <TuneOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {hasPermission('inventory.transfer') && stores.length > 1 && (
              <Tooltip title="Transfer">
                <IconButton size="small" aria-label={`Transfer ${r.name}`} onClick={() => setTransfer({ open: true, product: r })}>
                  <SwapHorizIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </>
        )}
      />

      <ProductStockDrawer
        row={drawerRow}
        storeId={storeId}
        stores={stores}
        onClose={() => setDrawerRow(null)}
        onAdjust={(r) => setAdjust({ open: true, product: r })}
        onTransfer={(r) => setTransfer({ open: true, product: r })}
        onChanged={refreshAll}
      />

      <AdjustStockDialog
        open={adjust.open}
        stores={stores}
        initialStoreId={storeId}
        initialProduct={adjust.product}
        onClose={() => setAdjust({ open: false, product: null })}
        onDone={(message) => {
          setAdjust({ open: false, product: null });
          setDrawerRow(null);
          refreshAll();
          notify(message);
        }}
      />

      <TransferStockDialog
        open={transfer.open}
        stores={stores}
        initialFromStoreId={storeId}
        initialProduct={transfer.product}
        onClose={() => setTransfer({ open: false, product: null })}
        onDone={(message) => {
          setTransfer({ open: false, product: null });
          setDrawerRow(null);
          refreshAll();
          notify(message);
        }}
      />
    </div>
  );
}
