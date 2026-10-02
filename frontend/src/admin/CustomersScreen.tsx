import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, ApiError } from '../api/client';
import type { CustomerDirectoryRow, CustomerDirectorySummary } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { useConfirm } from '../ConfirmDialog';
import { useSnackbar } from '../Snackbar';
import { currencySymbol, formatDate } from '../regional';
import { formatMoney } from '../pos/format';
import { useList } from './useList';
import { useFormErrors } from './useFormErrors';
import { DataTable, type Column } from './DataTable';
import { ListToolbar } from './ListToolbar';
import { InlineSelectFilter } from './InlineSelectFilter';
import { Modal } from './Modal';
import { FilterCard, MetricCard } from './SummaryCards';
import { CustomerActivityBadge, CustomerAvatar } from './CustomerBadges';
import { customerActivity } from './customerUtils';
import { CustomerDetailDrawer } from './CustomerDetailDrawer';
import { exportCsv, exportExcel, exportFileName, type ExportColumn } from './exportTable';
import { printReport } from './printReport';
import { useBarcodeScanner } from './useBarcodeScanner';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import InputAdornment from '@mui/material/InputAdornment';
import Tooltip from '@mui/material/Tooltip';
import Chip from '@mui/material/Chip';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import ListSubheader from '@mui/material/ListSubheader';
import AddIcon from '@mui/icons-material/Add';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import FiberNewOutlinedIcon from '@mui/icons-material/FiberNewOutlined';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';
import HourglassBottomOutlinedIcon from '@mui/icons-material/HourglassBottomOutlined';
import LoyaltyOutlinedIcon from '@mui/icons-material/LoyaltyOutlined';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import GridOnOutlinedIcon from '@mui/icons-material/GridOnOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import QrCodeScannerOutlinedIcon from '@mui/icons-material/QrCodeScannerOutlined';

interface FormState {
  first_name: string;
  last_name: string;
  email: string;
  mobile: string;
  address: string;
  is_active: boolean;
}

const EMPTY_FORM: FormState = { first_name: '', last_name: '', email: '', mobile: '', address: '', is_active: true };

type Segment = '' | 'new' | 'never_bought' | 'lapsed' | 'with_points';

const n = (v: string | number | null | undefined) => {
  const x = typeof v === 'number' ? v : parseFloat(v ?? '');
  return Number.isFinite(x) ? x : 0;
};

/**
 * Customer records and loyalty — who your customers are, how often they
 * come back, and what they spend. Returns are not here: a return belongs to
 * a sale, so it has its own page.
 */
export function CustomersScreen() {
  const { user, hasPermission } = useAuth();
  const confirm = useConfirm();
  const notify = useSnackbar();
  const currency = user?.currency;
  const symbol = currencySymbol(currency);
  const money = (v: string | number) => `${symbol}${formatMoney(n(v))}`;

  const [statusFilter, setStatusFilter] = useState('');
  const [segment, setSegment] = useState<Segment>('');
  const [summary, setSummary] = useState<CustomerDirectorySummary | null>(null);
  const [selected, setSelected] = useState<CustomerDirectoryRow | null>(null);
  const [exportAnchor, setExportAnchor] = useState<HTMLElement | null>(null);
  const [exporting, setExporting] = useState(false);

  const { data, meta, loading, error, page, setPage, perPage, setPerPage, sort, setSort, q, setQ, reload } = useList<CustomerDirectoryRow>('/customers/directory', {
    is_active: statusFilter,
    segment,
  });

  const pointsVisible = summary?.points_visible ?? false;
  const lapsedDays = summary?.lapsed_days ?? 90;

  const loadSummary = useCallback(() => {
    api
      .get<CustomerDirectorySummary>(`/customers/directory/summary${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`)
      .then(setSummary)
      .catch(() => setSummary(null));
  }, [q]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  function refreshAll() {
    reload();
    loadSummary();
  }

  // ── Add / edit ─────────────────────────────────────────────────
  const [editing, setEditing] = useState<CustomerDirectoryRow | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const { fieldErrors, formError, clearErrors, clearField, reportError } = useFormErrors();

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    clearErrors();
    setShowForm(true);
  }

  function openEdit(c: CustomerDirectoryRow) {
    setEditing(c);
    setForm({
      first_name: c.first_name,
      last_name: c.last_name,
      email: c.email ?? '',
      mobile: c.mobile ?? '',
      address: c.address ?? '',
      is_active: Number(c.is_active) === 1,
    });
    clearErrors();
    setShowForm(true);
  }

  async function submitForm() {
    setSaving(true);
    clearErrors();
    const payload = {
      first_name: form.first_name,
      last_name: form.last_name,
      email: form.email || null,
      mobile: form.mobile || null,
      address: form.address || null,
      is_active: form.is_active ? 1 : 0,
    };
    try {
      if (editing) await api.put(`/customers/${editing.id}`, payload);
      else await api.post('/customers', payload);
      setShowForm(false);
      // The open drawer shows the old details otherwise.
      if (editing && selected?.id === editing.id) {
        setSelected({ ...selected, ...payload, name: `${payload.first_name} ${payload.last_name}`.trim() });
      }
      refreshAll();
      notify(editing ? 'Customer updated' : 'Customer added');
    } catch (err) {
      reportError(err, 'Failed to save customer');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(c: CustomerDirectoryRow) {
    const activating = Number(c.is_active) !== 1;
    const verb = activating ? 'Activate' : 'Deactivate';
    if (!(await confirm(`${verb} customer "${c.name}"?`, { title: `${verb} customer`, confirmLabel: verb }))) return;
    try {
      await api.put(`/customers/${c.id}`, { is_active: activating ? 1 : 0 });
      if (selected?.id === c.id) setSelected({ ...selected, is_active: activating ? 1 : 0 });
      refreshAll();
      notify(`Customer ${activating ? 'activated' : 'deactivated'}`);
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Failed to update customer', 'error');
    }
  }

  // A scanned loyalty card (or customer number) opens that customer.
  async function onScan(code: string) {
    try {
      const rows = await api.get<CustomerDirectoryRow[]>(`/customers/directory?per_page=5&q=${encodeURIComponent(code)}`);
      const exact = rows.find((r) => r.card_number === code || r.customer_code === code);
      setQ('');
      if (exact) setSelected(exact);
      else setQ(code);
    } catch {
      setQ(code);
    }
  }
  useBarcodeScanner(onScan, selected === null && !showForm);

  // ── Export ─────────────────────────────────────────────────────
  const SEGMENT_LABEL: Record<Exclude<Segment, ''>, string> = {
    new: 'New this month',
    never_bought: 'Never bought',
    lapsed: `Lapsed (${lapsedDays}+ days)`,
    with_points: 'With points',
  };
  const filterLabels = [
    segment ? `Showing: ${SEGMENT_LABEL[segment]}` : '',
    statusFilter ? `Status: ${statusFilter === '1' ? 'Active' : 'Inactive'}` : '',
    q.trim() ? `Search: "${q.trim()}"` : '',
  ].filter(Boolean);

  const exportColumns = useMemo<ExportColumn<CustomerDirectoryRow>[]>(
    () => [
      { header: 'Customer No', width: 20, value: (c) => c.customer_code },
      { header: 'Name', width: 26, value: (c) => c.name },
      { header: 'Mobile', width: 16, value: (c) => c.mobile ?? '' },
      { header: 'Email', width: 26, value: (c) => c.email ?? '' },
      { header: 'Address', width: 30, value: (c) => c.address ?? '' },
      { header: 'Visits', width: 8, kind: 'number', value: (c) => n(c.visits) },
      { header: 'Bought', width: 14, kind: 'money', value: (c) => n(c.bought) },
      { header: 'Refunded', width: 12, kind: 'money', value: (c) => n(c.refunded) },
      { header: 'Spent (net)', width: 14, kind: 'money', value: (c) => n(c.spent) },
      { header: 'Last visit', width: 14, value: (c) => (c.last_visit ? formatDate(c.last_visit, currency) : '') },
      ...(pointsVisible
        ? [
            { header: 'Loyalty card', width: 18, value: (c: CustomerDirectoryRow) => c.card_number ?? '' },
            { header: 'Points', width: 10, kind: 'number' as const, value: (c: CustomerDirectoryRow) => n(c.points) },
          ]
        : []),
      { header: 'Customer since', width: 14, value: (c) => formatDate(c.created_at, currency) },
      { header: 'Status', width: 12, value: (c) => customerActivity(c, lapsedDays).label },
    ],
    [pointsVisible, currency, lapsedDays]
  );

  async function runExport(kind: 'xlsx' | 'csv' | 'pdf') {
    setExportAnchor(null);
    setExporting(true);
    try {
      const params = new URLSearchParams({ all: '1' });
      if (q.trim()) params.set('q', q.trim());
      if (statusFilter) params.set('is_active', statusFilter);
      if (segment) params.set('segment', segment);
      if (sort) params.set('sort', sort);
      const rows = await api.get<CustomerDirectoryRow[]>(`/customers/directory?${params.toString()}`);
      const name = exportFileName('customers', segment || '');
      if (kind === 'csv') exportCsv(rows, exportColumns, name);
      else if (kind === 'xlsx') await exportExcel(rows, exportColumns, name, 'Customers', [summary?.company_name ?? 'Customers', 'Customer list', filterLabels.join(' · ')]);
      else
        printReport({
          title: 'Customer list',
          companyName: summary?.company_name ?? null,
          subtitle: segment ? SEGMENT_LABEL[segment] : 'All customers',
          filters: filterLabels,
          stats: [
            { label: 'Customers', value: String(rows.length) },
            { label: 'Total spent', value: money(rows.reduce((s, c) => s + n(c.spent), 0)) },
            { label: 'Visits', value: String(rows.reduce((s, c) => s + n(c.visits), 0)) },
            ...(pointsVisible ? [{ label: 'Points held', value: rows.reduce((s, c) => s + Math.max(n(c.points), 0), 0).toLocaleString() }] : []),
          ],
          columns: [
            { header: '#', align: 'center', value: (_c, i) => i + 1 },
            { header: 'Customer No', mono: true, value: (c) => c.customer_code },
            { header: 'Name', bold: true, value: (c) => c.name },
            { header: 'Mobile', value: (c) => c.mobile ?? '' },
            { header: 'Email', value: (c) => c.email ?? '' },
            { header: 'Visits', align: 'right', value: (c) => n(c.visits) },
            { header: 'Spent', align: 'right', value: (c) => money(c.spent) },
            { header: 'Last visit', value: (c) => (c.last_visit ? formatDate(c.last_visit, currency) : '—') },
            ...(pointsVisible ? [{ header: 'Points', align: 'right' as const, value: (c: CustomerDirectoryRow) => n(c.points).toLocaleString() }] : []),
          ],
          rows,
          printedBy: user?.name ?? null,
          currency,
        });
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Could not prepare the export', 'error');
    } finally {
      setExporting(false);
    }
  }

  // ── Table ──────────────────────────────────────────────────────
  const columns: Column<CustomerDirectoryRow>[] = [
    {
      key: 'name',
      label: 'Customer',
      sortKey: 'name',
      render: (c) => (
        <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', minWidth: 0 }}>
          <CustomerAvatar name={c.name} />
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {c.name}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
              {c.customer_code}
            </Typography>
          </Box>
        </Stack>
      ),
    },
    {
      key: 'contact',
      label: 'Contact',
      render: (c) =>
        c.mobile || c.email ? (
          <Box>
            {c.mobile && <Typography variant="body2">{c.mobile}</Typography>}
            {c.email && (
              <Typography variant="caption" color="text.secondary">
                {c.email}
              </Typography>
            )}
          </Box>
        ) : (
          <Typography variant="body2" color="text.disabled">
            —
          </Typography>
        ),
    },
    { key: 'visits', label: 'Visits', align: 'right', sortKey: 'visits', render: (c) => <Box sx={{ fontVariantNumeric: 'tabular-nums' }}>{n(c.visits)}</Box> },
    {
      key: 'spent',
      label: 'Spent',
      align: 'right',
      sortKey: 'spent',
      render: (c) => <Typography sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{money(c.spent)}</Typography>,
    },
    {
      key: 'last_visit',
      label: 'Last visit',
      sortKey: 'last_visit',
      render: (c) =>
        c.last_visit ? (
          <Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>
            {formatDate(c.last_visit, currency)}
          </Typography>
        ) : (
          <Typography variant="body2" color="text.disabled">
            Never
          </Typography>
        ),
    },
    ...(pointsVisible
      ? [
          {
            key: 'points',
            label: 'Points',
            align: 'right',
            sortKey: 'points',
            render: (c: CustomerDirectoryRow) => (
              <Typography sx={{ fontWeight: 700, color: n(c.points) > 0 ? 'success.main' : 'text.disabled', fontVariantNumeric: 'tabular-nums' }}>
                {n(c.points).toLocaleString()}
              </Typography>
            ),
          } as Column<CustomerDirectoryRow>,
        ]
      : []),
    { key: 'status', label: 'Status', render: (c) => <CustomerActivityBadge customer={c} lapsedDays={lapsedDays} /> },
  ];

  const toggleSegment = (s: Exclude<Segment, ''>) => setSegment(segment === s ? '' : s);

  return (
    <div>
      {/* ── Heading ─────────────────────────────────────────────── */}
      <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' }, gap: 1.5, mb: 2 }}>
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: 18 }}>Customers</Typography>
          <Typography variant="body2" color="text.secondary">
            Who buys from you, how often they come back{pointsVisible ? ', and their loyalty points' : ''}.
          </Typography>
        </Box>
        {hasPermission('customers.create') && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            Add customer
          </Button>
        )}
      </Stack>

      {/* ── Figures and segments ────────────────────────────────── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: `repeat(${pointsVisible ? 6 : 5}, 1fr)` }, gap: 1.5, mb: 2.5 }}>
        <MetricCard
          icon={<GroupOutlinedIcon sx={{ fontSize: 18 }} />}
          label="Customers"
          value={summary ? summary.total.toLocaleString() : '–'}
          caption={summary ? `${summary.active.toLocaleString()} active · ${summary.inactive.toLocaleString()} inactive` : undefined}
        />
        <MetricCard
          icon={<PaymentsOutlinedIcon sx={{ fontSize: 18 }} />}
          label="Spent by customers"
          value={summary ? money(summary.spent_total) : '–'}
          caption={summary && n(summary.refunded_total) > 0 ? `After ${money(summary.refunded_total)} in refunds` : 'After refunds'}
        />
        <FilterCard
          label="New this month"
          hint="Added since the 1st"
          count={summary?.new_this_month ?? null}
          unit="customers"
          css="var(--mui-palette-primary-main)"
          icon={<FiberNewOutlinedIcon sx={{ fontSize: 18 }} />}
          selected={segment === 'new'}
          onClick={() => toggleSegment('new')}
        />
        <FilterCard
          label="Lapsed"
          hint={`No visit in ${lapsedDays} days`}
          count={summary?.lapsed ?? null}
          unit="worth a follow-up"
          css="var(--mui-palette-warning-main)"
          icon={<HourglassBottomOutlinedIcon sx={{ fontSize: 18 }} />}
          selected={segment === 'lapsed'}
          onClick={() => toggleSegment('lapsed')}
        />
        <FilterCard
          label="Never bought"
          hint="No sale linked yet"
          count={summary?.never_bought ?? null}
          unit="customers"
          css="var(--mui-palette-info-main)"
          icon={<ShoppingBagOutlinedIcon sx={{ fontSize: 18 }} />}
          selected={segment === 'never_bought'}
          onClick={() => toggleSegment('never_bought')}
        />
        {pointsVisible && (
          <FilterCard
            label="With points"
            hint={summary ? `${summary.points_outstanding.toLocaleString()} points held` : 'Points to spend'}
            count={summary?.with_points ?? null}
            unit="customers"
            css="var(--mui-palette-success-main)"
            icon={<LoyaltyOutlinedIcon sx={{ fontSize: 18 }} />}
            selected={segment === 'with_points'}
            onClick={() => toggleSegment('with_points')}
          />
        )}
      </Box>

      <ListToolbar
        search={q}
        onSearchChange={setQ}
        onRefresh={refreshAll}
        refreshing={loading}
        extra={
          <InlineSelectFilter
            label="Status"
            compactOnMobile
            value={statusFilter}
            onChange={setStatusFilter}
            minWidth={140}
            options={[
              { value: '', label: 'All' },
              { value: '1', label: 'Active' },
              { value: '0', label: 'Inactive' },
            ]}
          />
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
          <ListItemText primary="Excel (.xlsx)" secondary="Contacts, visits and spend" />
        </MenuItem>
        <MenuItem onClick={() => runExport('csv')}>
          <ListItemIcon>
            <DescriptionOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="CSV" secondary="For SMS or email tools and Google Sheets" />
        </MenuItem>
        <ListSubheader sx={{ lineHeight: '32px' }}>Print / PDF</ListSubheader>
        <MenuItem onClick={() => runExport('pdf')}>
          <ListItemIcon>
            <PrintOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Customer list" secondary="With visits, spend and contacts" />
        </MenuItem>
      </Menu>

      <Stack direction="row" spacing={1} sx={{ mb: 1.5, alignItems: 'center', flexWrap: 'wrap', color: 'text.secondary' }} useFlexGap>
        <QrCodeScannerOutlinedIcon sx={{ fontSize: 17 }} />
        <Typography variant="caption" sx={{ mr: 1 }}>
          Scan a loyalty card to open that customer.
        </Typography>
        {segment && <Chip size="small" label={SEGMENT_LABEL[segment]} onDelete={() => setSegment('')} />}
      </Stack>

      <DataTable
        columns={columns}
        rows={data}
        rowKey={(c) => c.id}
        loading={loading}
        error={error}
        meta={meta}
        page={page}
        onPageChange={setPage}
        perPage={perPage}
        onPerPageChange={setPerPage}
        sort={sort}
        onSortChange={setSort}
        emptyLabel={segment || q || statusFilter ? 'No customers match these filters.' : 'No customers yet. Add one, or attach one to a sale at the POS.'}
        rowActions={(c) => (
          <>
            <Tooltip title="Open">
              <IconButton size="small" aria-label={`Open ${c.name}`} onClick={() => setSelected(c)}>
                <VisibilityOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            {hasPermission('customers.update') && (
              <Tooltip title="Edit">
                <IconButton size="small" aria-label={`Edit ${c.name}`} onClick={() => openEdit(c)}>
                  <EditOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </>
        )}
      />

      <CustomerDetailDrawer
        customer={selected}
        pointsVisible={pointsVisible}
        lapsedDays={lapsedDays}
        onClose={() => setSelected(null)}
        onEdit={openEdit}
        onToggleActive={toggleActive}
        onChanged={refreshAll}
      />

      <Modal open={showForm} title={editing ? 'Edit customer' : 'Add customer'} onClose={() => setShowForm(false)} compact>
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            submitForm();
          }}
        >
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Customer No"
                fullWidth
                disabled
                value={editing ? editing.customer_code : saving ? 'Generating…' : 'Auto-generated on save'}
                slotProps={{
                  input: {
                    endAdornment:
                      !editing && saving ? (
                        <InputAdornment position="end">
                          <CircularProgress size={16} />
                        </InputAdornment>
                      ) : undefined,
                  },
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="First Name"
                fullWidth
                autoFocus
                value={form.first_name}
                onChange={(e) => {
                  setForm({ ...form, first_name: e.target.value });
                  clearField('first_name');
                }}
                error={!!fieldErrors?.first_name}
                helperText={fieldErrors?.first_name}
                required
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Last Name"
                fullWidth
                value={form.last_name}
                onChange={(e) => {
                  setForm({ ...form, last_name: e.target.value });
                  clearField('last_name');
                }}
                error={!!fieldErrors?.last_name}
                helperText={fieldErrors?.last_name}
                required
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Mobile"
                fullWidth
                value={form.mobile}
                onChange={(e) => {
                  setForm({ ...form, mobile: e.target.value });
                  clearField('mobile');
                }}
                error={!!fieldErrors?.mobile}
                helperText={fieldErrors?.mobile}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Email"
                type="email"
                fullWidth
                value={form.email}
                onChange={(e) => {
                  setForm({ ...form, email: e.target.value });
                  clearField('email');
                }}
                error={!!fieldErrors?.email}
                helperText={fieldErrors?.email}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField label="Address" fullWidth value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </Grid>
            {formError && (
              <Grid size={{ xs: 12 }}>
                <Alert severity="error">{formError}</Alert>
              </Grid>
            )}
            <Grid size={{ xs: 12 }}>
              <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'flex-end' }}>
                <Button type="button" variant="text" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="contained" disabled={saving}>
                  {saving ? 'Saving…' : editing ? 'Save changes' : 'Add customer'}
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </form>
      </Modal>
    </div>
  );
}
