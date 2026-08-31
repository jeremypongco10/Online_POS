import { useEffect, useState, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import CircularProgress from '@mui/material/CircularProgress';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PaidOutlinedIcon from '@mui/icons-material/PaidOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined';
import { useAuth } from '../auth/AuthContext';
import { api } from '../api/client';
import { SearchableSelect } from '../admin/SearchableSelect';
import type { DashboardData, PaymentMethodOption, Store } from '../api/types';
import { formatMoney } from '../pos/format';
import { METHOD_LABELS } from '../pos/PaymentPanel';

function StatTile({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
  color: 'primary' | 'success' | 'info';
}) {
  return (
    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 1.5 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: `color-mix(in srgb, var(--mui-palette-${color}-main) 14%, transparent)`,
            color: `${color}.main`,
          }}
        >
          {icon}
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {label}
        </Typography>
      </Stack>
      <Typography variant="h4" sx={{ fontWeight: 700 }}>
        {value}
      </Typography>
    </Paper>
  );
}

function DashPanel({
  title,
  columns,
  rows,
  emptyLabel,
}: {
  title: string;
  columns: string[];
  rows: { key: string | number; cells: ReactNode[] }[];
  emptyLabel: string;
}) {
  return (
    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 1.5 }}>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5, fontSize: 16 }}>
        {title}
      </Typography>
      {rows.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {emptyLabel}
        </Typography>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              {columns.map((c, i) => (
                <TableCell key={c} align={i === 0 ? 'left' : 'right'}>
                  {c}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.key}>
                {row.cells.map((cell, i) => (
                  <TableCell key={i} align={i === 0 ? 'left' : 'right'}>
                    {cell}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Paper>
  );
}

/** Phase 21: Today's Sales, Today's Transactions, Average Transaction, Top Products, Low Stock, Payment Breakdown, Sales by Store. */
export function DashboardBody() {
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
    // Not filtered to is_active — a deactivated method can still show up
    // in today's payment breakdown for a payment taken before it was
    // turned off, and that row should still get its real name, not just
    // its raw code.
    api
      .get<PaymentMethodOption[]>('/payment-methods?per_page=50')
      .then(setPaymentMethods)
      .catch(() => {});
  }, [user, canView]);

  function methodLabel(code: string): string {
    return paymentMethods.find((m) => m.code === code)?.name ?? METHOD_LABELS[code] ?? code;
  }

  useEffect(() => {
    if (!user || !canView) return;
    setLoading(true);
    const query = storeId === '' ? `company_id=${user.company_id}` : `company_id=${user.company_id}&store_id=${storeId}`;
    api
      .get<DashboardData>(`/reports/dashboard?${query}`)
      .then(setData)
      .finally(() => setLoading(false));
  }, [user, storeId, canView]);

  if (!user) return null;

  // Reachable even without a "Dashboard" nav entry — it's the section
  // the Back Office lands on by default for every non-cashier role,
  // regardless of whether they actually hold dashboard.view.
  if (!canView) {
    return (
      <Stack sx={{ alignItems: 'center', justifyContent: 'center', py: 10, gap: 1.5 }}>
        <LockOutlinedIcon sx={{ fontSize: 40, color: 'text.disabled' }} />
        <Typography variant="body1" color="text.secondary">
          You don&apos;t have access to the dashboard.
        </Typography>
      </Stack>
    );
  }

  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline', mb: 2.25 }}>
        <Typography variant="h5">Dashboard</Typography>
        <SearchableSelect
          value={storeId === '' ? '' : String(storeId)}
          onChange={(v) => setStoreId(v === '' ? '' : Number(v))}
          sx={{ minWidth: 160 }}
          options={[{ value: '', label: 'All Stores' }, ...stores.map((s) => ({ value: String(s.id), label: s.name }))]}
        />
      </Stack>

      {loading || !data ? (
        <Stack sx={{ alignItems: 'center', justifyContent: 'center', py: 10 }}>
          <CircularProgress />
        </Stack>
      ) : (
        <Box sx={{ p: 3 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {data.date}
          </Typography>

          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <StatTile
                label="Today's Sales"
                value={formatMoney(data.today_sales)}
                icon={<PaidOutlinedIcon fontSize="small" />}
                color="primary"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <StatTile
                label="Today's Transactions"
                value={data.today_transactions}
                icon={<ReceiptLongOutlinedIcon fontSize="small" />}
                color="success"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <StatTile
                label="Average Transaction"
                value={formatMoney(data.average_transaction)}
                icon={<TrendingUpOutlinedIcon fontSize="small" />}
                color="info"
              />
            </Grid>
          </Grid>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <DashPanel
                title="Top Products"
                columns={['Product', 'Qty', 'Revenue']}
                emptyLabel="No sales yet today."
                rows={data.top_products.map((p) => ({
                  key: p.product_id,
                  cells: [p.product_name ?? `#${p.product_id}`, parseFloat(p.total_quantity), formatMoney(parseFloat(p.total_revenue))],
                }))}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <DashPanel
                title="Low Stock"
                columns={['Product', 'Qty', 'Reorder At']}
                emptyLabel="Nothing below reorder level."
                rows={data.low_stock.map((row) => ({
                  key: row.id,
                  cells: [
                    row.product_name,
                    <Typography key="qty" component="span" color="error.main" sx={{ fontWeight: 600 }}>
                      {parseFloat(row.quantity)}
                    </Typography>,
                    parseFloat(row.reorder_level),
                  ],
                }))}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <DashPanel
                title="Payment Breakdown"
                columns={['Method', 'Count', 'Amount']}
                emptyLabel="No payments yet today."
                rows={data.payment_breakdown.map((row) => ({
                  key: row.method,
                  cells: [
                    methodLabel(row.method),
                    row.payment_count,
                    formatMoney(parseFloat(row.total_amount)),
                  ],
                }))}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <DashPanel
                title="Sales by Store"
                columns={['Store', 'Transactions', 'Sales']}
                emptyLabel="No sales yet today."
                rows={data.sales_by_store.map((row) => ({
                  key: row.store_id,
                  cells: [row.store_name ?? `#${row.store_id}`, row.transaction_count, formatMoney(parseFloat(row.total_sales))],
                }))}
              />
            </Grid>
          </Grid>
        </Box>
      )}
    </Box>
  );
}
