import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import type {
  Category,
  CurrentStockRow,
  InventoryValuation,
  StockAdjustmentRow,
  StockMovementRow,
  StockTransferRow,
  Store,
} from '../../api/types';
import type { DashboardData } from '../../api/types';
import { formatMoney } from '../../pos/format';
import { ReportFilters } from './ReportFilters';
import { ReportTable } from './ReportTable';
import { SearchableSelect } from '../SearchableSelect';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';

type LowStockRow = DashboardData['low_stock'][number];

type ReportType = 'valuation' | 'current-stock' | 'low-stock' | 'movement' | 'adjustments' | 'transfers';

const REPORT_OPTIONS: { value: ReportType; label: string }[] = [
  { value: 'valuation', label: 'Inventory Valuation' },
  { value: 'current-stock', label: 'Current Stock' },
  { value: 'low-stock', label: 'Low Stock' },
  { value: 'movement', label: 'Stock Movement' },
  { value: 'adjustments', label: 'Stock Adjustments' },
  { value: 'transfers', label: 'Stock Transfers' },
];

const PAGINATED: ReportType[] = ['current-stock', 'low-stock', 'adjustments', 'transfers'];
const DATE_FILTERED: ReportType[] = ['movement', 'adjustments', 'transfers'];

export function InventoryReportsScreen() {
  const [stores, setStores] = useState<Store[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [storeId, setStoreId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [reportType, setReportType] = useState<ReportType>('valuation');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<unknown[]>([]);

  useEffect(() => {
    api.get<Store[]>('/stores?per_page=50').then(setStores);
    api.get<Category[]>('/categories?per_page=200').then(setCategories);
  }, []);

  useEffect(() => {
    setPage(1);
  }, [reportType, storeId, categoryId, from, to]);

  useEffect(() => {
    const query = new URLSearchParams();
    if (storeId) query.set('store_id', storeId);
    if (categoryId && reportType === 'current-stock') query.set('category_id', categoryId);
    if (from && DATE_FILTERED.includes(reportType)) query.set('from', from);
    if (to && DATE_FILTERED.includes(reportType)) query.set('to', to);
    if (PAGINATED.includes(reportType)) {
      query.set('page', String(page));
      query.set('per_page', '20');
    }
    const qs = query.toString();

    const endpoints: Record<ReportType, string> = {
      valuation: `/reports/inventory-valuation?${qs}`,
      'current-stock': `/reports/current-stock?${qs}`,
      'low-stock': `/reports/low-stock?${qs}`,
      movement: `/reports/stock-movement?${qs}`,
      adjustments: `/reports/stock-adjustments?${qs}`,
      transfers: `/reports/stock-transfers?${qs}`,
    };

    setLoading(true);
    setRows([]);
    api
      .get<unknown[]>(endpoints[reportType])
      .then(setRows)
      .finally(() => setLoading(false));
  }, [reportType, storeId, categoryId, from, to, page]);

  const storeName = (id: number) => stores.find((s) => s.id === id)?.name ?? `#${id}`;

  return (
    <div>
      <ReportFilters stores={stores} storeId={storeId} onStoreChange={setStoreId} from={from} onFromChange={setFrom} to={to} onToChange={setTo}>
        <SearchableSelect
          label="Report"
          value={reportType}
          onChange={(v) => {
            // Clear rows in the same update as the type change — otherwise
            // there's one render where the new columns pair with the old
            // (differently-shaped) rows, since the effect that reloads
            // data only runs after that render has already committed.
            setRows([]);
            setReportType(v as ReportType);
          }}
          sx={{ minWidth: 180 }}
          options={REPORT_OPTIONS}
        />
        {reportType === 'current-stock' && (
          <SearchableSelect
            label="Category"
            value={categoryId}
            onChange={setCategoryId}
            sx={{ minWidth: 160 }}
            options={[{ value: '', label: 'All Categories' }, ...categories.map((c) => ({ value: String(c.id), label: c.name }))]}
          />
        )}
      </ReportFilters>

      {reportType === 'valuation' && (
        <ReportTable<InventoryValuation>
          columns={[
            { key: 'store_name', label: 'Store', render: (r) => storeName(r.store_id) },
            { key: 'product_count', label: 'Products', align: 'right' },
            { key: 'total_cost_value', label: 'Total Cost Value', align: 'right', render: (r) => formatMoney(parseFloat(r.total_cost_value)) },
          ]}
          rows={rows as InventoryValuation[]}
          rowKey={(r) => r.store_id}
          loading={loading}
        />
      )}

      {reportType === 'current-stock' && (
        <ReportTable<CurrentStockRow>
          columns={[
            { key: 'product_name', label: 'Product' },
            { key: 'sku', label: 'SKU' },
            { key: 'quantity', label: 'Qty', align: 'right', render: (r) => `${parseFloat(r.quantity)} ${r.unit ?? ''}`.trim() },
            { key: 'reorder_level', label: 'Reorder At', align: 'right', render: (r) => parseFloat(r.reorder_level) },
            { key: 'cost_value', label: 'Cost Value', align: 'right', render: (r) => formatMoney(parseFloat(r.cost_value)) },
          ]}
          rows={rows as CurrentStockRow[]}
          rowKey={(r) => r.id}
          loading={loading}
        />
      )}

      {reportType === 'low-stock' && (
        <ReportTable<LowStockRow>
          columns={[
            { key: 'product_name', label: 'Product' },
            { key: 'sku', label: 'SKU' },
            {
              key: 'quantity',
              label: 'Qty',
              align: 'right',
              render: (r) => (
                <Typography component="span" color="error.main" sx={{ fontWeight: 600 }}>
                  {parseFloat(r.quantity)}
                </Typography>
              ),
            },
            { key: 'reorder_level', label: 'Reorder At', align: 'right', render: (r) => parseFloat(r.reorder_level) },
          ]}
          rows={rows as LowStockRow[]}
          rowKey={(r) => r.id}
          loading={loading}
          emptyLabel="Nothing below reorder level."
        />
      )}

      {reportType === 'movement' && (
        <ReportTable<StockMovementRow>
          columns={[
            {
              key: 'type',
              label: 'Type',
              render: (r) => <Chip size="small" label={r.type.replace('_', ' ')} sx={{ textTransform: 'capitalize' }} />,
            },
            { key: 'movement_count', label: 'Movements', align: 'right' },
            { key: 'net_quantity', label: 'Net Quantity', align: 'right', render: (r) => parseFloat(r.net_quantity) },
          ]}
          rows={rows as StockMovementRow[]}
          rowKey={(r) => r.type}
          loading={loading}
        />
      )}

      {reportType === 'adjustments' && (
        <ReportTable<StockAdjustmentRow>
          columns={[
            { key: 'created_at', label: 'Date', render: (r) => r.created_at.slice(0, 16).replace('T', ' ') },
            { key: 'product_name', label: 'Product' },
            { key: 'sku', label: 'SKU' },
            { key: 'quantity', label: 'Change', align: 'right', render: (r) => parseFloat(r.quantity) },
            { key: 'balance_after', label: 'Balance After', align: 'right', render: (r) => parseFloat(r.balance_after) },
            { key: 'notes', label: 'Notes', render: (r) => r.notes ?? '—' },
          ]}
          rows={rows as StockAdjustmentRow[]}
          rowKey={(r) => r.id}
          loading={loading}
        />
      )}

      {reportType === 'transfers' && (
        <ReportTable<StockTransferRow>
          columns={[
            { key: 'created_at', label: 'Date', render: (r) => r.created_at.slice(0, 16).replace('T', ' ') },
            { key: 'product_name', label: 'Product' },
            { key: 'store_name', label: 'Store' },
            {
              key: 'type',
              label: 'Direction',
              render: (r) => (
                <Chip
                  size="small"
                  label={r.type === 'transfer_in' ? 'In' : 'Out'}
                  color={r.type === 'transfer_in' ? 'success' : 'default'}
                />
              ),
            },
            { key: 'quantity', label: 'Qty', align: 'right', render: (r) => Math.abs(parseFloat(r.quantity)) },
            { key: 'balance_after', label: 'Balance After', align: 'right', render: (r) => parseFloat(r.balance_after) },
          ]}
          rows={rows as StockTransferRow[]}
          rowKey={(r) => r.id}
          loading={loading}
        />
      )}

      {PAGINATED.includes(reportType) && (
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center', justifyContent: 'center', py: 1.75 }}>
          <Button size="small" variant="outlined" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            ← Prev
          </Button>
          <Typography variant="body2" color="text.secondary">
            Page {page}
          </Typography>
          <Button size="small" variant="outlined" disabled={rows.length < 20} onClick={() => setPage((p) => p + 1)}>
            Next →
          </Button>
        </Stack>
      )}
    </div>
  );
}
