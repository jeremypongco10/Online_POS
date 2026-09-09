import { useEffect, useMemo, useState, type ReactNode } from 'react';
import CircularProgress from '@mui/material/CircularProgress';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PaidRoundedIcon from '@mui/icons-material/PaidRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import ShoppingBagRoundedIcon from '@mui/icons-material/ShoppingBagRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import BarChartRoundedIcon from '@mui/icons-material/BarChartRounded';
import AddShoppingCartRoundedIcon from '@mui/icons-material/AddShoppingCartRounded';
import AddBoxRoundedIcon from '@mui/icons-material/AddBoxRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import { useAuth } from '../auth/AuthContext';
import { api } from '../api/client';
import { SearchableSelect } from '../admin/SearchableSelect';
import type { DashboardData, PaymentMethodOption, Store } from '../api/types';
import { formatMoney } from '../pos/format';
import { currencySymbol, formatDate } from '../regional';
import { METHOD_LABELS } from '../pos/PaymentPanel';
import type { AdminSection } from '../admin/AdminLayout';
import { canAccessPos } from '../auth/posAccess';
import './dashboard.css';

const ACCENTS = ['#3978f6', '#27b98b', '#8957e5', '#f7a928', '#ef6176'];
const money = (value: number, symbol: string) => `${symbol} ${formatMoney(value)}`;

function MetricCard({ title, value, note, tone, icon, points }: { title: string; value: string; note: string; tone: string; icon: ReactNode; points: string }) {
  return <article className="dash-metric">
    <div className="dash-metric-icon" style={{ '--metric-tone': tone } as React.CSSProperties}>{icon}</div>
    <div className="dash-metric-copy"><span>{title}</span><strong>{value}</strong><small>{note}</small></div>
    <svg className="dash-spark" viewBox="0 0 72 35" aria-hidden="true"><polyline points={points} fill="none" stroke={tone} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />{points.split(' ').map((point, index) => { const [cx, cy] = point.split(','); return <circle key={index} cx={cx} cy={cy} r="1.6" fill="#fff" stroke={tone} strokeWidth="1.2" />; })}</svg>
  </article>;
}

function Panel({ title, hint, action, children, className = '' }: { title: string; hint?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={`dash-panel ${className}`}><header className="dash-panel-heading"><div><h2>{title}</h2>{hint && <p>{hint}</p>}</div>{action}</header>{children}</section>;
}

const EmptyRow = ({ label, columns }: { label: string; columns: number }) => <tr><td className="dash-empty" colSpan={columns}>{label}</td></tr>;

interface Props { onNavigate?: (section: AdminSection) => void; onBackToPos?: () => void; }

export function DashboardBody({ onNavigate, onBackToPos }: Props) {
  const { user, hasPermission } = useAuth();
  const canView = hasPermission('dashboard.view');
  const [stores, setStores] = useState<Store[]>([]);
  const [storeId, setStoreId] = useState<number | ''>('');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodOption[]>([]);

  useEffect(() => {
    if (!user || !canView) return;
    api.get<Store[]>(`/stores?company_id=${user.company_id}&is_active=1&per_page=50`).then(setStores);
    api.get<PaymentMethodOption[]>('/payment-methods?per_page=50').then(setPaymentMethods).catch(() => {});
  }, [user, canView]);

  useEffect(() => {
    if (!user || !canView) return;
    setLoading(true);
    const query = storeId === '' ? `company_id=${user.company_id}` : `company_id=${user.company_id}&store_id=${storeId}`;
    api.get<DashboardData>(`/reports/dashboard?${query}`).then(setData).finally(() => setLoading(false));
  }, [user, storeId, canView]);

  const productUnits = useMemo(() => data?.top_products.reduce((sum, item) => sum + Number(item.total_quantity), 0) ?? 0, [data]);
  const totalPayments = useMemo(() => data?.payment_breakdown.reduce((sum, row) => sum + Number(row.total_amount), 0) ?? 0, [data]);
  const paymentGradient = useMemo(() => {
    if (!data || totalPayments <= 0) return '#e9eef7 0deg 360deg';
    let angle = 0;
    return data.payment_breakdown.map((row, i) => { const start = angle; angle += (Number(row.total_amount) / totalPayments) * 360; return `${ACCENTS[i % ACCENTS.length]} ${start}deg ${angle}deg`; }).join(', ');
  }, [data, totalPayments]);

  if (!user) return null;
  if (!canView) return <div className="dash-no-access"><LockOutlinedIcon /><p>You don&apos;t have access to the dashboard.</p></div>;

  const symbol = currencySymbol(user.currency);
  const displayName = user.name.split(/\s+/)[0] || user.name;
  const methodLabel = (code: string) => paymentMethods.find((method) => method.code === code)?.name ?? METHOD_LABELS[code] ?? code;
  const maxRevenue = Math.max(...(data?.top_products.map((item) => Number(item.total_revenue)) ?? []), 1);
  const chartPoints = data?.top_products.map((item, index, rows) => { const x = rows.length === 1 ? 50 : (index / (rows.length - 1)) * 100; const y = 74 - (Number(item.total_revenue) / maxRevenue) * 58; return `${x},${y}`; }).join(' ') ?? '';

  return <div className="backoffice-dashboard">
    <div className="dash-welcome">
      <div><h1>Good morning, {displayName}! <span aria-hidden="true">👋</span></h1><p>Here&apos;s what&apos;s happening with your store today.</p></div>
      <div className="dash-filters"><div className="dash-date">{formatDate(data?.date ?? new Date(), user.currency)}</div><SearchableSelect value={storeId === '' ? '' : String(storeId)} onChange={(value) => setStoreId(value === '' ? '' : Number(value))} sx={{ minWidth: 165 }} options={[{ value: '', label: 'All Stores' }, ...stores.map((store) => ({ value: String(store.id), label: store.name }))]} /></div>
    </div>

    {loading || !data ? <div className="dash-loading"><CircularProgress size={30} /></div> : <>
      <div className="dash-metrics-grid">
        <MetricCard title="Total Sales" value={money(data.today_sales, symbol)} note="Today" tone="#20b987" icon={<PaidRoundedIcon />} points="2,29 14,22 25,25 37,14 49,18 61,7 70,12" />
        <MetricCard title="Total Transactions" value={String(data.today_transactions)} note={`${money(data.average_transaction, symbol)} average`} tone="#3978f6" icon={<ReceiptLongRoundedIcon />} points="2,28 13,13 24,21 36,12 47,16 59,5 70,10" />
        <MetricCard title="Products Sold" value={formatMoney(productUnits).replace('.00', '')} note="Across top products" tone="#8957e5" icon={<ShoppingBagRoundedIcon />} points="2,27 13,20 25,22 37,12 48,17 60,9 70,4" />
        <MetricCard title="Low Stock Items" value={String(data.low_stock.length)} note={data.low_stock.length ? 'Needs attention' : 'Stock levels look good'} tone="#f7a928" icon={<WarningAmberRoundedIcon />} points="2,29 14,24 25,16 36,20 48,11 60,13 70,5" />
      </div>

      <div className="dash-layout"><main className="dash-main-column">
        <div className="dash-charts-grid">
          <Panel title="Sales Overview" hint="Revenue across today’s top products">
            {data.top_products.length ? <div className="dash-line-chart"><div className="dash-y-labels"><span>{money(maxRevenue, symbol)}</span><span>{money(maxRevenue / 2, symbol)}</span><span>{money(0, symbol)}</span></div><div className="dash-chart-plot"><svg preserveAspectRatio="none" viewBox="0 0 100 80" aria-label="Revenue chart"><defs><linearGradient id="salesArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3978f6" stopOpacity=".22" /><stop offset="1" stopColor="#3978f6" stopOpacity="0" /></linearGradient></defs><polygon points={`0,80 ${chartPoints} 100,80`} fill="url(#salesArea)" /><polyline points={chartPoints} fill="none" stroke="#3978f6" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />{chartPoints.split(' ').filter(Boolean).map((point, index) => { const [cx, cy] = point.split(','); return <circle key={index} cx={cx} cy={cy} r="1.5" fill="#fff" stroke="#3978f6" strokeWidth="1" />; })}</svg><div className="dash-x-labels">{data.top_products.map((item) => <span key={item.product_id}>{item.product_name ?? `#${item.product_id}`}</span>)}</div></div></div> : <div className="dash-empty-block">No sales yet today.</div>}
          </Panel>
          <Panel title="Sales by Payment Method" hint="Today">
            {data.payment_breakdown.length ? <div className="payment-breakdown"><div className="payment-donut" style={{ background: `conic-gradient(${paymentGradient})` }}><div><strong>{money(data.today_sales, symbol)}</strong><span>Total sales</span></div></div><div className="payment-legend">{data.payment_breakdown.map((row, index) => <div key={row.method}><i style={{ background: ACCENTS[index % ACCENTS.length] }} /><span>{methodLabel(row.method)}</span><strong>{money(Number(row.total_amount), symbol)}</strong><em>{totalPayments ? `${((Number(row.total_amount) / totalPayments) * 100).toFixed(1)}%` : '0%'}</em></div>)}</div></div> : <div className="dash-empty-block">No payments yet today.</div>}
          </Panel>
        </div>

        <div className="dash-tables-grid">
          <Panel title="Top Selling Products" hint="Today" action={<button className="dash-link" onClick={() => onNavigate?.('products')}>View all <ArrowForwardRoundedIcon /></button>}><div className="dash-table-wrap"><table className="dash-data-table"><thead><tr><th>#</th><th>Product</th><th>Qty Sold</th><th>Total Sales</th></tr></thead><tbody>{data.top_products.length === 0 ? <EmptyRow label="No sales yet today." columns={4} /> : data.top_products.slice(0, 5).map((item, index) => <tr key={item.product_id}><td>{index + 1}</td><td><span className="product-dot" style={{ background: ACCENTS[index % ACCENTS.length] }}><Inventory2RoundedIcon /></span><strong>{item.product_name ?? `Product #${item.product_id}`}</strong></td><td>{Number(item.total_quantity).toLocaleString()}</td><td>{money(Number(item.total_revenue), symbol)}</td></tr>)}</tbody></table></div></Panel>
          <Panel title="Sales by Store" hint="Today" action={<button className="dash-link" onClick={() => onNavigate?.('reports')}>View reports <ArrowForwardRoundedIcon /></button>}><div className="dash-table-wrap"><table className="dash-data-table"><thead><tr><th>Store</th><th>Transactions</th><th>Total Sales</th></tr></thead><tbody>{data.sales_by_store.length === 0 ? <EmptyRow label="No store sales yet today." columns={3} /> : data.sales_by_store.slice(0, 5).map((row) => <tr key={row.store_id}><td><span className="store-icon"><StorefrontRoundedIcon /></span><strong>{row.store_name ?? `Store #${row.store_id}`}</strong></td><td>{Number(row.transaction_count).toLocaleString()}</td><td>{money(Number(row.total_sales), symbol)}</td></tr>)}</tbody></table></div></Panel>
        </div>
      </main>

      <aside className="dash-side-column">
        <Panel title="Stock Alerts" hint={`${data.low_stock.length} item${data.low_stock.length === 1 ? '' : 's'} need attention`} action={<button className="dash-link" onClick={() => onNavigate?.('inventory')}>View all</button>}><div className="stock-alerts">{data.low_stock.length === 0 ? <div className="dash-empty-block">All stock levels look good.</div> : data.low_stock.slice(0, 5).map((row) => <button key={row.id} onClick={() => onNavigate?.('inventory')}><span><WarningAmberRoundedIcon /></span><div><strong>{row.product_name}</strong><small>{row.sku} · Reorder at {Number(row.reorder_level)}</small></div><em>{Number(row.quantity)} left</em></button>)}</div></Panel>
        <Panel title="Quick Actions"><div className="quick-actions">{onBackToPos && canAccessPos(user) && <button className="qa-blue" onClick={onBackToPos}><AddShoppingCartRoundedIcon /><span>New Sale</span></button>}<button className="qa-purple" onClick={() => onNavigate?.('products')}><AddBoxRoundedIcon /><span>Add Product</span></button><button className="qa-green" onClick={() => onNavigate?.('reports')}><BarChartRoundedIcon /><span>View Reports</span></button><button className="qa-orange" onClick={() => onNavigate?.('inventory')}><Inventory2RoundedIcon /><span>Manage Stock</span></button></div></Panel>
      </aside></div>
    </>}
  </div>;
}
