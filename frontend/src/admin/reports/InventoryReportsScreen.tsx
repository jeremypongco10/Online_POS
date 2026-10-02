import { useEffect, useMemo, useState } from 'react';
import { api, ApiError } from '../../api/client';
import type { Category, CurrentStockRow, DashboardData, InventoryValuation, StockAdjustmentRow, StockMovementRow, StockTransferRow, Store } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';
import { useSnackbar } from '../../Snackbar';
import { formatMoney } from '../../pos/format';
import { currencySymbol, formatDateTime } from '../../regional';
import { MetricCard } from '../SummaryCards';
import { InlineSelectFilter } from '../InlineSelectFilter';
import { MOVEMENT_META, type MovementType } from '../inventoryUtils';
import { MovementTypeBadge } from '../InventoryBadges';
import { ReportTable } from './ReportTable';
import { DateRangeBar, ExportButton, ReportHeader, ReportPicker, ShareBar, type ReportOption } from './ReportKit';
import { defaultRange, exportReport, num, qtyText, sumOf, type DateRange, type ReportColumn } from './reportUtils';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import SyncAltOutlinedIcon from '@mui/icons-material/SyncAltOutlined';
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined';
import SwapHorizOutlinedIcon from '@mui/icons-material/SwapHorizOutlined';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import RemoveShoppingCartOutlinedIcon from '@mui/icons-material/RemoveShoppingCartOutlined';
import ScheduleOutlinedIcon from '@mui/icons-material/ScheduleOutlined';

type LowStockRow = DashboardData['low_stock'][number];
type ReportType = 'valuation' | 'current-stock' | 'low-stock' | 'movement' | 'adjustments' | 'transfers';

const GROUPS: { label: string; options: ReportOption<ReportType>[] }[] = [
  {
    label: 'Stock now',
    options: [
      { value: 'valuation', label: 'Valuation', icon: <AccountBalanceWalletOutlinedIcon /> },
      { value: 'current-stock', label: 'Current stock', icon: <Inventory2OutlinedIcon /> },
      { value: 'low-stock', label: 'Low stock', icon: <WarningAmberOutlinedIcon /> },
    ],
  },
  {
    label: 'Movement',
    options: [
      { value: 'movement', label: 'Movement summary', icon: <SyncAltOutlinedIcon /> },
      { value: 'adjustments', label: 'Adjustments', icon: <TuneOutlinedIcon /> },
      { value: 'transfers', label: 'Transfers', icon: <SwapHorizOutlinedIcon /> },
    ],
  },
];

const INFO: Record<ReportType, { title: string; description: string }> = {
  valuation: { title: 'Inventory valuation', description: 'What the stock on your shelves is worth at cost, branch by branch.' },
  'current-stock': { title: 'Current stock', description: 'Every product on hand, with its reorder level and value at cost.' },
  'low-stock': { title: 'Low stock', description: 'Products at or below their reorder level — your reorder list.' },
  movement: { title: 'Movement summary', description: 'Stock in and out for the period, by kind of movement.' },
  adjustments: { title: 'Stock adjustments', description: 'Every manual correction: counts, damages, expiries and the reasons given.' },
  transfers: { title: 'Stock transfers', description: 'Stock moved between branches, in and out.' },
};

const DATED: ReportType[] = ['movement', 'adjustments', 'transfers'];
const PAGED: ReportType[] = ['current-stock', 'adjustments', 'transfers'];
const PAGE_SIZE = 50;

/** Stock reports — what you hold and what it's worth, and how it moved. */
export function InventoryReportsScreen() {
  const { user } = useAuth();
  const notify = useSnackbar();
  const currency = user?.currency;
  const symbol = currencySymbol(currency);
  const money = (v: unknown) => `${symbol}${formatMoney(num(v))}`;

  const [stores, setStores] = useState<Store[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [storeId, setStoreId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [range, setRange] = useState<DateRange>(defaultRange);
  const [reportType, setReportType] = useState<ReportType>('valuation');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<unknown[]>([]);
  const [movement, setMovement] = useState<StockMovementRow[]>([]);

  useEffect(() => {
    api.get<Store[]>('/stores?per_page=100').then(setStores).catch(() => setStores([]));
    api.get<Category[]>('/categories?per_page=200').then(setCategories).catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    setPage(1);
  }, [reportType, storeId, categoryId, range]);

  const baseQuery = useMemo(() => {
    const q = new URLSearchParams();
    if (storeId) q.set('store_id', storeId);
    if (categoryId && reportType === 'current-stock') q.set('category_id', categoryId);
    if (DATED.includes(reportType)) {
      if (range.from) q.set('from', range.from);
      if (range.to) q.set('to', range.to);
    }
    return q;
  }, [storeId, categoryId, range, reportType]);

  const endpoint: Record<ReportType, string> = {
    valuation: '/reports/inventory-valuation',
    'current-stock': '/reports/current-stock',
    'low-stock': '/reports/low-stock',
    movement: '/reports/stock-movement',
    adjustments: '/reports/stock-adjustments',
    transfers: '/reports/stock-transfers',
  };

  /** Every page of a paged report (the server caps a page at 100), for exports and the low-stock list. */
  async function fetchAll<T>(type: ReportType): Promise<T[]> {
    const all: T[] = [];
    for (let p = 1; p <= 50; p++) {
      const q = new URLSearchParams(baseQuery);
      q.set('page', String(p));
      q.set('per_page', '100');
      const chunk = await api.get<T[]>(`${endpoint[type]}?${q.toString()}`);
      all.push(...chunk);
      if (chunk.length < 100) break;
    }
    return all;
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setRows([]);

    const load = async () => {
      if (reportType === 'low-stock') return fetchAll<unknown>('low-stock');
      const q = new URLSearchParams(baseQuery);
      if (PAGED.includes(reportType)) {
        q.set('page', String(page));
        q.set('per_page', String(PAGE_SIZE));
      }
      return api.get<unknown[]>(`${endpoint[reportType]}?${q.toString()}`);
    };

    load()
      .then((r) => !cancelled && setRows(r))
      .catch(() => undefined)
      .finally(() => !cancelled && setLoading(false));

    // Adjustments and transfers take their cards from the movement summary, which covers the whole period, not just this page.
    if (reportType === 'adjustments' || reportType === 'transfers') {
      api
        .get<StockMovementRow[]>(`${endpoint.movement}?${baseQuery.toString()}`)
        .then((m) => !cancelled && setMovement(m))
        .catch(() => setMovement([]));
    }
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseQuery, page, reportType]);

  function changeReport(next: ReportType) {
    setRows([]);
    setReportType(next);
  }

  const storeLabel = (id: number) => stores.find((s) => s.id === id)?.name ?? `#${id}`;
  const storeName = stores.find((s) => String(s.id) === storeId)?.name;
  const categoryName = categories.find((c) => String(c.id) === categoryId)?.name;
  const info = INFO[reportType];
  const typeLabel = (t: string) => MOVEMENT_META[t as MovementType]?.label ?? t.replace('_', ' ');
  const moved = (t: string) => movement.find((m) => m.type === t);

  const view = useMemo(() => {
    switch (reportType) {
      case 'valuation': {
        const r = rows as InventoryValuation[];
        const total = sumOf(r, (x) => x.total_cost_value);
        return {
          columns: [
            { key: 'store', label: 'Branch', value: (x: InventoryValuation) => storeLabel(x.store_id), render: (x: InventoryValuation) => <b>{storeLabel(x.store_id)}</b> },
            { key: 'product_count', label: 'Products', kind: 'number' },
            { key: 'total_cost_value', label: 'Value at cost', kind: 'money' },
            { key: 'share', label: 'Share', screenOnly: true, render: (x: InventoryValuation) => <ShareBar value={num(x.total_cost_value)} total={total} /> },
          ] as ReportColumn<unknown>[],
          totals: { product_count: sumOf(r, (x) => x.product_count), total_cost_value: total },
          rowKey: (x: unknown) => (x as InventoryValuation).store_id,
          cards: [
            { icon: <AccountBalanceWalletOutlinedIcon sx={{ fontSize: 18 }} />, label: 'Stock value', value: money(total), caption: 'At cost price' },
            { icon: <StorefrontOutlinedIcon sx={{ fontSize: 18 }} />, label: 'Branches', value: String(r.length), caption: r.length ? `Avg ${money(total / r.length)} each` : ' ' },
            { icon: <Inventory2OutlinedIcon sx={{ fontSize: 18 }} />, label: 'Product lines', value: sumOf(r, (x) => x.product_count).toLocaleString(), caption: 'Stocked across branches' },
          ],
          empty: 'No stock on record.',
        };
      }
      case 'current-stock': {
        return {
          columns: [
            { key: 'product_name', label: 'Product', render: (x: CurrentStockRow) => <b>{x.product_name}</b> },
            { key: 'sku', label: 'SKU' },
            ...(storeId ? [] : [{ key: 'store', label: 'Branch', value: (x: CurrentStockRow) => storeLabel(x.store_id) }]),
            { key: 'quantity', label: 'On hand', kind: 'number', value: (x: CurrentStockRow) => num(x.quantity), render: (x: CurrentStockRow) => `${qtyText(x.quantity)} ${x.unit ?? ''}`.trim() },
            { key: 'reorder_level', label: 'Reorder at', kind: 'number' },
            { key: 'cost_value', label: 'Value at cost', kind: 'money' },
          ] as ReportColumn<unknown>[],
          rowKey: (x: unknown) => (x as CurrentStockRow).id,
          cards: null,
          empty: 'No stock on record for these filters.',
        };
      }
      case 'low-stock': {
        const r = rows as LowStockRow[];
        const out = r.filter((x) => num(x.quantity) <= 0).length;
        return {
          columns: [
            { key: 'product_name', label: 'Product', render: (x: LowStockRow) => <b>{x.product_name}</b> },
            { key: 'sku', label: 'SKU' },
            ...(storeId ? [] : [{ key: 'store', label: 'Branch', value: (x: LowStockRow) => storeLabel(x.store_id) }]),
            {
              key: 'quantity',
              label: 'On hand',
              kind: 'number',
              render: (x: LowStockRow) => (
                <Typography component="span" sx={{ fontWeight: 800, color: num(x.quantity) <= 0 ? 'error.main' : 'warning.main' }}>
                  {qtyText(x.quantity)}
                </Typography>
              ),
            },
            { key: 'reorder_level', label: 'Reorder at', kind: 'number' },
            { key: 'short', label: 'Short by', kind: 'number', value: (x: LowStockRow) => Math.max(0, num(x.reorder_level) - num(x.quantity)) },
          ] as ReportColumn<unknown>[],
          rowKey: (x: unknown) => (x as LowStockRow).id,
          cards: [
            { icon: <WarningAmberOutlinedIcon sx={{ fontSize: 18 }} />, label: 'Running low', value: r.length.toLocaleString(), caption: 'At or below reorder level' },
            { icon: <RemoveShoppingCartOutlinedIcon sx={{ fontSize: 18 }} />, label: 'Out of stock', value: out.toLocaleString(), caption: 'Nothing on hand' },
            { icon: <StorefrontOutlinedIcon sx={{ fontSize: 18 }} />, label: 'Branches affected', value: new Set(r.map((x) => x.store_id)).size.toLocaleString(), caption: storeName ?? 'All branches' },
          ],
          empty: 'Nothing is below its reorder level.',
        };
      }
      case 'movement': {
        const r = rows as StockMovementRow[];
        const inUnits = sumOf(r.filter((x) => num(x.net_quantity) > 0), (x) => x.net_quantity);
        const outUnits = -sumOf(r.filter((x) => num(x.net_quantity) < 0), (x) => x.net_quantity);
        return {
          columns: [
            { key: 'type', label: 'Movement', value: (x: StockMovementRow) => typeLabel(x.type), render: (x: StockMovementRow) => <MovementTypeBadge type={x.type as MovementType} /> },
            { key: 'movement_count', label: 'Movements', kind: 'number' },
            {
              key: 'net_quantity',
              label: 'Net units',
              kind: 'number',
              render: (x: StockMovementRow) => (
                <Typography component="span" sx={{ fontWeight: 800, color: num(x.net_quantity) >= 0 ? 'success.main' : 'error.main' }}>
                  {num(x.net_quantity) > 0 ? '+' : ''}
                  {qtyText(x.net_quantity)}
                </Typography>
              ),
            },
          ] as ReportColumn<unknown>[],
          totals: { movement_count: sumOf(r, (x) => x.movement_count), net_quantity: sumOf(r, (x) => x.net_quantity) },
          rowKey: (x: unknown) => (x as StockMovementRow).type,
          cards: [
            { icon: <SyncAltOutlinedIcon sx={{ fontSize: 18 }} />, label: 'Movements', value: sumOf(r, (x) => x.movement_count).toLocaleString(), caption: 'Every stock change' },
            { icon: <Inventory2OutlinedIcon sx={{ fontSize: 18 }} />, label: 'Units in', value: `+${qtyText(inUnits)}`, caption: 'Purchases, returns, transfers in' },
            { icon: <RemoveShoppingCartOutlinedIcon sx={{ fontSize: 18 }} />, label: 'Units out', value: `−${qtyText(outUnits)}`, caption: 'Sales, transfers out, write-offs' },
          ],
          empty: 'No stock moved in this period.',
        };
      }
      case 'adjustments': {
        const adj = moved('adjustment');
        return {
          columns: [
            { key: 'created_at', label: 'Date', value: (x: StockAdjustmentRow) => formatDateTime(x.created_at, currency) },
            { key: 'product_name', label: 'Product', render: (x: StockAdjustmentRow) => <b>{x.product_name}</b> },
            { key: 'sku', label: 'SKU' },
            ...(storeId ? [] : [{ key: 'store', label: 'Branch', value: (x: StockAdjustmentRow) => storeLabel(x.store_id) }]),
            {
              key: 'quantity',
              label: 'Change',
              kind: 'number',
              render: (x: StockAdjustmentRow) => (
                <Typography component="span" sx={{ fontWeight: 800, color: num(x.quantity) >= 0 ? 'success.main' : 'error.main' }}>
                  {num(x.quantity) > 0 ? '+' : ''}
                  {qtyText(x.quantity)}
                </Typography>
              ),
            },
            { key: 'balance_after', label: 'Balance after', kind: 'number' },
            { key: 'notes', label: 'Reason / notes', value: (x: StockAdjustmentRow) => x.notes ?? '' },
          ] as ReportColumn<unknown>[],
          rowKey: (x: unknown) => (x as StockAdjustmentRow).id,
          cards: [
            { icon: <TuneOutlinedIcon sx={{ fontSize: 18 }} />, label: 'Adjustments', value: adj ? num(adj.movement_count).toLocaleString() : '0', caption: 'In the period' },
            { icon: <Inventory2OutlinedIcon sx={{ fontSize: 18 }} />, label: 'Net units', value: adj ? `${num(adj.net_quantity) > 0 ? '+' : ''}${qtyText(adj.net_quantity)}` : '0', caption: 'Added minus removed' },
          ],
          empty: 'No adjustments in this period.',
        };
      }
      case 'transfers': {
        const tin = moved('transfer_in');
        const tout = moved('transfer_out');
        return {
          columns: [
            { key: 'created_at', label: 'Date', value: (x: StockTransferRow) => formatDateTime(x.created_at, currency) },
            { key: 'product_name', label: 'Product', render: (x: StockTransferRow) => <b>{x.product_name}</b> },
            { key: 'store_name', label: 'Branch' },
            { key: 'type', label: 'Direction', value: (x: StockTransferRow) => (x.type === 'transfer_in' ? 'In' : 'Out'), render: (x: StockTransferRow) => <MovementTypeBadge type={x.type as MovementType} /> },
            { key: 'quantity', label: 'Qty', kind: 'number', value: (x: StockTransferRow) => Math.abs(num(x.quantity)) },
            { key: 'balance_after', label: 'Balance after', kind: 'number' },
          ] as ReportColumn<unknown>[],
          rowKey: (x: unknown) => (x as StockTransferRow).id,
          cards: [
            { icon: <SwapHorizOutlinedIcon sx={{ fontSize: 18 }} />, label: 'Transfers in', value: tin ? `+${qtyText(tin.net_quantity)}` : '0', caption: tin ? `${num(tin.movement_count)} movements` : ' ' },
            { icon: <SwapHorizOutlinedIcon sx={{ fontSize: 18 }} />, label: 'Transfers out', value: tout ? qtyText(Math.abs(num(tout.net_quantity))) : '0', caption: tout ? `${num(tout.movement_count)} movements` : ' ' },
          ],
          empty: 'No transfers in this period.',
        };
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportType, rows, movement, stores, storeId, currency]);

  async function onExport(format: 'xlsx' | 'csv' | 'pdf') {
    try {
      const all = PAGED.includes(reportType) ? await fetchAll<unknown>(reportType) : rows;
      await exportReport(format, {
        title: info.title,
        subtitle: storeName ?? 'All branches',
        range: DATED.includes(reportType) ? range : { from: '', to: '' },
        filters: [categoryName && reportType === 'current-stock' ? `Category: ${categoryName}` : '', DATED.includes(reportType) ? '' : 'As of now'].filter(Boolean),
        stats: (view.cards ?? []).map((c) => ({ label: c.label, value: c.value })),
        columns: view.columns,
        rows: all,
        totals: 'totals' in view ? (view.totals as Partial<Record<string, number>>) : undefined,
        printedBy: user?.name ?? null,
        currency,
      });
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Could not prepare the export', 'error');
    }
  }

  const paged = PAGED.includes(reportType);

  return (
    <div>
      <ReportPicker groups={GROUPS} value={reportType} onChange={changeReport} />
      <ReportHeader title={info.title} description={info.description} stores={stores} storeId={storeId} onStoreChange={setStoreId} />

      <Stack direction={{ xs: 'column', md: 'row' }} sx={{ justifyContent: 'space-between', alignItems: { md: 'flex-start' }, gap: 1.5 }}>
        {DATED.includes(reportType) ? (
          <DateRangeBar range={range} onChange={setRange} />
        ) : (
          <Stack direction="row" spacing={1.5} sx={{ mb: 2, alignItems: 'center', flexWrap: 'wrap' }} useFlexGap>
            <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', color: 'text.secondary' }}>
              <ScheduleOutlinedIcon sx={{ fontSize: 17 }} />
              <Typography variant="body2">Stock as it stands right now.</Typography>
            </Stack>
            {reportType === 'current-stock' && (
              <InlineSelectFilter
                label="Category"
                value={categoryId}
                onChange={setCategoryId}
                minWidth={180}
                options={[{ value: '', label: 'All categories' }, ...categories.map((c) => ({ value: String(c.id), label: c.name }))]}
              />
            )}
          </Stack>
        )}
        <Box sx={{ flexShrink: 0, mb: 2 }}>
          <ExportButton onExport={onExport} disabled={loading || rows.length === 0} />
        </Box>
      </Stack>

      {view.cards && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: `repeat(${view.cards.length}, 1fr)` }, gap: 1.5, mb: 2.5 }}>
          {view.cards.map((c) => (
            <MetricCard key={c.label} icon={c.icon} label={c.label} value={loading ? '–' : c.value} caption={loading ? undefined : c.caption} />
          ))}
        </Box>
      )}

      <ReportTable<unknown>
        columns={view.columns}
        rows={rows}
        rowKey={view.rowKey as (row: unknown, i: number) => string | number}
        loading={loading}
        totals={'totals' in view ? (view.totals as Partial<Record<string, number>>) : undefined}
        emptyLabel={view.empty}
        footer={
          paged && (page > 1 || rows.length === PAGE_SIZE) ? (
            <Stack direction="row" spacing={2} sx={{ alignItems: 'center', justifyContent: 'flex-end', pt: 1.5 }}>
              <Typography variant="body2" color="text.secondary">
                Page {page} · {PAGE_SIZE} per page
              </Typography>
              <Button size="small" variant="outlined" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <Button size="small" variant="outlined" disabled={rows.length < PAGE_SIZE || loading} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </Stack>
          ) : undefined
        }
      />
    </div>
  );
}
