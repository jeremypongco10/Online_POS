import { useEffect, useMemo, useState } from 'react';
import { api, ApiError } from '../../api/client';
import type {
  BaggerSales,
  CashierSales,
  CategorySales,
  DailySales,
  MonthlySales,
  PaymentMethodOption,
  PaymentMethodSales,
  ProductSales,
  SalesAggregate,
  SalesBookRow,
  Store,
  StoreSales,
  VatSummary,
} from '../../api/types';
import { useAuth } from '../../auth/AuthContext';
import { useSnackbar } from '../../Snackbar';
import { formatMoney } from '../../pos/format';
import { currencySymbol, formatDate } from '../../regional';
import { MetricCard } from '../SummaryCards';
import { ReportTable } from './ReportTable';
import { DateRangeBar, ExportButton, ReportHeader, ReportPicker, ShareBar, type ReportOption } from './ReportKit';
import { defaultRange, exportReport, num, qtyText, sumOf, type DateRange, type ReportColumn } from './reportUtils';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined';
import CalendarViewDayOutlinedIcon from '@mui/icons-material/CalendarViewDayOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import LocalMallOutlinedIcon from '@mui/icons-material/LocalMallOutlined';
import EmojiEventsOutlinedIcon from '@mui/icons-material/EmojiEventsOutlined';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import PointOfSaleOutlinedIcon from '@mui/icons-material/PointOfSaleOutlined';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import LocalOfferOutlinedIcon from '@mui/icons-material/LocalOfferOutlined';
import AccountBalanceOutlinedIcon from '@mui/icons-material/AccountBalanceOutlined';
import WorkspacePremiumOutlinedIcon from '@mui/icons-material/WorkspacePremiumOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';

type ReportType = 'summary' | 'daily' | 'monthly' | 'store' | 'cashier' | 'bagger' | 'products' | 'categories' | 'payment-methods' | 'vat' | 'sales-book';

const ic = (Icon: typeof InsightsOutlinedIcon) => <Icon />;

const GROUPS: { label: string; options: ReportOption<ReportType>[] }[] = [
  {
    label: 'Overview',
    options: [
      { value: 'summary', label: 'Summary', icon: ic(InsightsOutlinedIcon) },
      { value: 'daily', label: 'Daily trend', icon: ic(CalendarViewDayOutlinedIcon) },
      { value: 'monthly', label: 'Monthly trend', icon: ic(CalendarMonthOutlinedIcon) },
    ],
  },
  {
    label: 'Breakdown',
    options: [
      { value: 'store', label: 'By branch', icon: ic(StorefrontOutlinedIcon) },
      { value: 'cashier', label: 'By cashier', icon: ic(BadgeOutlinedIcon) },
      { value: 'bagger', label: 'By bagger', icon: ic(LocalMallOutlinedIcon) },
      { value: 'products', label: 'Top products', icon: ic(EmojiEventsOutlinedIcon) },
      { value: 'categories', label: 'By category', icon: ic(CategoryOutlinedIcon) },
      { value: 'payment-methods', label: 'Payment methods', icon: ic(PaymentsOutlinedIcon) },
    ],
  },
  {
    label: 'BIR & tax',
    options: [
      { value: 'vat', label: 'VAT summary', icon: ic(ReceiptLongOutlinedIcon) },
      { value: 'sales-book', label: 'Sales Book (BIR)', icon: ic(MenuBookOutlinedIcon) },
    ],
  },
];

const INFO: Record<ReportType, { title: string; description: string }> = {
  summary: { title: 'Sales summary', description: 'What came in for the period: sales, discounts, tax and the day-by-day picture.' },
  daily: { title: 'Daily trend', description: 'Sales for each day, to spot your busy and quiet days.' },
  monthly: { title: 'Monthly trend', description: 'Sales month by month, to see how the business is growing.' },
  store: { title: 'Sales by branch', description: 'How every branch compares, side by side.' },
  cashier: { title: 'Sales by cashier', description: 'Who rang up what — sales count and value per cashier.' },
  bagger: { title: 'Sales by bagger', description: 'Sales each bagger helped with.' },
  products: { title: 'Top products', description: 'Your best sellers by quantity, with the revenue each brings in.' },
  categories: { title: 'Sales by category', description: 'Which kinds of products earn the most.' },
  'payment-methods': { title: 'Payment methods', description: 'How customers paid — cash, GCash, cards and the rest.' },
  vat: { title: 'VAT summary', description: 'VATable, VAT-exempt, zero-rated and non-VAT sales, for your tax return.' },
  'sales-book': { title: 'Sales Book (BIR)', description: 'Every invoice with its VAT breakdown — the sales journal BIR asks for.' },
};

const ENDPOINT: Record<ReportType, string> = {
  summary: '/reports/sales-summary',
  daily: '/reports/daily-sales',
  monthly: '/reports/monthly-sales',
  store: '/reports/store-sales',
  cashier: '/reports/cashier-sales',
  bagger: '/reports/bagger-performance',
  products: '/reports/product-sales',
  categories: '/reports/category-sales',
  'payment-methods': '/reports/payment-methods',
  vat: '/reports/vat-summary',
  'sales-book': '/reports/sales-book',
};

/** The five figures every sales aggregate carries, as report columns. */
function aggregateColumns<T extends SalesAggregate>(): ReportColumn<T>[] {
  return [
    { key: 'sale_count', label: 'Sales', kind: 'number' },
    { key: 'subtotal', label: 'Subtotal', kind: 'money' },
    { key: 'discount_total', label: 'Discount', kind: 'money' },
    { key: 'tax_total', label: 'Tax', kind: 'money' },
    { key: 'total', label: 'Net sales', kind: 'money', render: (r) => <b>{formatMoney(num(r.total))}</b> },
  ];
}

function aggregateTotals<T extends SalesAggregate>(rows: T[]) {
  return {
    sale_count: sumOf(rows, (r) => r.sale_count),
    subtotal: sumOf(rows, (r) => r.subtotal),
    discount_total: sumOf(rows, (r) => r.discount_total),
    tax_total: sumOf(rows, (r) => r.tax_total),
    total: sumOf(rows, (r) => r.total),
  };
}

/** Every sales report, from the period overview down to the BIR sales book. */
export function SalesReportsScreen() {
  const { user } = useAuth();
  const notify = useSnackbar();
  const currency = user?.currency;
  const symbol = currencySymbol(currency);
  const money = (v: unknown) => `${symbol}${formatMoney(num(v))}`;

  const [stores, setStores] = useState<Store[]>([]);
  const [methods, setMethods] = useState<PaymentMethodOption[]>([]);
  const [storeId, setStoreId] = useState('');
  const [range, setRange] = useState<DateRange>(defaultRange);
  const [reportType, setReportType] = useState<ReportType>('summary');
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<unknown[]>([]);
  const [summary, setSummary] = useState<SalesAggregate | null>(null);
  const [vat, setVat] = useState<VatSummary | null>(null);

  useEffect(() => {
    api.get<Store[]>('/stores?per_page=100').then(setStores).catch(() => setStores([]));
    api.get<PaymentMethodOption[]>('/payment-methods?per_page=50').then(setMethods).catch(() => setMethods([]));
  }, []);

  useEffect(() => {
    const query = new URLSearchParams();
    if (storeId && reportType !== 'store') query.set('store_id', storeId);
    if (range.from) query.set('from', range.from);
    if (range.to) query.set('to', range.to);
    const qs = query.toString();

    let cancelled = false;
    setLoading(true);
    setSummary(null);
    setVat(null);
    setRows([]);

    const done = () => !cancelled && setLoading(false);
    if (reportType === 'summary') {
      // The overview also shows the period day by day.
      Promise.all([api.get<SalesAggregate>(`${ENDPOINT.summary}?${qs}`), api.get<DailySales[]>(`${ENDPOINT.daily}?${qs}`)])
        .then(([s, daily]) => {
          if (cancelled) return;
          setSummary(s);
          setRows(daily);
        })
        .catch(() => undefined)
        .finally(done);
    } else if (reportType === 'vat') {
      api
        .get<VatSummary>(`${ENDPOINT.vat}?${qs}`)
        .then((v) => !cancelled && setVat(v))
        .catch(() => undefined)
        .finally(done);
    } else {
      api
        .get<unknown[]>(`${ENDPOINT[reportType]}?${qs}`)
        .then((r) => !cancelled && setRows(r))
        .catch(() => undefined)
        .finally(done);
    }
    return () => {
      cancelled = true;
    };
  }, [storeId, range, reportType]);

  function changeReport(next: ReportType) {
    // Cleared in the same update, so new columns never render against the old report's rows.
    setRows([]);
    setSummary(null);
    setVat(null);
    setReportType(next);
  }

  const methodName = (code: string) =>
    methods.find((m) => m.code.toLowerCase() === code.toLowerCase())?.name ?? (code === 'cash' ? 'Cash' : code === 'exchange' ? 'Exchange credit' : code.toUpperCase());
  const storeName = stores.find((s) => String(s.id) === storeId)?.name;
  const subtitle = reportType === 'store' ? 'All branches' : (storeName ?? 'All branches');
  const info = INFO[reportType];

  // ── Per-report columns, totals and cards ───────────────────────
  const view = useMemo(() => {
    const share = <T,>(pick: (r: T) => unknown, all: T[]): ReportColumn<T> => {
      const total = sumOf(all, pick);
      return { key: 'share', label: 'Share', screenOnly: true, render: (r) => <ShareBar value={num(pick(r))} total={total} /> };
    };
    const avg = (total: number, count: number) => (count > 0 ? money(total / count) : '—');

    switch (reportType) {
      case 'summary': {
        const r = rows as DailySales[];
        return {
          columns: [{ key: 'date', label: 'Date', value: (d: DailySales) => formatDate(d.date, currency) }, ...aggregateColumns<DailySales>(), share<DailySales>((d) => d.total, r)] as ReportColumn<unknown>[],
          totals: aggregateTotals(r),
          rowKey: (d: unknown) => (d as DailySales).date,
          cards: summary
            ? [
                { icon: <PointOfSaleOutlinedIcon sx={{ fontSize: 18 }} />, label: 'Net sales', value: money(summary.total), caption: `${summary.sale_count.toLocaleString()} sales` },
                { icon: <ShoppingCartOutlinedIcon sx={{ fontSize: 18 }} />, label: 'Average sale', value: avg(num(summary.total), Number(summary.sale_count)), caption: 'Per transaction' },
                { icon: <LocalOfferOutlinedIcon sx={{ fontSize: 18 }} />, label: 'Discounts', value: money(summary.discount_total), caption: `Off ${money(summary.subtotal)} before discounts` },
                { icon: <AccountBalanceOutlinedIcon sx={{ fontSize: 18 }} />, label: 'Tax', value: money(summary.tax_total), caption: 'Collected in the period' },
              ]
            : null,
          empty: 'No sales in this period.',
        };
      }
      case 'daily':
      case 'monthly': {
        const isDaily = reportType === 'daily';
        const r = rows as (DailySales & MonthlySales)[];
        const best = [...r].sort((a, b) => num(b.total) - num(a.total))[0];
        const total = sumOf(r, (x) => x.total);
        const label = (x: DailySales & MonthlySales) => (isDaily ? formatDate(x.date, currency) : x.month);
        return {
          columns: [
            { key: isDaily ? 'date' : 'month', label: isDaily ? 'Date' : 'Month', value: label },
            ...aggregateColumns<DailySales & MonthlySales>(),
            share<DailySales & MonthlySales>((x) => x.total, r),
          ] as ReportColumn<unknown>[],
          totals: aggregateTotals(r),
          rowKey: (x: unknown) => (isDaily ? (x as DailySales).date : (x as MonthlySales).month),
          cards: [
            { icon: <PointOfSaleOutlinedIcon sx={{ fontSize: 18 }} />, label: 'Net sales', value: money(total), caption: `${sumOf(r, (x) => x.sale_count).toLocaleString()} sales` },
            { icon: <CalendarViewDayOutlinedIcon sx={{ fontSize: 18 }} />, label: isDaily ? 'Average per day' : 'Average per month', value: avg(total, r.length), caption: `${r.length} ${isDaily ? 'days' : 'months'} with sales` },
            { icon: <WorkspacePremiumOutlinedIcon sx={{ fontSize: 18 }} />, label: isDaily ? 'Best day' : 'Best month', value: best ? money(best.total) : '—', caption: best ? label(best) : ' ' },
          ],
          empty: 'No sales in this period.',
        };
      }
      case 'store':
      case 'cashier':
      case 'bagger': {
        const r = rows as (StoreSales & CashierSales & BaggerSales)[];
        const nameOf = (x: StoreSales & CashierSales & BaggerSales) =>
          reportType === 'store' ? (x.store_name ?? `#${x.store_id}`) : reportType === 'cashier' ? (x.cashier_name ?? `#${x.user_id}`) : (x.bagger_name ?? `#${x.bagger_id}`);
        const top = [...r].sort((a, b) => num(b.total) - num(a.total))[0];
        const total = sumOf(r, (x) => x.total);
        const count = sumOf(r, (x) => x.sale_count);
        const who = reportType === 'store' ? 'Branch' : reportType === 'cashier' ? 'Cashier' : 'Bagger';
        return {
          columns: [
            { key: 'name', label: who, value: nameOf, render: (x: StoreSales & CashierSales & BaggerSales) => <b>{nameOf(x)}</b> },
            ...aggregateColumns<StoreSales & CashierSales & BaggerSales>(),
            share<StoreSales & CashierSales & BaggerSales>((x) => x.total, r),
          ] as ReportColumn<unknown>[],
          totals: aggregateTotals(r),
          rowKey: (_x: unknown, i: number) => i,
          cards: [
            { icon: <PointOfSaleOutlinedIcon sx={{ fontSize: 18 }} />, label: 'Net sales', value: money(total), caption: `${count.toLocaleString()} sales` },
            { icon: <ShoppingCartOutlinedIcon sx={{ fontSize: 18 }} />, label: 'Average sale', value: avg(total, count), caption: `Across ${r.length} ${who.toLowerCase()}${r.length === 1 ? '' : reportType === 'store' ? 'es' : 's'}` },
            { icon: <WorkspacePremiumOutlinedIcon sx={{ fontSize: 18 }} />, label: `Top ${who.toLowerCase()}`, value: top ? nameOf(top) : '—', caption: top ? money(top.total) : ' ' },
          ],
          empty: reportType === 'bagger' ? 'No sales with a bagger in this period.' : 'No sales in this period.',
        };
      }
      case 'products': {
        const r = rows as ProductSales[];
        const revenue = sumOf(r, (x) => x.total_revenue);
        return {
          columns: [
            { key: 'rank', label: '#', value: (x: ProductSales) => r.indexOf(x) + 1, render: (x: ProductSales) => <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700 }}>{r.indexOf(x) + 1}</Typography> },
            {
              key: 'product_name',
              label: 'Product',
              value: (x: ProductSales) => x.product_name ?? `#${x.product_id}`,
              render: (x: ProductSales) => (
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {x.product_name ?? `#${x.product_id}`}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {x.product_sku}
                  </Typography>
                </Box>
              ),
            },
            { key: 'order_count', label: 'Sales', kind: 'number' },
            { key: 'total_quantity', label: 'Qty sold', kind: 'number' },
            { key: 'total_revenue', label: 'Revenue', kind: 'money', render: (x: ProductSales) => <b>{formatMoney(num(x.total_revenue))}</b> },
            share<ProductSales>((x) => x.total_revenue, r),
          ] as ReportColumn<unknown>[],
          exportExtra: [{ key: 'product_sku', label: 'SKU', value: (x: unknown) => (x as ProductSales).product_sku }] as ReportColumn<unknown>[],
          totals: { total_quantity: sumOf(r, (x) => x.total_quantity), total_revenue: revenue },
          rowKey: (x: unknown) => (x as ProductSales).product_id,
          cards: [
            { icon: <PointOfSaleOutlinedIcon sx={{ fontSize: 18 }} />, label: 'Revenue', value: money(revenue), caption: `${r.length} products sold` },
            { icon: <Inventory2OutlinedIcon sx={{ fontSize: 18 }} />, label: 'Units sold', value: qtyText(sumOf(r, (x) => x.total_quantity)), caption: 'All products' },
            { icon: <WorkspacePremiumOutlinedIcon sx={{ fontSize: 18 }} />, label: 'Best seller', value: r[0]?.product_name ?? '—', caption: r[0] ? `${qtyText(r[0].total_quantity)} sold · ${money(r[0].total_revenue)}` : ' ' },
          ],
          empty: 'No products sold in this period.',
        };
      }
      case 'categories': {
        const r = rows as CategorySales[];
        const revenue = sumOf(r, (x) => x.total_revenue);
        const top = [...r].sort((a, b) => num(b.total_revenue) - num(a.total_revenue))[0];
        return {
          columns: [
            { key: 'category_name', label: 'Category', value: (x: CategorySales) => x.category_name ?? 'Uncategorized', render: (x: CategorySales) => <b>{x.category_name ?? 'Uncategorized'}</b> },
            { key: 'total_quantity', label: 'Qty sold', kind: 'number' },
            { key: 'total_revenue', label: 'Revenue', kind: 'money' },
            share<CategorySales>((x) => x.total_revenue, r),
          ] as ReportColumn<unknown>[],
          totals: { total_quantity: sumOf(r, (x) => x.total_quantity), total_revenue: revenue },
          rowKey: (x: unknown) => (x as CategorySales).category_id ?? 'none',
          cards: [
            { icon: <PointOfSaleOutlinedIcon sx={{ fontSize: 18 }} />, label: 'Revenue', value: money(revenue), caption: `${r.length} categories` },
            { icon: <Inventory2OutlinedIcon sx={{ fontSize: 18 }} />, label: 'Units sold', value: qtyText(sumOf(r, (x) => x.total_quantity)), caption: 'All categories' },
            { icon: <WorkspacePremiumOutlinedIcon sx={{ fontSize: 18 }} />, label: 'Top category', value: top ? (top.category_name ?? 'Uncategorized') : '—', caption: top ? money(top.total_revenue) : ' ' },
          ],
          empty: 'No sales in this period.',
        };
      }
      case 'payment-methods': {
        const r = rows as PaymentMethodSales[];
        const amount = sumOf(r, (x) => x.total_amount);
        const top = [...r].sort((a, b) => num(b.total_amount) - num(a.total_amount))[0];
        return {
          columns: [
            { key: 'method', label: 'Method', value: (x: PaymentMethodSales) => methodName(x.method), render: (x: PaymentMethodSales) => <b>{methodName(x.method)}</b> },
            { key: 'payment_count', label: 'Payments', kind: 'number' },
            { key: 'total_amount', label: 'Amount', kind: 'money' },
            share<PaymentMethodSales>((x) => x.total_amount, r),
          ] as ReportColumn<unknown>[],
          totals: { payment_count: sumOf(r, (x) => x.payment_count), total_amount: amount },
          rowKey: (x: unknown) => (x as PaymentMethodSales).method,
          cards: [
            { icon: <PaymentsOutlinedIcon sx={{ fontSize: 18 }} />, label: 'Collected', value: money(amount), caption: `${sumOf(r, (x) => x.payment_count).toLocaleString()} payments` },
            { icon: <WorkspacePremiumOutlinedIcon sx={{ fontSize: 18 }} />, label: 'Most used', value: top ? methodName(top.method) : '—', caption: top && amount > 0 ? `${((num(top.total_amount) / amount) * 100).toFixed(0)}% of the money` : ' ' },
          ],
          empty: 'No payments in this period.',
        };
      }
      case 'vat': {
        const lines = vat
          ? [
              { label: 'VATable sales', amount: vat.vatable_sales },
              { label: 'VAT amount', amount: vat.vat_amount },
              { label: 'VAT-exempt sales', amount: vat.vat_exempt_sales },
              { label: 'Zero-rated sales', amount: vat.zero_rated_sales },
              { label: 'Non-VAT sales', amount: vat.non_vat_sales },
            ]
          : [];
        return {
          columns: [
            { key: 'label', label: 'Line', render: (x: { label: string }) => <b>{x.label}</b> },
            { key: 'amount', label: 'Amount', kind: 'money' },
          ] as ReportColumn<unknown>[],
          tableRows: lines as unknown[],
          totals: vat ? { amount: vat.total_sales, label: 'Total sales' } : undefined,
          rowKey: (x: unknown) => (x as { label: string }).label,
          cards: vat
            ? [
                { icon: <ReceiptLongOutlinedIcon sx={{ fontSize: 18 }} />, label: 'VATable sales', value: money(vat.vatable_sales), caption: 'Before VAT' },
                { icon: <AccountBalanceOutlinedIcon sx={{ fontSize: 18 }} />, label: 'VAT amount', value: money(vat.vat_amount), caption: 'Output VAT' },
                { icon: <LocalOfferOutlinedIcon sx={{ fontSize: 18 }} />, label: 'VAT-exempt', value: money(vat.vat_exempt_sales), caption: 'Incl. SC/PWD sales' },
                { icon: <PointOfSaleOutlinedIcon sx={{ fontSize: 18 }} />, label: 'Total sales', value: money(vat.total_sales), caption: `Zero-rated ${money(vat.zero_rated_sales)} · Non-VAT ${money(vat.non_vat_sales)}` },
              ]
            : null,
          empty: 'No sales in this period.',
        };
      }
      case 'sales-book': {
        const r = rows as SalesBookRow[];
        return {
          columns: [
            { key: 'sale_date', label: 'Date', value: (x: SalesBookRow) => x.sale_date.slice(0, 16).replace('T', ' ') },
            { key: 'invoice_number', label: 'Invoice #', render: (x: SalesBookRow) => <b>{x.invoice_number}</b> },
            { key: 'customer_name', label: 'Customer', value: (x: SalesBookRow) => x.customer_name ?? '' },
            { key: 'customer_tin', label: 'TIN', value: (x: SalesBookRow) => x.customer_tin ?? '' },
            { key: 'customer_address', label: 'Address', value: (x: SalesBookRow) => x.customer_address ?? '' },
            { key: 'business_style', label: 'Business style', value: (x: SalesBookRow) => x.business_style ?? '' },
            { key: 'vatable_sales', label: 'VATable', kind: 'money' },
            { key: 'vat_amount', label: 'VAT', kind: 'money' },
            { key: 'vat_exempt_sales', label: 'VAT-exempt', kind: 'money' },
            { key: 'zero_rated_sales', label: 'Zero-rated', kind: 'money' },
            { key: 'non_vat_sales', label: 'Non-VAT', kind: 'money' },
            { key: 'discount_total', label: 'Discount', kind: 'money' },
            { key: 'total', label: 'Total', kind: 'money', render: (x: SalesBookRow) => <b>{formatMoney(num(x.total))}</b> },
          ] as ReportColumn<unknown>[],
          hideOnScreen: ['customer_address', 'business_style', 'non_vat_sales'],
          totals: {
            vatable_sales: sumOf(r, (x) => x.vatable_sales),
            vat_amount: sumOf(r, (x) => x.vat_amount),
            vat_exempt_sales: sumOf(r, (x) => x.vat_exempt_sales),
            zero_rated_sales: sumOf(r, (x) => x.zero_rated_sales),
            non_vat_sales: sumOf(r, (x) => x.non_vat_sales),
            discount_total: sumOf(r, (x) => x.discount_total),
            total: sumOf(r, (x) => x.total),
          },
          rowKey: (x: unknown) => (x as SalesBookRow).invoice_number,
          cards: [
            { icon: <MenuBookOutlinedIcon sx={{ fontSize: 18 }} />, label: 'Invoices', value: r.length.toLocaleString(), caption: r.length ? `${r[r.length - 1]?.invoice_number ?? ''} – ${r[0]?.invoice_number ?? ''}` : ' ' },
            { icon: <ReceiptLongOutlinedIcon sx={{ fontSize: 18 }} />, label: 'VATable', value: money(sumOf(r, (x) => x.vatable_sales)), caption: `VAT ${money(sumOf(r, (x) => x.vat_amount))}` },
            { icon: <LocalOfferOutlinedIcon sx={{ fontSize: 18 }} />, label: 'VAT-exempt', value: money(sumOf(r, (x) => x.vat_exempt_sales)), caption: `Zero-rated ${money(sumOf(r, (x) => x.zero_rated_sales))}` },
            { icon: <PointOfSaleOutlinedIcon sx={{ fontSize: 18 }} />, label: 'Total', value: money(sumOf(r, (x) => x.total)), caption: `After ${money(sumOf(r, (x) => x.discount_total))} discounts` },
          ],
          empty: 'No invoices in this period.',
        };
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportType, rows, summary, vat, methods, currency]);

  const tableRows = ('tableRows' in view && view.tableRows) || rows;
  const hidden = 'hideOnScreen' in view ? (view.hideOnScreen as string[]) : [];
  const screenColumns = view.columns.filter((c) => !hidden.includes(c.key));

  async function onExport(format: 'xlsx' | 'csv' | 'pdf') {
    try {
      const extra = 'exportExtra' in view ? (view.exportExtra as ReportColumn<unknown>[]) : [];
      const columns = [...view.columns.slice(0, 2), ...extra, ...view.columns.slice(2)].map((c) => (c.key === 'rank' ? { ...c, render: undefined } : c));
      await exportReport(format, {
        title: info.title,
        subtitle,
        range,
        stats: (view.cards ?? []).map((c) => ({ label: c.label, value: c.value })),
        columns: format === 'pdf' && reportType === 'sales-book' ? columns.filter((c) => !['customer_address', 'business_style'].includes(c.key)) : columns,
        rows: tableRows as unknown[],
        totals: view.totals as Record<string, string | number> | undefined,
        printedBy: user?.name ?? null,
        currency,
      });
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Could not prepare the export', 'error');
    }
  }

  return (
    <div>
      <ReportPicker
        // "By branch" compares branches — nothing to compare with only one.
        groups={stores.length > 1 ? GROUPS : GROUPS.map((g) => ({ ...g, options: g.options.filter((o) => o.value !== 'store') }))}
        value={reportType}
        onChange={changeReport}
      />

      <ReportHeader
        title={info.title}
        description={info.description}
        stores={stores}
        storeId={storeId}
        onStoreChange={setStoreId}
        hideStore={reportType === 'store'}
      />

      <Stack direction={{ xs: 'column', md: 'row' }} sx={{ justifyContent: 'space-between', alignItems: { md: 'flex-start' }, gap: 1.5 }}>
        <DateRangeBar range={range} onChange={setRange} />
        <Box sx={{ flexShrink: 0, mb: 2 }}>
          <ExportButton onExport={onExport} disabled={loading || (tableRows as unknown[]).length === 0} />
        </Box>
      </Stack>

      {view.cards && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: `repeat(${Math.min(view.cards.length, 4)}, 1fr)` }, gap: 1.5, mb: 2.5 }}>
          {view.cards.map((c) => (
            <MetricCard key={c.label} icon={c.icon} label={c.label} value={loading ? '–' : c.value} caption={loading ? undefined : c.caption} />
          ))}
        </Box>
      )}

      {reportType === 'summary' && (
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', mb: 1 }}>
          Day by day
        </Typography>
      )}

      <ReportTable<unknown>
        columns={screenColumns}
        rows={tableRows as unknown[]}
        rowKey={view.rowKey as (row: unknown, i: number) => string | number}
        loading={loading}
        totals={view.totals as Record<string, number | string> | undefined}
        emptyLabel={view.empty}
      />
    </div>
  );
}
