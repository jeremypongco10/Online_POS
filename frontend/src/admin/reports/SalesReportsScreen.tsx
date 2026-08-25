import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import type {
  BaggerSales,
  CashierSales,
  CategorySales,
  DailySales,
  MonthlySales,
  PaymentMethodSales,
  ProductSales,
  SalesAggregate,
  Store,
  StoreSales,
  VatSummary,
} from '../../api/types';
import { formatMoney } from '../../pos/format';
import { ReportFilters } from './ReportFilters';
import { ReportTable, type ReportColumn } from './ReportTable';
import { SearchableSelect } from '../SearchableSelect';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';

type ReportType =
  | 'summary'
  | 'daily'
  | 'monthly'
  | 'store'
  | 'cashier'
  | 'bagger'
  | 'products'
  | 'categories'
  | 'payment-methods'
  | 'vat';

const REPORT_OPTIONS: { value: ReportType; label: string }[] = [
  { value: 'summary', label: 'Summary' },
  { value: 'daily', label: 'Daily Trend' },
  { value: 'monthly', label: 'Monthly Trend' },
  { value: 'store', label: 'By Store' },
  { value: 'cashier', label: 'By Cashier' },
  { value: 'bagger', label: 'By Bagger' },
  { value: 'products', label: 'Top Products' },
  { value: 'categories', label: 'By Category' },
  { value: 'payment-methods', label: 'Payment Methods' },
  { value: 'vat', label: 'VAT Summary' },
];

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <Paper variant="outlined" sx={{ p: 2.25, borderRadius: 1.5 }}>
      <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </Typography>
      <Typography variant="h5" sx={{ fontWeight: 700, mt: 0.5 }}>
        {value}
      </Typography>
    </Paper>
  );
}

function aggregateColumns<T extends SalesAggregate>(extra: ReportColumn<T>[]): ReportColumn<T>[] {
  return [
    ...extra,
    { key: 'sale_count', label: 'Sales', align: 'right' },
    { key: 'subtotal', label: 'Subtotal', align: 'right', render: (r) => formatMoney(parseFloat(r.subtotal)) },
    { key: 'discount_total', label: 'Discount', align: 'right', render: (r) => formatMoney(parseFloat(r.discount_total)) },
    { key: 'tax_total', label: 'Tax', align: 'right', render: (r) => formatMoney(parseFloat(r.tax_total)) },
    { key: 'total', label: 'Total', align: 'right', render: (r) => formatMoney(parseFloat(r.total)) },
  ];
}

export function SalesReportsScreen() {
  const [stores, setStores] = useState<Store[]>([]);
  const [storeId, setStoreId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [reportType, setReportType] = useState<ReportType>('summary');
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<unknown[]>([]);
  const [summary, setSummary] = useState<SalesAggregate | null>(null);
  const [vat, setVat] = useState<VatSummary | null>(null);

  useEffect(() => {
    api.get<Store[]>('/stores?per_page=50').then(setStores);
  }, []);

  useEffect(() => {
    const query = new URLSearchParams();
    if (storeId) query.set('store_id', storeId);
    if (from) query.set('from', from);
    if (to) query.set('to', to);
    const qs = query.toString();

    setLoading(true);
    setSummary(null);
    setVat(null);
    setRows([]);

    const endpoints: Record<ReportType, string> = {
      summary: `/reports/sales-summary?${qs}`,
      daily: `/reports/daily-sales?${qs}`,
      monthly: `/reports/monthly-sales?${qs}`,
      store: `/reports/store-sales?${qs}`,
      cashier: `/reports/cashier-sales?${qs}`,
      bagger: `/reports/bagger-performance?${qs}`,
      products: `/reports/product-sales?${qs}`,
      categories: `/reports/category-sales?${qs}`,
      'payment-methods': `/reports/payment-methods?${qs}`,
      vat: `/reports/vat-summary?${qs}`,
    };

    if (reportType === 'summary') {
      api.get<SalesAggregate>(endpoints.summary).then(setSummary).finally(() => setLoading(false));
    } else if (reportType === 'vat') {
      api.get<VatSummary>(endpoints.vat).then(setVat).finally(() => setLoading(false));
    } else {
      api
        .get<unknown[]>(endpoints[reportType])
        .then(setRows)
        .finally(() => setLoading(false));
    }
  }, [storeId, from, to, reportType]);

  return (
    <div>
      <ReportFilters
        stores={stores}
        storeId={storeId}
        onStoreChange={setStoreId}
        from={from}
        onFromChange={setFrom}
        to={to}
        onToChange={setTo}
        hideStore={reportType === 'store'}
      >
        <SearchableSelect
          label="Report"
          value={reportType}
          onChange={(v) => {
            // Clear all result state in the same update as the type change
            // — otherwise there's one render where the new columns pair
            // with the old (differently-shaped) rows/summary/vat, since
            // the effect that reloads data only runs after that render
            // has already committed.
            setRows([]);
            setSummary(null);
            setVat(null);
            setReportType(v as ReportType);
          }}
          sx={{ minWidth: 180 }}
          options={REPORT_OPTIONS}
        />
      </ReportFilters>

      {reportType === 'summary' &&
        (loading || !summary ? (
          <Typography color="text.secondary">Loading…</Typography>
        ) : (
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
              <StatTile label="Sales" value={summary.sale_count} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
              <StatTile label="Subtotal" value={formatMoney(parseFloat(summary.subtotal))} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
              <StatTile label="Discount" value={formatMoney(parseFloat(summary.discount_total))} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
              <StatTile label="Tax" value={formatMoney(parseFloat(summary.tax_total))} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
              <StatTile label="Total" value={formatMoney(parseFloat(summary.total))} />
            </Grid>
          </Grid>
        ))}

      {reportType === 'vat' &&
        (loading || !vat ? (
          <Typography color="text.secondary">Loading…</Typography>
        ) : (
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <StatTile label="Vatable Sales" value={formatMoney(vat.vatable_sales)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <StatTile label="VAT Amount" value={formatMoney(vat.vat_amount)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <StatTile label="VAT-Exempt Sales" value={formatMoney(vat.vat_exempt_sales)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <StatTile label="Zero-Rated Sales" value={formatMoney(vat.zero_rated_sales)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <StatTile label="Non-VAT Sales" value={formatMoney(vat.non_vat_sales)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <StatTile label="Total Sales" value={formatMoney(vat.total_sales)} />
            </Grid>
          </Grid>
        ))}

      {reportType === 'daily' && (
        <ReportTable<DailySales>
          columns={aggregateColumns<DailySales>([{ key: 'date', label: 'Date' }])}
          rows={rows as DailySales[]}
          rowKey={(r) => r.date}
          loading={loading}
        />
      )}

      {reportType === 'monthly' && (
        <ReportTable<MonthlySales>
          columns={aggregateColumns<MonthlySales>([{ key: 'month', label: 'Month' }])}
          rows={rows as MonthlySales[]}
          rowKey={(r) => r.month}
          loading={loading}
        />
      )}

      {reportType === 'store' && (
        <ReportTable<StoreSales>
          columns={aggregateColumns<StoreSales>([{ key: 'store_name', label: 'Store', render: (r) => r.store_name ?? `#${r.store_id}` }])}
          rows={rows as StoreSales[]}
          rowKey={(r) => r.store_id}
          loading={loading}
        />
      )}

      {reportType === 'cashier' && (
        <ReportTable<CashierSales>
          columns={aggregateColumns<CashierSales>([{ key: 'cashier_name', label: 'Cashier', render: (r) => r.cashier_name ?? `#${r.user_id}` }])}
          rows={rows as CashierSales[]}
          rowKey={(r) => r.user_id}
          loading={loading}
        />
      )}

      {reportType === 'bagger' && (
        <ReportTable<BaggerSales>
          columns={aggregateColumns<BaggerSales>([{ key: 'bagger_name', label: 'Bagger', render: (r) => r.bagger_name ?? `#${r.bagger_id}` }])}
          rows={rows as BaggerSales[]}
          rowKey={(r) => r.bagger_id}
          loading={loading}
        />
      )}

      {reportType === 'products' && (
        <ReportTable<ProductSales>
          columns={[
            { key: 'product_name', label: 'Product', render: (r) => r.product_name ?? `#${r.product_id}` },
            { key: 'product_sku', label: 'SKU' },
            { key: 'order_count', label: 'Orders', align: 'right' },
            { key: 'total_quantity', label: 'Qty Sold', align: 'right', render: (r) => parseFloat(r.total_quantity) },
            { key: 'total_revenue', label: 'Revenue', align: 'right', render: (r) => formatMoney(parseFloat(r.total_revenue)) },
          ]}
          rows={rows as ProductSales[]}
          rowKey={(r) => r.product_id}
          loading={loading}
        />
      )}

      {reportType === 'categories' && (
        <ReportTable<CategorySales>
          columns={[
            { key: 'category_name', label: 'Category' },
            { key: 'total_quantity', label: 'Qty Sold', align: 'right', render: (r) => parseFloat(r.total_quantity) },
            { key: 'total_revenue', label: 'Revenue', align: 'right', render: (r) => formatMoney(parseFloat(r.total_revenue)) },
          ]}
          rows={rows as CategorySales[]}
          rowKey={(r) => r.category_id ?? 'uncategorized'}
          loading={loading}
        />
      )}

      {reportType === 'payment-methods' && (
        <ReportTable<PaymentMethodSales>
          columns={[
            { key: 'method', label: 'Method' },
            { key: 'payment_count', label: 'Payments', align: 'right' },
            { key: 'total_amount', label: 'Amount', align: 'right', render: (r) => formatMoney(parseFloat(r.total_amount)) },
          ]}
          rows={rows as PaymentMethodSales[]}
          rowKey={(r) => r.method}
          loading={loading}
        />
      )}
    </div>
  );
}
