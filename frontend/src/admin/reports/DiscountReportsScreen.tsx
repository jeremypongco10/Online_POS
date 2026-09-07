import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import type { DiscountCashierSummary, DiscountDetail, DiscountTypeSummary, Store } from '../../api/types';
import { formatMoney } from '../../pos/format';
import { discountTypeLabel } from '../../pos/discountTypes';
import { ReportFilters } from './ReportFilters';
import { ReportTable, type ReportColumn } from './ReportTable';
import { SearchableSelect } from '../SearchableSelect';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';

type ReportType = 'summary' | 'sc-pwd' | 'cashier' | 'manual';

const REPORT_OPTIONS: { value: ReportType; label: string }[] = [
  { value: 'summary', label: 'By Discount Type' },
  { value: 'sc-pwd', label: 'SC / PWD Register' },
  { value: 'cashier', label: 'By Cashier' },
  { value: 'manual', label: 'Manual Discounts' },
];

/** The three statutory types, as the details endpoint's discount_type filter wants them. Kept literal rather than derived from DISCOUNT_TYPES so a future non-government type can never quietly wander into the BIR register. */
const GOVERNMENT_TYPES = 'senior_citizen,pwd,sc_pwd_5_bnpc';

/** A discount recorded before discount types existed still has to appear — it left the till like any other. */
const UNTYPED_LABEL = 'Untyped (pre-dates discount types)';

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

/** Shared by the two detail reports — the SC/PWD register adds the holder columns on top of these. */
function detailColumns(): ReportColumn<DiscountDetail>[] {
  return [
    { key: 'sale_date', label: 'Date', render: (r) => r.sale_date?.slice(0, 16) ?? '—' },
    { key: 'invoice_number', label: 'Invoice' },
    { key: 'product_name', label: 'Item', render: (r) => r.product_name ?? '—' },
    { key: 'quantity', label: 'Qty', align: 'right', render: (r) => parseFloat(r.quantity) },
    { key: 'unit_price', label: 'Price', align: 'right', render: (r) => formatMoney(parseFloat(r.unit_price)) },
    { key: 'discount', label: 'Discount', align: 'right', render: (r) => formatMoney(parseFloat(r.discount)) },
    { key: 'line_total', label: 'Line Total', align: 'right', render: (r) => formatMoney(parseFloat(r.line_total)) },
  ];
}

/**
 * Discounts given, from four angles: what was given under each type, the
 * Senior Citizen/PWD register a store has to be able to produce (BIR RR
 * 7-2010 requires the purchaser's name and ID number be on record — this
 * is where that record reads back out), who granted them, and the
 * discretionary Manual ones on their own for review.
 *
 * All four count discounted LINES rather than sales, since the type
 * lives on the line — see ReportsController::discountedLinesBuilder.
 */
export function DiscountReportsScreen() {
  const [stores, setStores] = useState<Store[]>([]);
  const [storeId, setStoreId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [reportType, setReportType] = useState<ReportType>('summary');
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<unknown[]>([]);

  useEffect(() => {
    api.get<Store[]>('/stores?per_page=50').then(setStores);
  }, []);

  useEffect(() => {
    const query = new URLSearchParams();
    if (storeId) query.set('store_id', storeId);
    if (from) query.set('from', from);
    if (to) query.set('to', to);

    const endpoints: Record<ReportType, string> = {
      summary: `/reports/discount-summary?${query}`,
      cashier: `/reports/discounts-by-cashier?${query}`,
      'sc-pwd': `/reports/discount-details?${query}&discount_type=${GOVERNMENT_TYPES}`,
      manual: `/reports/discount-details?${query}&discount_type=manual`,
    };

    setLoading(true);
    setRows([]);
    api
      .get<unknown[]>(endpoints[reportType])
      .then(setRows)
      .finally(() => setLoading(false));
  }, [storeId, from, to, reportType]);

  const summaryRows = rows as DiscountTypeSummary[];
  const grandTotal = reportType === 'summary' ? summaryRows.reduce((sum, r) => sum + parseFloat(r.discount_total), 0) : 0;
  const grandLines = reportType === 'summary' ? summaryRows.reduce((sum, r) => sum + Number(r.line_count), 0) : 0;

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
      >
        <SearchableSelect
          label="Report"
          value={reportType}
          onChange={(v) => {
            // Cleared in the same update as the type change — otherwise
            // there's one render pairing new columns with old, differently
            // shaped rows, since the reload effect only runs after that
            // render commits. Same reasoning as SalesReportsScreen.
            setRows([]);
            setReportType(v as ReportType);
          }}
          sx={{ minWidth: 200 }}
          options={REPORT_OPTIONS}
        />
      </ReportFilters>

      {reportType === 'summary' && (
        <>
          <Grid container spacing={2} sx={{ mb: 2.25 }}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <StatTile label="Total Discounts" value={formatMoney(grandTotal)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <StatTile label="Discounted Lines" value={grandLines} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <StatTile label="Types Used" value={summaryRows.length} />
            </Grid>
          </Grid>

          <ReportTable<DiscountTypeSummary>
            columns={[
              { key: 'discount_type', label: 'Discount Type', render: (r) => discountTypeLabel(r.discount_type) ?? UNTYPED_LABEL },
              { key: 'sale_count', label: 'Sales', align: 'right' },
              { key: 'line_count', label: 'Lines', align: 'right' },
              { key: 'discount_total', label: 'Discount Given', align: 'right', render: (r) => formatMoney(parseFloat(r.discount_total)) },
              { key: 'net_total', label: 'Net Sales', align: 'right', render: (r) => formatMoney(parseFloat(r.net_total)) },
            ]}
            rows={summaryRows}
            rowKey={(r) => r.discount_type ?? 'untyped'}
            loading={loading}
            emptyLabel="No discounts given in this period."
          />
        </>
      )}

      {reportType === 'cashier' && (
        <ReportTable<DiscountCashierSummary>
          columns={[
            { key: 'cashier_name', label: 'Cashier', render: (r) => r.cashier_name ?? `#${r.user_id}` },
            { key: 'sale_count', label: 'Sales', align: 'right' },
            { key: 'line_count', label: 'Lines', align: 'right' },
            { key: 'discount_total', label: 'Discount Given', align: 'right', render: (r) => formatMoney(parseFloat(r.discount_total)) },
          ]}
          rows={rows as DiscountCashierSummary[]}
          rowKey={(r) => r.user_id}
          loading={loading}
          emptyLabel="No discounts given in this period."
        />
      )}

      {reportType === 'sc-pwd' && (
        <>
          <Alert severity="info" sx={{ mb: 2.25 }}>
            Senior Citizen, PWD, and 5% Basic Necessities lines, with the name and ID number recorded against each sale — the
            documentation BIR RR 7-2010 requires for these discounts. Most recent 500 lines in the selected period.
          </Alert>
          <ReportTable<DiscountDetail>
            columns={[
              ...detailColumns().slice(0, 2),
              { key: 'discount_holder_name', label: 'Customer', render: (r) => r.discount_holder_name ?? '—' },
              { key: 'discount_id_number', label: 'ID No.', render: (r) => r.discount_id_number ?? '—' },
              { key: 'discount_type', label: 'Type', render: (r) => discountTypeLabel(r.discount_type) ?? '—' },
              ...detailColumns().slice(2),
            ]}
            rows={rows as DiscountDetail[]}
            rowKey={(r) => r.sale_item_id}
            loading={loading}
            emptyLabel="No Senior Citizen or PWD discounts in this period."
          />
        </>
      )}

      {reportType === 'manual' && (
        <>
          <Alert severity="info" sx={{ mb: 2.25 }}>
            Manual Discounts are the one type with no statutory rate or standing policy behind them. Who approved each one is
            recorded separately, under Reports → Audit Trail. Most recent 500 lines in the selected period.
          </Alert>
          <ReportTable<DiscountDetail>
            columns={[
              ...detailColumns().slice(0, 2),
              { key: 'cashier_name', label: 'Cashier', render: (r) => r.cashier_name ?? '—' },
              ...detailColumns().slice(2),
            ]}
            rows={rows as DiscountDetail[]}
            rowKey={(r) => r.sale_item_id}
            loading={loading}
            emptyLabel="No manual discounts in this period."
          />
        </>
      )}
    </div>
  );
}
