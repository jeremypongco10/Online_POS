import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, ApiError } from '../api/client';
import type { SupplierDirectoryRow, SupplierDirectorySummary } from '../api/types';
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
import { SupplierStatusBadge } from './SupplierBadges';
import { SupplierDetailDrawer } from './SupplierDetailDrawer';
import { exportCsv, exportExcel, exportFileName, type ExportColumn } from './exportTable';
import { printReport } from './printReport';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import ListSubheader from '@mui/material/ListSubheader';
import AddIcon from '@mui/icons-material/Add';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import PendingActionsOutlinedIcon from '@mui/icons-material/PendingActionsOutlined';
import UpdateOutlinedIcon from '@mui/icons-material/UpdateOutlined';
import BedtimeOutlinedIcon from '@mui/icons-material/BedtimeOutlined';
import RemoveShoppingCartOutlinedIcon from '@mui/icons-material/RemoveShoppingCartOutlined';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import GridOnOutlinedIcon from '@mui/icons-material/GridOnOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';

interface FormState {
  name: string;
  contact_name: string;
  email: string;
  phone: string;
  address: string;
  tax_id: string;
  is_active: boolean;
}

const EMPTY_FORM: FormState = { name: '', contact_name: '', email: '', phone: '', address: '', tax_id: '', is_active: true };

type Segment = '' | 'open' | 'recent' | 'dormant' | 'never';

const n = (v: string | number | null | undefined) => {
  const x = typeof v === 'number' ? v : parseFloat(v ?? '');
  return Number.isFinite(x) ? x : 0;
};

interface Props {
  /** Jump to Purchase Orders filtered to this supplier (Purchasing wires this up). */
  onViewOrders?: (s: SupplierDirectoryRow) => void;
  /** Start a new purchase order with this supplier already picked. */
  onNewOrder?: (s: SupplierDirectoryRow) => void;
}

/** Who you buy from, what you've ordered, and what's still on its way — built to stay quick with thousands of suppliers. */
export function SuppliersScreen({ onViewOrders, onNewOrder }: Props) {
  const { user, hasPermission } = useAuth();
  const confirm = useConfirm();
  const notify = useSnackbar();
  const currency = user?.currency;
  const symbol = currencySymbol(currency);
  const money = (v: string | number) => `${symbol}${formatMoney(n(v))}`;
  const canManage = hasPermission('suppliers.manage');

  const [statusFilter, setStatusFilter] = useState('');
  const [segment, setSegment] = useState<Segment>('');
  const [summary, setSummary] = useState<SupplierDirectorySummary | null>(null);
  const [selected, setSelected] = useState<SupplierDirectoryRow | null>(null);
  const [exportAnchor, setExportAnchor] = useState<HTMLElement | null>(null);
  const [exporting, setExporting] = useState(false);

  const { data, meta, loading, error, page, setPage, perPage, setPerPage, sort, setSort, q, setQ, reload } = useList<SupplierDirectoryRow>('/suppliers/directory', {
    is_active: statusFilter,
    segment,
  });

  const recentDays = summary?.recent_days ?? 90;

  const loadSummary = useCallback(() => {
    api
      .get<SupplierDirectorySummary>(`/suppliers/directory/summary${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`)
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

  // ── Add / edit / remove ────────────────────────────────────────
  const [editing, setEditing] = useState<SupplierDirectoryRow | null>(null);
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

  function openEdit(s: SupplierDirectoryRow) {
    setEditing(s);
    setForm({
      name: s.name,
      contact_name: s.contact_name ?? '',
      email: s.email ?? '',
      phone: s.phone ?? '',
      address: s.address ?? '',
      tax_id: s.tax_id ?? '',
      is_active: Number(s.is_active) === 1,
    });
    clearErrors();
    setShowForm(true);
  }

  async function submitForm() {
    setSaving(true);
    clearErrors();
    const payload = {
      name: form.name,
      contact_name: form.contact_name || null,
      email: form.email || null,
      phone: form.phone || null,
      address: form.address || null,
      tax_id: form.tax_id || null,
      is_active: form.is_active ? 1 : 0,
    };
    try {
      if (editing) await api.put(`/suppliers/${editing.id}`, payload);
      else await api.post('/suppliers', payload);
      setShowForm(false);
      if (editing && selected?.id === editing.id) setSelected({ ...selected, ...payload });
      refreshAll();
      notify(editing ? 'Supplier updated' : 'Supplier added');
    } catch (err) {
      reportError(err, 'Failed to save supplier');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(s: SupplierDirectoryRow) {
    const activating = Number(s.is_active) !== 1;
    const verb = activating ? 'Activate' : 'Deactivate';
    const detail = activating ? '' : ' They will no longer show when picking a supplier for a new order. Past orders stay as they are.';
    if (!(await confirm(`${verb} "${s.name}"?${detail}`, { title: `${verb} supplier`, confirmLabel: verb }))) return;
    try {
      await api.put(`/suppliers/${s.id}`, { is_active: activating ? 1 : 0 });
      if (selected?.id === s.id) setSelected({ ...selected, is_active: activating ? 1 : 0 });
      refreshAll();
      notify(`Supplier ${activating ? 'activated' : 'deactivated'}`);
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Failed to update supplier', 'error');
    }
  }

  async function remove(s: SupplierDirectoryRow) {
    if (!(await confirm(`Delete "${s.name}"? Nothing has been ordered from them, so nothing else is affected.`, { title: 'Delete supplier', confirmLabel: 'Delete' }))) return;
    try {
      await api.del(`/suppliers/${s.id}`);
      setSelected(null);
      refreshAll();
      notify('Supplier deleted');
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Failed to delete supplier', 'error');
    }
  }

  // ── Export ─────────────────────────────────────────────────────
  const SEGMENT_LABEL: Record<Exclude<Segment, ''>, string> = {
    open: 'Open orders',
    recent: `Ordered in last ${recentDays} days`,
    dormant: `No order in ${recentDays}+ days`,
    never: 'Never ordered',
  };
  const filterLabels = [
    segment ? `Showing: ${SEGMENT_LABEL[segment]}` : '',
    statusFilter ? `Status: ${statusFilter === '1' ? 'Active' : 'Inactive'}` : '',
    q.trim() ? `Search: "${q.trim()}"` : '',
  ].filter(Boolean);

  const exportColumns = useMemo<ExportColumn<SupplierDirectoryRow>[]>(
    () => [
      { header: 'Supplier', width: 30, value: (s) => s.name },
      { header: 'Contact person', width: 22, value: (s) => s.contact_name ?? '' },
      { header: 'Phone', width: 16, value: (s) => s.phone ?? '' },
      { header: 'Email', width: 26, value: (s) => s.email ?? '' },
      { header: 'TIN', width: 18, value: (s) => s.tax_id ?? '' },
      { header: 'Address', width: 34, value: (s) => s.address ?? '' },
      { header: 'Orders', width: 8, kind: 'number', value: (s) => n(s.orders) },
      { header: 'Open orders', width: 10, kind: 'number', value: (s) => n(s.open_orders) },
      { header: 'Open value', width: 14, kind: 'money', value: (s) => n(s.open_value) },
      { header: 'Received', width: 14, kind: 'money', value: (s) => n(s.received_total) },
      { header: 'Last order', width: 14, value: (s) => (s.last_order ? formatDate(s.last_order, currency) : '') },
      { header: 'Status', width: 10, value: (s) => (Number(s.is_active) === 1 ? 'Active' : 'Inactive') },
    ],
    [currency]
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
      const rows = await api.get<SupplierDirectoryRow[]>(`/suppliers/directory?${params.toString()}`);
      const name = exportFileName('suppliers', segment || '');
      if (kind === 'csv') exportCsv(rows, exportColumns, name);
      else if (kind === 'xlsx') await exportExcel(rows, exportColumns, name, 'Suppliers', [summary?.company_name ?? 'Suppliers', 'Supplier list', filterLabels.join(' · ')]);
      else
        printReport({
          title: 'Supplier list',
          companyName: summary?.company_name ?? null,
          subtitle: segment ? SEGMENT_LABEL[segment] : 'All suppliers',
          filters: filterLabels,
          stats: [
            { label: 'Suppliers', value: rows.length.toLocaleString() },
            { label: 'Orders', value: rows.reduce((t, s) => t + n(s.orders), 0).toLocaleString() },
            { label: 'Open value', value: money(rows.reduce((t, s) => t + n(s.open_value), 0)) },
            { label: 'Received', value: money(rows.reduce((t, s) => t + n(s.received_total), 0)) },
          ],
          columns: [
            { header: '#', align: 'center', value: (_s, i) => i + 1 },
            { header: 'Supplier', bold: true, value: (s) => s.name },
            { header: 'Contact', value: (s) => [s.contact_name, s.phone].filter(Boolean).join(' · ') },
            { header: 'TIN', mono: true, value: (s) => s.tax_id ?? '' },
            { header: 'Orders', align: 'right', value: (s) => n(s.orders) },
            { header: 'Open', align: 'right', value: (s) => (n(s.open_value) > 0 ? money(s.open_value) : '—') },
            { header: 'Received', align: 'right', value: (s) => money(s.received_total) },
            { header: 'Last order', value: (s) => (s.last_order ? formatDate(s.last_order, currency) : '—') },
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
  const columns: Column<SupplierDirectoryRow>[] = [
    {
      key: 'name',
      label: 'Supplier',
      sortKey: 'name',
      render: (s) => (
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {s.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {s.tax_id ? `TIN ${s.tax_id}` : 'No TIN'}
          </Typography>
        </Box>
      ),
    },
    {
      key: 'contact',
      label: 'Contact',
      render: (s) =>
        s.contact_name || s.phone || s.email ? (
          <Box>
            <Typography variant="body2">{[s.contact_name, s.phone].filter(Boolean).join(' · ') || s.email}</Typography>
            {s.email && (s.contact_name || s.phone) && (
              <Typography variant="caption" color="text.secondary">
                {s.email}
              </Typography>
            )}
          </Box>
        ) : (
          <Typography variant="body2" color="text.disabled">
            —
          </Typography>
        ),
    },
    { key: 'orders', label: 'Orders', align: 'right', sortKey: 'orders', render: (s) => <Box sx={{ fontVariantNumeric: 'tabular-nums' }}>{n(s.orders)}</Box> },
    {
      key: 'open',
      label: 'Open',
      align: 'right',
      sortKey: 'open_value',
      render: (s) =>
        n(s.open_orders) > 0 ? (
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 700, color: 'warning.main', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
              {money(s.open_value)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {n(s.open_orders)} order{n(s.open_orders) === 1 ? '' : 's'}
            </Typography>
          </Box>
        ) : (
          <Typography variant="body2" color="text.disabled">
            —
          </Typography>
        ),
    },
    {
      key: 'received',
      label: 'Received',
      align: 'right',
      sortKey: 'received',
      render: (s) => <Typography sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{money(s.received_total)}</Typography>,
    },
    {
      key: 'last_order',
      label: 'Last order',
      sortKey: 'last_order',
      render: (s) =>
        s.last_order ? (
          <Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>
            {formatDate(s.last_order, currency)}
          </Typography>
        ) : (
          <Typography variant="body2" color="text.disabled">
            Never
          </Typography>
        ),
    },
    { key: 'status', label: 'Status', render: (s) => <SupplierStatusBadge active={Number(s.is_active) === 1} /> },
  ];

  const toggleSegment = (s: Exclude<Segment, ''>) => setSegment(segment === s ? '' : s);

  return (
    <div>
      {/* ── Heading ─────────────────────────────────────────────── */}
      <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' }, gap: 1.5, mb: 2 }}>
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: 18 }}>Suppliers</Typography>
          <Typography variant="body2" color="text.secondary">
            Who you buy from, what you've ordered, and what's still on its way.
          </Typography>
        </Box>
        {canManage && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            Add supplier
          </Button>
        )}
      </Stack>

      {/* ── Figures and segments ────────────────────────────────── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(6, 1fr)' }, gap: 1.5, mb: 2.5 }}>
        <MetricCard
          icon={<StorefrontOutlinedIcon sx={{ fontSize: 18 }} />}
          label="Suppliers"
          value={summary ? summary.total.toLocaleString() : '–'}
          caption={summary ? `${summary.active.toLocaleString()} active · ${summary.inactive.toLocaleString()} inactive` : undefined}
        />
        <MetricCard
          icon={<Inventory2OutlinedIcon sx={{ fontSize: 18 }} />}
          label="Received this month"
          value={summary ? money(summary.received_this_month) : '–'}
          caption={summary ? `${money(summary.received_total)} all time` : undefined}
        />
        <FilterCard
          label="Open orders"
          hint={summary && summary.open_orders > 0 ? `${summary.open_orders} worth ${money(summary.open_value)}` : 'Drafted or approved'}
          count={summary?.with_open ?? null}
          unit="suppliers"
          css="var(--mui-palette-warning-main)"
          icon={<PendingActionsOutlinedIcon sx={{ fontSize: 18 }} />}
          selected={segment === 'open'}
          onClick={() => toggleSegment('open')}
        />
        <FilterCard
          label="Ordered recently"
          hint={`In the last ${recentDays} days`}
          count={summary?.recent ?? null}
          unit="suppliers"
          css="var(--mui-palette-success-main)"
          icon={<UpdateOutlinedIcon sx={{ fontSize: 18 }} />}
          selected={segment === 'recent'}
          onClick={() => toggleSegment('recent')}
        />
        <FilterCard
          label="Dormant"
          hint={`No order in ${recentDays}+ days`}
          count={summary?.dormant ?? null}
          unit="suppliers"
          css="var(--mui-palette-info-main)"
          icon={<BedtimeOutlinedIcon sx={{ fontSize: 18 }} />}
          selected={segment === 'dormant'}
          onClick={() => toggleSegment('dormant')}
        />
        <FilterCard
          label="Never ordered"
          hint="No purchase order yet"
          count={summary?.never ?? null}
          unit="suppliers"
          css="var(--mui-palette-text-secondary)"
          icon={<RemoveShoppingCartOutlinedIcon sx={{ fontSize: 18 }} />}
          selected={segment === 'never'}
          onClick={() => toggleSegment('never')}
        />
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
          <ListItemText primary="Excel (.xlsx)" secondary="Contacts, TIN and order totals" />
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
          <ListItemText primary="Supplier list" secondary="With contacts and what you've ordered" />
        </MenuItem>
      </Menu>

      {segment && (
        <Stack direction="row" spacing={1} sx={{ mb: 1.5, alignItems: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            Filtered:
          </Typography>
          <Chip size="small" label={SEGMENT_LABEL[segment]} onDelete={() => setSegment('')} />
        </Stack>
      )}

      <DataTable
        columns={columns}
        rows={data}
        rowKey={(s) => s.id}
        loading={loading}
        error={error}
        meta={meta}
        page={page}
        onPageChange={setPage}
        perPage={perPage}
        onPerPageChange={setPerPage}
        sort={sort}
        onSortChange={setSort}
        emptyLabel={segment || q || statusFilter ? 'No suppliers match these filters.' : 'No suppliers yet. Add the companies you buy stock from.'}
        rowActions={(s) => (
          <>
            <Tooltip title="Open">
              <IconButton size="small" aria-label={`Open ${s.name}`} onClick={() => setSelected(s)}>
                <VisibilityOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            {canManage && (
              <Tooltip title="Edit">
                <IconButton size="small" aria-label={`Edit ${s.name}`} onClick={() => openEdit(s)}>
                  <EditOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </>
        )}
      />

      <SupplierDetailDrawer
        supplier={selected}
        onClose={() => setSelected(null)}
        onEdit={openEdit}
        onToggleActive={toggleActive}
        onDelete={remove}
        onViewOrders={onViewOrders}
        onNewOrder={hasPermission('purchases.create') ? onNewOrder : undefined}
      />

      <Modal open={showForm} title={editing ? 'Edit supplier' : 'Add supplier'} onClose={() => setShowForm(false)} compact>
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
                label="Supplier name"
                fullWidth
                autoFocus
                value={form.name}
                onChange={(e) => {
                  setForm({ ...form, name: e.target.value });
                  clearField('name');
                }}
                error={!!fieldErrors?.name}
                helperText={fieldErrors?.name}
                required
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Contact person" fullWidth value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Phone"
                fullWidth
                value={form.phone}
                onChange={(e) => {
                  setForm({ ...form, phone: e.target.value });
                  clearField('phone');
                }}
                error={!!fieldErrors?.phone}
                helperText={fieldErrors?.phone}
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
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="TIN" fullWidth value={form.tax_id} onChange={(e) => setForm({ ...form, tax_id: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField label="Address" fullWidth value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <FormControlLabel control={<Checkbox checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />} label="Active" />
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
                  {saving ? 'Saving…' : editing ? 'Save changes' : 'Add supplier'}
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </form>
      </Modal>
    </div>
  );
}
