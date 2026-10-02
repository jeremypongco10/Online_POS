import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, ApiError } from '../api/client';
import type { PaymentMethodOption, ReturnsSummary, SalesReturn, Store } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { useSnackbar } from '../Snackbar';
import { currencySymbol, formatDateTime } from '../regional';
import { formatMoney } from '../pos/format';
import { useList } from './useList';
import { DataTable, type Column } from './DataTable';
import { ListToolbar } from './ListToolbar';
import { InlineSelectFilter } from './InlineSelectFilter';
import { MetricCard } from './SummaryCards';
import { ReturnStatusBadge } from './ReturnBadges';
import { ReturnDetailDrawer } from './ReturnDetailDrawer';
import { exportCsv, exportExcel, exportFileName, type ExportColumn } from './exportTable';
import { printReport } from './printReport';
import { useBarcodeScanner } from './useBarcodeScanner';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import ListSubheader from '@mui/material/ListSubheader';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import GridOnOutlinedIcon from '@mui/icons-material/GridOnOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import AssignmentReturnOutlinedIcon from '@mui/icons-material/AssignmentReturnOutlined';
import LocalAtmOutlinedIcon from '@mui/icons-material/LocalAtmOutlined';
import PhoneAndroidOutlinedIcon from '@mui/icons-material/PhoneAndroidOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import QrCodeScannerOutlinedIcon from '@mui/icons-material/QrCodeScannerOutlined';
import PointOfSaleOutlinedIcon from '@mui/icons-material/PointOfSaleOutlined';

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const RANGES: { label: string; days: number | null }[] = [
  { label: 'Today', days: 0 },
  { label: 'Last 7 days', days: 6 },
  { label: 'Last 30 days', days: 29 },
  { label: 'All time', days: null },
];

const n = (v: string | number | null | undefined) => {
  const x = typeof v === 'number' ? v : parseFloat(v ?? '');
  return Number.isFinite(x) ? x : 0;
};
const qty = (v: string | number | null | undefined) => {
  const x = n(v);
  return Number.isInteger(x) ? String(x) : String(Math.round(x * 1000) / 1000);
};

const STATUS_LABEL: Record<string, string> = { completed: 'Refunded', pending: 'Pending', cancelled: 'Rejected' };

/**
 * Every return and refund, from any sale. Returns are made at the POS
 * (Return, F8) and approved there by a supervisor; this page is the
 * history: what came back, why, how it was refunded, and who signed off.
 */
export function ReturnsScreen() {
  const { user } = useAuth();
  const notify = useSnackbar();
  const currency = user?.currency;
  const symbol = currencySymbol(currency);
  const money = (v: string | number) => `${symbol}${formatMoney(n(v))}`;

  const [stores, setStores] = useState<Store[]>([]);
  const [methods, setMethods] = useState<PaymentMethodOption[]>([]);
  const [storeFilter, setStoreFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [reasonFilter, setReasonFilter] = useState('');
  const [dateFrom, setDateFrom] = useState(iso(new Date(Date.now() - 29 * 86_400_000)));
  const [dateTo, setDateTo] = useState(iso(new Date()));
  const [summary, setSummary] = useState<ReturnsSummary | null>(null);
  const [selected, setSelected] = useState<SalesReturn | null>(null);
  const [exportAnchor, setExportAnchor] = useState<HTMLElement | null>(null);
  const [exporting, setExporting] = useState(false);

  const filters = { store_id: storeFilter, refund_method: methodFilter, status: statusFilter, reason: reasonFilter, date_from: dateFrom, date_to: dateTo };
  const { data, meta, loading, error, page, setPage, perPage, setPerPage, sort, setSort, q, setQ, reload } = useList<SalesReturn>('/returns', filters);

  useEffect(() => {
    api.get<Store[]>('/stores?per_page=100').then(setStores).catch(() => setStores([]));
    api.get<PaymentMethodOption[]>('/payment-methods?per_page=50').then(setMethods).catch(() => setMethods([]));
  }, []);

  const query = useMemo(() => {
    const p = new URLSearchParams();
    Object.entries({ ...filters, q: q.trim() }).forEach(([k, v]) => v && p.set(k, v));
    return p;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeFilter, methodFilter, statusFilter, reasonFilter, dateFrom, dateTo, q]);

  const loadSummary = useCallback(() => {
    api
      .get<ReturnsSummary>(`/returns/summary?${query.toString()}`)
      .then(setSummary)
      .catch(() => setSummary(null));
  }, [query]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  function refreshAll() {
    reload();
    loadSummary();
  }

  // A scanned receipt (its invoice barcode) finds that sale's returns.
  useBarcodeScanner((code) => setQ(code), selected === null);

  const methodName = (code: string | null) =>
    code ? (methods.find((m) => m.code.toLowerCase() === code.toLowerCase())?.name ?? (code === 'cash' ? 'Cash' : code === 'exchange' ? 'Exchange credit' : code.toUpperCase())) : '—';

  const activeRange = RANGES.find((r) =>
    r.days === null ? !dateFrom && !dateTo : dateTo === iso(new Date()) && dateFrom === iso(new Date(Date.now() - r.days * 86_400_000))
  );
  function applyRange(days: number | null) {
    if (days === null) {
      setDateFrom('');
      setDateTo('');
    } else {
      setDateFrom(iso(new Date(Date.now() - days * 86_400_000)));
      setDateTo(iso(new Date()));
    }
  }

  const storeName = stores.find((s) => String(s.id) === storeFilter)?.name;
  const filterLabels = [
    dateFrom || dateTo ? `Dates: ${dateFrom || '…'} to ${dateTo || '…'}` : 'All dates',
    methodFilter ? `Refund by: ${methodName(methodFilter)}` : '',
    statusFilter ? `Status: ${STATUS_LABEL[statusFilter]}` : '',
    reasonFilter ? `Reason: ${reasonFilter}` : '',
    q.trim() ? `Search: "${q.trim()}"` : '',
  ].filter(Boolean);

  const exportColumns: ExportColumn<SalesReturn>[] = [
    { header: 'Return #', width: 18, value: (r) => r.return_number },
    { header: 'Date', width: 20, value: (r) => formatDateTime(r.return_date, currency) },
    { header: 'Invoice', width: 20, value: (r) => r.invoice_number ?? '' },
    { header: 'Branch', width: 20, value: (r) => r.store_name ?? '' },
    { header: 'Terminal', width: 14, value: (r) => r.register_name ?? '' },
    { header: 'Cashier', width: 18, value: (r) => r.cashier_name ?? '' },
    { header: 'Approved by', width: 18, value: (r) => r.approved_by_name ?? '' },
    { header: 'Reason', width: 24, value: (r) => r.reason ?? '' },
    { header: 'Refund by', width: 12, value: (r) => methodName(r.refund_method) },
    { header: 'Units', width: 8, kind: 'number', value: (r) => n(r.units) },
    { header: 'Refund', width: 14, kind: 'money', value: (r) => n(r.total_refund) },
    { header: 'Status', width: 11, value: (r) => STATUS_LABEL[r.status] ?? r.status },
  ];

  async function runExport(kind: 'xlsx' | 'csv' | 'pdf') {
    setExportAnchor(null);
    setExporting(true);
    try {
      const params = new URLSearchParams(query);
      params.set('all', '1');
      if (sort) params.set('sort', sort);
      const rows = await api.get<SalesReturn[]>(`/returns?${params.toString()}`);
      const name = exportFileName('returns', storeName ?? 'all-branches');
      if (kind === 'csv') exportCsv(rows, exportColumns, name);
      else if (kind === 'xlsx')
        await exportExcel(rows, exportColumns, name, 'Returns', [summary?.company_name ?? 'Returns', `Returns · ${storeName ?? 'All branches'}`, filterLabels.join(' · ')]);
      else {
        const refunded = rows.filter((r) => r.status === 'completed');
        printReport({
          title: 'Returns & refunds',
          companyName: summary?.company_name ?? null,
          subtitle: storeName ?? 'All branches',
          filters: filterLabels,
          stats: [
            { label: 'Returns', value: String(refunded.length) },
            { label: 'Refunded', value: money(refunded.reduce((s, r) => s + n(r.total_refund), 0)) },
            { label: 'Cash', value: money(refunded.filter((r) => r.refund_method === 'cash').reduce((s, r) => s + n(r.total_refund), 0)) },
            { label: 'Units back', value: qty(refunded.reduce((s, r) => s + n(r.units), 0)) },
          ],
          columns: [
            { header: 'Return #', mono: true, value: (r) => r.return_number },
            { header: 'Date', value: (r) => formatDateTime(r.return_date, currency) },
            { header: 'Invoice', mono: true, value: (r) => r.invoice_number ?? '' },
            { header: 'Branch', value: (r) => r.store_name ?? '' },
            { header: 'Cashier / approver', value: (r) => [r.cashier_name, r.approved_by_name].filter(Boolean).join(' / ') },
            { header: 'Reason', value: (r) => r.reason ?? '' },
            { header: 'Refund by', value: (r) => methodName(r.refund_method) },
            { header: 'Refund', align: 'right', bold: true, value: (r) => money(r.total_refund) },
            { header: 'Status', value: (r) => STATUS_LABEL[r.status] ?? r.status },
          ],
          rows,
          printedBy: user?.name ?? null,
          currency,
        });
      }
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Could not prepare the export', 'error');
    } finally {
      setExporting(false);
    }
  }

  const columns: Column<SalesReturn>[] = [
    {
      key: 'return_number',
      label: 'Return',
      sortKey: 'return_number',
      render: (r) => (
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {r.return_number}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Invoice {r.invoice_number ?? `#${r.sale_id}`}
          </Typography>
        </Box>
      ),
    },
    {
      key: 'return_date',
      label: 'Date',
      sortKey: 'return_date',
      render: (r) => <Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>{formatDateTime(r.return_date, currency)}</Typography>,
    },
    {
      key: 'store',
      label: 'Branch',
      render: (r) => (
        <Box>
          <Typography variant="body2">{r.store_name ?? '—'}</Typography>
          {r.register_name && (
            <Typography variant="caption" color="text.secondary">
              {r.register_name}
            </Typography>
          )}
        </Box>
      ),
    },
    {
      key: 'people',
      label: 'Cashier',
      render: (r) => (
        <Box>
          <Typography variant="body2">{r.cashier_name ?? '—'}</Typography>
          <Typography variant="caption" color="text.secondary">
            {r.approved_by_name ? `Approved by ${r.approved_by_name}` : 'Not approved'}
          </Typography>
        </Box>
      ),
    },
    { key: 'reason', label: 'Reason', render: (r) => r.reason ?? <Typography variant="body2" color="text.disabled">—</Typography> },
    {
      key: 'refund_method',
      label: 'Refund by',
      render: (r) => (
        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', whiteSpace: 'nowrap' }}>
          {r.refund_method === 'cash' ? <LocalAtmOutlinedIcon sx={{ fontSize: 17, color: 'success.main' }} /> : <PhoneAndroidOutlinedIcon sx={{ fontSize: 17, color: 'info.main' }} />}
          <span>{methodName(r.refund_method)}</span>
        </Stack>
      ),
    },
    { key: 'units', label: 'Units', align: 'right', render: (r) => <Box sx={{ fontVariantNumeric: 'tabular-nums' }}>{qty(r.units)}</Box> },
    {
      key: 'total_refund',
      label: 'Refund',
      align: 'right',
      sortKey: 'total_refund',
      render: (r) => <Typography sx={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{money(r.total_refund)}</Typography>,
    },
    { key: 'status', label: 'Status', render: (r) => <ReturnStatusBadge status={r.status} /> },
  ];

  const hasLegacy = !!summary && (summary.pending_count > 0 || summary.cancelled_count > 0);

  return (
    <div>
      {/* ── Heading ─────────────────────────────────────────────── */}
      <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' }, gap: 1.5, mb: 2 }}>
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: 18 }}>{storeName ?? 'All branches'}</Typography>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', color: 'text.secondary' }}>
            <PointOfSaleOutlinedIcon sx={{ fontSize: 16 }} />
            <Typography variant="body2">
              Returns are done at the POS with <b>Return (F8)</b> and approved there by a supervisor.
            </Typography>
          </Stack>
        </Box>
        {stores.length > 1 && (
          <InlineSelectFilter
            label="Branch"
            value={storeFilter}
            onChange={setStoreFilter}
            minWidth={220}
            options={[{ value: '', label: 'All branches' }, ...stores.map((s) => ({ value: String(s.id), label: s.name }))]}
          />
        )}
      </Stack>

      {/* ── Figures ─────────────────────────────────────────────── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(5, 1fr)' }, gap: 1.5, mb: 2 }}>
        <MetricCard
          icon={<PaymentsOutlinedIcon sx={{ fontSize: 18 }} />}
          label="Refunded"
          value={summary ? money(summary.refund_total) : '–'}
          caption={activeRange?.label ?? 'Selected dates'}
        />
        <MetricCard
          icon={<AssignmentReturnOutlinedIcon sx={{ fontSize: 18 }} />}
          label="Returns"
          value={summary ? String(summary.return_count) : '–'}
          caption={summary && summary.return_count > 0 ? `Avg ${money(n(summary.refund_total) / summary.return_count)} each` : 'Refunded returns'}
        />
        <MetricCard
          icon={<LocalAtmOutlinedIcon sx={{ fontSize: 18 }} />}
          label="Cash refunds"
          value={summary ? money(summary.cash_total) : '–'}
          caption="Out of the cashiers' drawers"
        />
        <MetricCard
          icon={<PhoneAndroidOutlinedIcon sx={{ fontSize: 18 }} />}
          label="Non-cash refunds"
          value={summary ? money(summary.non_cash_total) : '–'}
          caption="GCash, card and others"
        />
        <MetricCard
          icon={<Inventory2OutlinedIcon sx={{ fontSize: 18 }} />}
          label="Units back"
          value={summary ? qty(summary.units) : '–'}
          caption="Returned to stock"
        />
      </Box>

      {/* ── Top reasons, as one-click filters ───────────────────── */}
      {summary && summary.by_reason.length > 0 && (
        <Stack direction="row" spacing={0.75} sx={{ mb: 2, alignItems: 'center', flexWrap: 'wrap' }} useFlexGap>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, mr: 0.5 }}>
            Top reasons
          </Typography>
          {summary.by_reason.map((r) => {
            const on = reasonFilter === r.reason;
            return (
              <Chip
                key={r.reason}
                label={`${r.reason} · ${r.count} · ${money(r.total)}`}
                clickable
                onClick={() => setReasonFilter(on ? '' : r.reason)}
                onDelete={on ? () => setReasonFilter('') : undefined}
                color={on ? 'primary' : 'default'}
                variant={on ? 'filled' : 'outlined'}
                sx={{ fontWeight: 600 }}
              />
            );
          })}
        </Stack>
      )}

      <ListToolbar
        search={q}
        onSearchChange={setQ}
        onRefresh={refreshAll}
        refreshing={loading}
        extra={
          <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap' }} useFlexGap>
            <InlineSelectFilter
              label="Refund by"
              compactOnMobile
              value={methodFilter}
              onChange={setMethodFilter}
              minWidth={150}
              options={[
                { value: '', label: 'Any method' },
                { value: 'cash', label: 'Cash' },
                ...methods.filter((m) => m.code.toLowerCase() !== 'cash').map((m) => ({ value: m.code.toLowerCase(), label: m.name })),
              ]}
            />
            {hasLegacy && (
              <InlineSelectFilter
                label="Status"
                compactOnMobile
                value={statusFilter}
                onChange={setStatusFilter}
                minWidth={140}
                options={[
                  { value: '', label: 'All' },
                  { value: 'completed', label: 'Refunded' },
                  { value: 'pending', label: `Pending (${summary?.pending_count ?? 0})` },
                  { value: 'cancelled', label: 'Rejected' },
                ]}
              />
            )}
          </Stack>
        }
        actions={
          <Button variant="outlined" startIcon={<FileDownloadOutlinedIcon />} endIcon={<ExpandMoreIcon />} disabled={exporting} onClick={(e) => setExportAnchor(e.currentTarget)}>
            {exporting ? 'Preparing…' : 'Export'}
          </Button>
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
          <ListItemText primary="Excel (.xlsx)" secondary="Every return, ready to sort and total" />
        </MenuItem>
        <MenuItem onClick={() => runExport('csv')}>
          <ListItemIcon>
            <DescriptionOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="CSV" secondary="For other systems and Google Sheets" />
        </MenuItem>
        <ListSubheader sx={{ lineHeight: '32px' }}>Print / PDF</ListSubheader>
        <MenuItem onClick={() => runExport('pdf')}>
          <ListItemIcon>
            <PrintOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Returns report" secondary="The list with totals, for filing" />
        </MenuItem>
      </Menu>

      {/* ── Dates ───────────────────────────────────────────────── */}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ mb: 1.5, alignItems: { md: 'center' } }}>
        <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap' }} useFlexGap>
          {RANGES.map((r) => (
            <Chip
              key={r.label}
              label={r.label}
              clickable
              onClick={() => applyRange(r.days)}
              color={activeRange?.label === r.label ? 'primary' : 'default'}
              variant={activeRange?.label === r.label ? 'filled' : 'outlined'}
              sx={{ fontWeight: 600 }}
            />
          ))}
        </Stack>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <TextField
            id="returns-from"
            type="date"
            size="small"
            label="From"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: dateTo || undefined } }}
          />
          <TextField
            id="returns-to"
            type="date"
            size="small"
            label="To"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: dateFrom || undefined } }}
          />
        </Stack>
      </Stack>

      <Stack direction="row" spacing={1} sx={{ mb: 1.5, alignItems: 'center', color: 'text.secondary' }}>
        <QrCodeScannerOutlinedIcon sx={{ fontSize: 17 }} />
        <Typography variant="caption">Scan a customer's receipt to find its returns, or search a return number, invoice or reason.</Typography>
      </Stack>

      <DataTable
        columns={columns}
        rows={data}
        rowKey={(r) => r.id}
        loading={loading}
        error={error}
        meta={meta}
        page={page}
        onPageChange={setPage}
        perPage={perPage}
        onPerPageChange={setPerPage}
        sort={sort}
        onSortChange={setSort}
        emptyLabel="No returns for these filters. Returns appear here once done at the POS."
        rowActions={(r) => (
          <Tooltip title="Open">
            <IconButton size="small" aria-label={`Open ${r.return_number}`} onClick={() => setSelected(r)}>
              <VisibilityOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      />

      <ReturnDetailDrawer
        ret={selected}
        companyName={summary?.company_name ?? null}
        methodName={methodName}
        onClose={() => setSelected(null)}
        onChanged={refreshAll}
      />
    </div>
  );
}
