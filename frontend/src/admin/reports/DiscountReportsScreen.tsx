import { useEffect, useMemo, useState } from 'react';
import { api, ApiError } from '../../api/client';
import type { DiscountCashierSummary, DiscountDetail, DiscountTypeSummary, Store } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';
import { useSnackbar } from '../../Snackbar';
import { formatMoney } from '../../pos/format';
import { discountTypeLabel } from '../../pos/discountTypes';
import { currencySymbol } from '../../regional';
import { MetricCard } from '../SummaryCards';
import { ReportTable } from './ReportTable';
import { DateRangeBar, ExportButton, ReportHeader, ReportPicker, ShareBar, type ReportOption } from './ReportKit';
import { defaultRange, exportReport, num, sumOf, type DateRange, type ReportColumn } from './reportUtils';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import LocalOfferOutlinedIcon from '@mui/icons-material/LocalOfferOutlined';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import ElderlyOutlinedIcon from '@mui/icons-material/ElderlyOutlined';
import EditNoteOutlinedIcon from '@mui/icons-material/EditNoteOutlined';
import ReceiptOutlinedIcon from '@mui/icons-material/ReceiptOutlined';
import FormatListNumberedOutlinedIcon from '@mui/icons-material/FormatListNumberedOutlined';
import WorkspacePremiumOutlinedIcon from '@mui/icons-material/WorkspacePremiumOutlined';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';

type ReportType = 'summary' | 'cashier' | 'sc-pwd' | 'manual';

const GROUPS: { label: string; options: ReportOption<ReportType>[] }[] = [
  {
    label: 'Overview',
    options: [
      { value: 'summary', label: 'By discount type', icon: <LocalOfferOutlinedIcon /> },
      { value: 'cashier', label: 'By cashier', icon: <BadgeOutlinedIcon /> },
    ],
  },
  {
    label: 'Registers',
    options: [
      { value: 'sc-pwd', label: 'SC / PWD register', icon: <ElderlyOutlinedIcon /> },
      { value: 'manual', label: 'Manual discounts', icon: <EditNoteOutlinedIcon /> },
    ],
  },
];

const INFO: Record<ReportType, { title: string; description: string }> = {
  summary: { title: 'Discounts by type', description: 'How much was given under each discount, and what those sales came to.' },
  cashier: { title: 'Discounts by cashier', description: 'Who gave discounts, how often, and how much.' },
  'sc-pwd': { title: 'SC / PWD register', description: 'Senior Citizen, PWD and 5% BNPC lines with the holder’s name and ID — the record BIR RR 7-2010 requires.' },
  manual: { title: 'Manual discounts', description: 'Discretionary discounts with no statutory rate behind them, for review.' },
};

/** The three statutory types, as the details endpoint's discount_type filter wants them. Kept literal so a future non-government type can never wander into the BIR register. */
const GOVERNMENT_TYPES = 'senior_citizen,pwd,sc_pwd_5_bnpc';

/** A discount recorded before discount types existed still has to appear — it left the till like any other. */
const UNTYPED_LABEL = 'Untyped (pre-dates discount types)';

/**
 * Discounts given, from four angles. All four count discounted LINES
 * rather than sales, since the type lives on the line — see
 * ReportsController::discountedLinesBuilder.
 */
export function DiscountReportsScreen() {
  const { user } = useAuth();
  const notify = useSnackbar();
  const currency = user?.currency;
  const symbol = currencySymbol(currency);
  const money = (v: unknown) => `${symbol}${formatMoney(num(v))}`;

  const [stores, setStores] = useState<Store[]>([]);
  const [storeId, setStoreId] = useState('');
  const [range, setRange] = useState<DateRange>(defaultRange);
  const [reportType, setReportType] = useState<ReportType>('summary');
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<unknown[]>([]);

  useEffect(() => {
    api.get<Store[]>('/stores?per_page=100').then(setStores).catch(() => setStores([]));
  }, []);

  useEffect(() => {
    const query = new URLSearchParams();
    if (storeId) query.set('store_id', storeId);
    if (range.from) query.set('from', range.from);
    if (range.to) query.set('to', range.to);

    const endpoints: Record<ReportType, string> = {
      summary: `/reports/discount-summary?${query}`,
      cashier: `/reports/discounts-by-cashier?${query}`,
      'sc-pwd': `/reports/discount-details?${query}&discount_type=${GOVERNMENT_TYPES}`,
      manual: `/reports/discount-details?${query}&discount_type=manual`,
    };

    let cancelled = false;
    setLoading(true);
    setRows([]);
    api
      .get<unknown[]>(endpoints[reportType])
      .then((r) => !cancelled && setRows(r))
      .catch(() => undefined)
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [storeId, range, reportType]);

  function changeReport(next: ReportType) {
    setRows([]);
    setReportType(next);
  }

  const storeName = stores.find((s) => String(s.id) === storeId)?.name;
  const info = INFO[reportType];

  const view = useMemo(() => {
    const detail = (extra: ReportColumn<DiscountDetail>[]): ReportColumn<DiscountDetail>[] => [
      { key: 'sale_date', label: 'Date', value: (r) => r.sale_date?.slice(0, 16).replace('T', ' ') ?? '' },
      { key: 'invoice_number', label: 'Invoice', render: (r) => <b>{r.invoice_number}</b> },
      ...extra,
      { key: 'product_name', label: 'Item', value: (r) => r.product_name ?? '' },
      { key: 'quantity', label: 'Qty', kind: 'number' },
      { key: 'unit_price', label: 'Price', kind: 'money' },
      { key: 'discount', label: 'Discount', kind: 'money', render: (r) => <b>{formatMoney(num(r.discount))}</b> },
      { key: 'line_total', label: 'Line total', kind: 'money' },
    ];
    const lineTotals = (r: DiscountDetail[]) => ({ quantity: sumOf(r, (x) => x.quantity), discount: sumOf(r, (x) => x.discount), line_total: sumOf(r, (x) => x.line_total) });
    const capNote = rows.length >= 500 ? 'Showing the latest 500 lines — narrow the dates to see the rest.' : undefined;

    switch (reportType) {
      case 'summary': {
        const r = rows as DiscountTypeSummary[];
        const total = sumOf(r, (x) => x.discount_total);
        const top = [...r].sort((a, b) => num(b.discount_total) - num(a.discount_total))[0];
        const label = (x: DiscountTypeSummary) => discountTypeLabel(x.discount_type) ?? UNTYPED_LABEL;
        return {
          columns: [
            { key: 'discount_type', label: 'Discount type', value: label, render: (x: DiscountTypeSummary) => <b>{label(x)}</b> },
            { key: 'sale_count', label: 'Sales', kind: 'number' },
            { key: 'line_count', label: 'Lines', kind: 'number' },
            { key: 'discount_total', label: 'Discount given', kind: 'money' },
            { key: 'net_total', label: 'Net sales', kind: 'money' },
            { key: 'share', label: 'Share', screenOnly: true, render: (x: DiscountTypeSummary) => <ShareBar value={num(x.discount_total)} total={total} /> },
          ] as ReportColumn<unknown>[],
          totals: { sale_count: sumOf(r, (x) => x.sale_count), line_count: sumOf(r, (x) => x.line_count), discount_total: total, net_total: sumOf(r, (x) => x.net_total) },
          rowKey: (x: unknown) => (x as DiscountTypeSummary).discount_type ?? 'untyped',
          cards: [
            { icon: <LocalOfferOutlinedIcon sx={{ fontSize: 18 }} />, label: 'Discounts given', value: money(total), caption: `Across ${r.length} type${r.length === 1 ? '' : 's'}` },
            { icon: <ReceiptOutlinedIcon sx={{ fontSize: 18 }} />, label: 'Discounted sales', value: sumOf(r, (x) => x.sale_count).toLocaleString(), caption: `${sumOf(r, (x) => x.line_count).toLocaleString()} lines` },
            { icon: <WorkspacePremiumOutlinedIcon sx={{ fontSize: 18 }} />, label: 'Most given', value: top ? label(top) : '—', caption: top ? money(top.discount_total) : ' ' },
          ],
          empty: 'No discounts given in this period.',
        };
      }
      case 'cashier': {
        const r = rows as DiscountCashierSummary[];
        const total = sumOf(r, (x) => x.discount_total);
        const top = [...r].sort((a, b) => num(b.discount_total) - num(a.discount_total))[0];
        const name = (x: DiscountCashierSummary) => x.cashier_name ?? `#${x.user_id}`;
        return {
          columns: [
            { key: 'cashier_name', label: 'Cashier', value: name, render: (x: DiscountCashierSummary) => <b>{name(x)}</b> },
            { key: 'sale_count', label: 'Sales', kind: 'number' },
            { key: 'line_count', label: 'Lines', kind: 'number' },
            { key: 'discount_total', label: 'Discount given', kind: 'money' },
            { key: 'share', label: 'Share', screenOnly: true, render: (x: DiscountCashierSummary) => <ShareBar value={num(x.discount_total)} total={total} /> },
          ] as ReportColumn<unknown>[],
          totals: { sale_count: sumOf(r, (x) => x.sale_count), line_count: sumOf(r, (x) => x.line_count), discount_total: total },
          rowKey: (x: unknown) => (x as DiscountCashierSummary).user_id,
          cards: [
            { icon: <LocalOfferOutlinedIcon sx={{ fontSize: 18 }} />, label: 'Discounts given', value: money(total), caption: `By ${r.length} cashier${r.length === 1 ? '' : 's'}` },
            { icon: <WorkspacePremiumOutlinedIcon sx={{ fontSize: 18 }} />, label: 'Gave the most', value: top ? name(top) : '—', caption: top ? `${money(top.discount_total)} on ${top.sale_count} sales` : ' ' },
          ],
          empty: 'No discounts given in this period.',
        };
      }
      case 'sc-pwd': {
        const r = rows as DiscountDetail[];
        const holders = new Set(r.map((x) => x.discount_id_number).filter(Boolean)).size;
        return {
          columns: detail([
            { key: 'discount_holder_name', label: 'Customer', value: (x) => x.discount_holder_name ?? '' },
            { key: 'discount_id_number', label: 'ID no.', value: (x) => x.discount_id_number ?? '' },
            { key: 'discount_type', label: 'Type', value: (x) => discountTypeLabel(x.discount_type) ?? '' },
          ]) as ReportColumn<unknown>[],
          totals: lineTotals(r),
          rowKey: (x: unknown) => (x as DiscountDetail).sale_item_id,
          cards: [
            { icon: <ElderlyOutlinedIcon sx={{ fontSize: 18 }} />, label: 'SC / PWD discounts', value: money(sumOf(r, (x) => x.discount)), caption: `${r.length} lines` },
            { icon: <PeopleAltOutlinedIcon sx={{ fontSize: 18 }} />, label: 'Card holders', value: holders.toLocaleString(), caption: 'Different ID numbers' },
            { icon: <ReceiptOutlinedIcon sx={{ fontSize: 18 }} />, label: 'Invoices', value: new Set(r.map((x) => x.invoice_number)).size.toLocaleString(), caption: 'With an SC / PWD line' },
          ],
          note: capNote,
          empty: 'No Senior Citizen or PWD discounts in this period.',
        };
      }
      case 'manual': {
        const r = rows as DiscountDetail[];
        return {
          columns: detail([{ key: 'cashier_name', label: 'Cashier', value: (x) => x.cashier_name ?? '' }]) as ReportColumn<unknown>[],
          totals: lineTotals(r),
          rowKey: (x: unknown) => (x as DiscountDetail).sale_item_id,
          cards: [
            { icon: <EditNoteOutlinedIcon sx={{ fontSize: 18 }} />, label: 'Manual discounts', value: money(sumOf(r, (x) => x.discount)), caption: `${r.length} lines` },
            { icon: <PeopleAltOutlinedIcon sx={{ fontSize: 18 }} />, label: 'Cashiers', value: new Set(r.map((x) => x.cashier_name)).size.toLocaleString(), caption: 'Gave a manual discount' },
            { icon: <FormatListNumberedOutlinedIcon sx={{ fontSize: 18 }} />, label: 'Average', value: r.length ? money(sumOf(r, (x) => x.discount) / r.length) : '—', caption: 'Per discounted line' },
          ],
          note: capNote ?? 'Who approved each one is in Reports → Audit Trail.',
          empty: 'No manual discounts in this period.',
        };
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportType, rows, currency]);

  async function onExport(format: 'xlsx' | 'csv' | 'pdf') {
    try {
      await exportReport(format, {
        title: info.title,
        subtitle: storeName ?? 'All branches',
        range,
        stats: view.cards.map((c) => ({ label: c.label, value: c.value })),
        columns: view.columns,
        rows,
        totals: view.totals as Record<string, number>,
        printedBy: user?.name ?? null,
        currency,
      });
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Could not prepare the export', 'error');
    }
  }

  return (
    <div>
      <ReportPicker groups={GROUPS} value={reportType} onChange={changeReport} />
      <ReportHeader title={info.title} description={info.description} stores={stores} storeId={storeId} onStoreChange={setStoreId} />

      <Stack direction={{ xs: 'column', md: 'row' }} sx={{ justifyContent: 'space-between', alignItems: { md: 'flex-start' }, gap: 1.5 }}>
        <DateRangeBar range={range} onChange={setRange} />
        <Box sx={{ flexShrink: 0, mb: 2 }}>
          <ExportButton onExport={onExport} disabled={loading || rows.length === 0} />
        </Box>
      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: `repeat(${view.cards.length}, 1fr)` }, gap: 1.5, mb: 2.5 }}>
        {view.cards.map((c) => (
          <MetricCard key={c.label} icon={c.icon} label={c.label} value={loading ? '–' : c.value} caption={loading ? undefined : c.caption} />
        ))}
      </Box>

      {'note' in view && view.note && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {view.note}
        </Alert>
      )}

      <ReportTable<unknown>
        columns={view.columns}
        rows={rows}
        rowKey={view.rowKey as (row: unknown, i: number) => string | number}
        loading={loading}
        totals={view.totals as Record<string, number>}
        emptyLabel={view.empty}
      />
    </div>
  );
}
