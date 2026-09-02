import { useEffect, useState } from 'react';
import { api, ApiError } from '../api/client';
import type { Company, PaymentMethodOption, Register, Store, TaxRate, Unit } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { useConfirm } from '../ConfirmDialog';
import { useSnackbar } from '../Snackbar';
import { useList } from './useList';
import { useFormErrors } from './useFormErrors';
import { DataTable, type Column } from './DataTable';
import { ListToolbar } from './ListToolbar';
import { Modal } from './Modal';
import { DetailView, StatusChip } from './DetailView';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import { SectionTabs } from './SectionTabs';
import { InlineSelectFilter } from './InlineSelectFilter';
import { SearchableSelect } from './SearchableSelect';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Tooltip from '@mui/material/Tooltip';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';
import CircularProgress from '@mui/material/CircularProgress';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import LoyaltyOutlinedIcon from '@mui/icons-material/LoyaltyOutlined';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import Switch from '@mui/material/Switch';
import { useRouteState } from '../routing';

type Tab = 'stores' | 'registers' | 'payment-methods' | 'taxes' | 'units' | 'loyalty' | 'security';
const TABS: Tab[] = ['stores', 'registers', 'payment-methods', 'taxes', 'units', 'loyalty', 'security'];
const TAB_LABELS: Record<Tab, string> = {
  stores: 'Stores',
  registers: 'POS Terminals',
  'payment-methods': 'Payment Methods',
  taxes: 'Taxes',
  units: 'Units',
  loyalty: 'Loyalty',
  security: 'Security',
};
// Every other tab is visible on `${tab}.view` — Security edits the
// companies table directly (like Loyalty does under the hood), and
// that table is gated on companies.manage, not a security.view slug
// that doesn't exist. Visibility and edit rights are the same
// permission here on purpose: nobody should see a control they'd
// immediately get a 403 trying to use, the way Loyalty's own
// loyalty.manage/companies.manage split can (see LoyaltyTab).
const TAB_PERMISSIONS: Partial<Record<Tab, string>> = { security: 'companies.manage' };

export function SettingsScreen() {
  const { hasPermission } = useAuth();
  // A role can hold e.g. registers.view without stores.view — the tab
  // list (and the default landing tab) has to reflect whichever of the
  // four this particular user actually has, not always start on Stores.
  const availableTabs = TABS.filter((t) => hasPermission(TAB_PERMISSIONS[t] ?? `${t}.view`));
  const [tab, setTab] = useRouteState<Tab>(2, TABS, availableTabs[0] ?? 'stores', (t) => `/admin/settings/${t}`);

  // Guards a stale/bookmarked URL pointing at a tab this user has since
  // lost (or never had) access to — falls back to one they can actually see.
  useEffect(() => {
    if (availableTabs.length > 0 && !availableTabs.includes(tab)) {
      setTab(availableTabs[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, availableTabs.join(',')]);

  return (
    <div>
      <SectionTabs value={tab} onChange={setTab}>
        {availableTabs.map((t) => (
          <Tab key={t} value={t} label={TAB_LABELS[t]} />
        ))}
      </SectionTabs>

      {tab === 'stores' && hasPermission('stores.view') && <StoresTab />}
      {tab === 'registers' && hasPermission('registers.view') && <RegistersTab />}
      {tab === 'payment-methods' && hasPermission('payment-methods.view') && <PaymentMethodsTab />}
      {tab === 'taxes' && hasPermission('taxes.view') && <TaxesTab />}
      {tab === 'units' && hasPermission('units.view') && <UnitsTab />}
      {tab === 'loyalty' && hasPermission('loyalty.view') && <LoyaltyTab />}
      {tab === 'security' && hasPermission('companies.manage') && <SecurityTab />}
    </div>
  );
}

function StoresTab() {
  const { hasPermission } = useAuth();
  const confirm = useConfirm();
  const notify = useSnackbar();
  const [statusFilter, setStatusFilter] = useState('');
  const { data, meta, loading, error, page, setPage, perPage, setPerPage, sort, setSort, q, setQ, reload } = useList<Store>('/stores', {
    is_active: statusFilter,
  });

  const [editing, setEditing] = useState<Store | null>(null);
  const [viewing, setViewing] = useState<Store | null>(null);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({
    name: '', code: '', address: '', phone: '', email: '',
    receiptFooterNote: '', vatRegTin: '', posSerialNo: '', minNo: '', showBirDetails: true,
    is_active: true,
  });
  const [saving, setSaving] = useState(false);
  const { fieldErrors, formError, clearErrors, clearField, reportError } = useFormErrors();

  function openCreate() {
    setEditing(null);
    setForm({
      name: '', code: '', address: '', phone: '', email: '',
      receiptFooterNote: '', vatRegTin: '', posSerialNo: '', minNo: '', showBirDetails: true,
      is_active: true,
    });
    clearErrors();
    setShow(true);
  }

  function openEdit(store: Store) {
    setEditing(store);
    setForm({
      name: store.name,
      code: store.code,
      address: '',
      phone: '',
      email: '',
      receiptFooterNote: store.receipt_footer_note ?? '',
      vatRegTin: store.vat_reg_tin ?? '',
      posSerialNo: store.pos_serial_no ?? '',
      minNo: store.min_no ?? '',
      showBirDetails: Number(store.show_bir_details) === 1,
      is_active: Number(store.is_active) === 1,
    });
    clearErrors();
    setShow(true);
  }

  async function submit() {
    setSaving(true);
    clearErrors();
    const payload = {
      name: form.name,
      code: form.code,
      address: form.address || null,
      phone: form.phone || null,
      email: form.email || null,
      receipt_footer_note: form.receiptFooterNote || null,
      vat_reg_tin: form.vatRegTin || null,
      pos_serial_no: form.posSerialNo || null,
      min_no: form.minNo || null,
      show_bir_details: form.showBirDetails ? 1 : 0,
      is_active: form.is_active ? 1 : 0,
    };
    try {
      if (editing) await api.put(`/stores/${editing.id}`, payload);
      else await api.post('/stores', payload);
      setShow(false);
      reload();
      notify(editing ? 'Store updated' : 'Store created');
    } catch (err) {
      reportError(err, 'Failed to save store');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(store: Store) {
    const activating = Number(store.is_active) !== 1;
    const verb = activating ? 'Activate' : 'Deactivate';
    if (!(await confirm(`${verb} store "${store.name}"?`, { title: `${verb} Store`, confirmLabel: verb }))) return;
    try {
      await api.put(`/stores/${store.id}`, { is_active: activating ? 1 : 0 });
      reload();
      notify(`Store ${activating ? 'activated' : 'deactivated'}`);
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Failed to update store', 'error');
    }
  }

  const columns: Column<Store>[] = [
    { key: 'name', label: 'Name', sortKey: 'name' },
    { key: 'code', label: 'Code', sortKey: 'code', width: 160 },
    { key: 'vat_reg_tin', label: 'VAT Reg TIN', width: 150, render: (s) => s.vat_reg_tin ?? '—' },
    { key: 'pos_serial_no', label: 'POS Serial No', width: 150, render: (s) => s.pos_serial_no ?? '—' },
    { key: 'min_no', label: 'MIN No', width: 150, render: (s) => s.min_no ?? '—' },
    {
      key: 'show_bir_details',
      label: 'On Receipt',
      width: 130,
      // Grayed out rather than a plain dash when there's nothing to show
      // yet — "not printing" and "nothing entered" read as different
      // states at a glance, the same distinction the View modal draws.
      render: (s) =>
        !s.vat_reg_tin && !s.pos_serial_no && !s.min_no ? (
          <Typography variant="caption" color="text.disabled">
            —
          </Typography>
        ) : (
          <Chip
            size="small"
            label={Number(s.show_bir_details) === 1 ? 'Shown' : 'Hidden'}
            color={Number(s.show_bir_details) === 1 ? 'success' : 'default'}
          />
        ),
    },
    {
      key: 'is_active',
      label: 'Status',
      width: 120,
      render: (s) => (
        <Chip size="small" label={Number(s.is_active) === 1 ? 'Active' : 'Inactive'} color={Number(s.is_active) === 1 ? 'success' : 'default'} />
      ),
    },
  ];

  return (
    <div>
      <ListToolbar
        search={q}
        onSearchChange={setQ}
        onAdd={hasPermission('stores.manage') ? openCreate : undefined}
        addLabel="Add Store"
        onRefresh={reload}
        refreshing={loading}
        extra={
          <InlineSelectFilter
            label="Status"
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
      />

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
        rowActions={(s) => {
          const active = Number(s.is_active) === 1;
          return (
            <>
              <Tooltip title="View">
                <IconButton size="small" aria-label="View" onClick={() => setViewing(s)}>
                  <VisibilityOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              {hasPermission('stores.manage') && (
                <>
                  <Tooltip title="Edit">
                    <IconButton size="small" aria-label="Edit" onClick={() => openEdit(s)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={active ? 'Deactivate' : 'Activate'}>
                    <IconButton
                      size="small"
                      aria-label={active ? 'Deactivate' : 'Activate'}
                      color={active ? 'error' : 'success'}
                      onClick={() => toggleActive(s)}
                    >
                      {active ? <BlockIcon fontSize="small" /> : <CheckCircleIcon fontSize="small" />}
                    </IconButton>
                  </Tooltip>
                </>
              )}
            </>
          );
        }}
      />

      <Modal open={show} title={editing ? 'Edit Store' : 'Add Store'} onClose={() => setShow(false)} compact>
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Name"
                fullWidth
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
              <TextField
                label="Code"
                fullWidth
                value={form.code}
                onChange={(e) => {
                  setForm({ ...form, code: e.target.value });
                  clearField('code');
                }}
                error={!!fieldErrors?.code}
                helperText={fieldErrors?.code}
                required
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Address"
                fullWidth
                value={form.address}
                onChange={(e) => {
                  setForm({ ...form, address: e.target.value });
                  clearField('address');
                }}
                error={!!fieldErrors?.address}
                helperText={fieldErrors?.address}
              />
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
            {/* The three BIR-mandated identifiers a Philippine POS/CRM
                receipt must carry, grouped together and ahead of the free-
                text header note below — these are fixed accreditation
                numbers issued by BIR, not editorial content, so they read
                as a form section of their own rather than three more
                stray text fields. */}
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="VAT Reg TIN"
                fullWidth
                placeholder="123-456-789-000"
                value={form.vatRegTin}
                onChange={(e) => {
                  setForm({ ...form, vatRegTin: e.target.value });
                  clearField('vat_reg_tin');
                }}
                error={!!fieldErrors?.vat_reg_tin}
                helperText={fieldErrors?.vat_reg_tin}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="POS Serial No"
                fullWidth
                value={form.posSerialNo}
                onChange={(e) => {
                  setForm({ ...form, posSerialNo: e.target.value });
                  clearField('pos_serial_no');
                }}
                error={!!fieldErrors?.pos_serial_no}
                helperText={fieldErrors?.pos_serial_no}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="MIN No"
                fullWidth
                value={form.minNo}
                onChange={(e) => {
                  setForm({ ...form, minNo: e.target.value });
                  clearField('min_no');
                }}
                error={!!fieldErrors?.min_no}
                helperText={fieldErrors?.min_no ?? 'Machine Identification Number'}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              {/* Independent of whether the three fields above are filled
                  in — lets a store save its MIN/serial ahead of BIR
                  accreditation going live, or pull them off the receipt
                  temporarily, without losing the saved values either way.
                  Also hides the VAT/VAT Exempt/Zero Rated sales breakdown
                  further down the receipt (see ReceiptModal) — a store
                  hiding its identifiers almost never wants that breakdown
                  left showing on its own underneath them. */}
              <FormControlLabel
                control={
                  <Checkbox
                    checked={form.showBirDetails}
                    onChange={(e) => setForm({ ...form, showBirDetails: e.target.checked })}
                  />
                }
                label="Include VAT Reg TIN / POS Serial No / MIN No and the VAT sales breakdown on the printed receipt"
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              {/* Visually separated from the identifiers above, on purpose
                  — the receipt's header is a fixed structured block (name,
                  address, TIN, VAT Reg TIN, POS Serial No, MIN No), so a
                  free-text field sitting right under it read as if it were
                  part of that same header. This is a closing message
                  instead: it prints at the very bottom of the receipt. */}
              <Divider sx={{ my: 0.5 }} />
              <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mt: 1.5, mb: 1 }}>
                Receipt footer
              </Typography>
              <TextField
                label="Receipt footer note"
                fullWidth
                multiline
                minRows={2}
                value={form.receiptFooterNote}
                onChange={(e) => {
                  setForm({ ...form, receiptFooterNote: e.target.value });
                  clearField('receipt_footer_note');
                }}
                error={!!fieldErrors?.receipt_footer_note}
                helperText={
                  fieldErrors?.receipt_footer_note ??
                  'Printed at the bottom of this store’s receipts only — e.g. "Thank you, come again" or a return policy. Changing it only affects sales rung up after the change.'
                }
              />
            </Grid>
            {formError && (
              <Grid size={{ xs: 12 }}>
                <Alert severity="error">{formError}</Alert>
              </Grid>
            )}
            <Grid size={{ xs: 12 }}>
              <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'flex-end' }}>
                <Button type="button" variant="text" onClick={() => setShow(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="contained" disabled={saving}>
                  {saving ? 'Saving…' : 'Save'}
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </form>
      </Modal>

      <Modal open={!!viewing} title="View Store" onClose={() => setViewing(null)} compact>
        <DetailView
          fields={[
            { label: 'Name', value: viewing?.name },
            { label: 'Code', value: viewing?.code },
            { label: 'Status', value: viewing ? <StatusChip active={Number(viewing.is_active) === 1} /> : undefined },
            { label: 'VAT Reg TIN', value: viewing?.vat_reg_tin ?? '—' },
            { label: 'POS Serial No', value: viewing?.pos_serial_no ?? '—' },
            { label: 'MIN No', value: viewing?.min_no ?? '—' },
            {
              label: 'Shown on receipt',
              value: viewing ? (
                <Chip
                  size="small"
                  label={Number(viewing.show_bir_details) === 1 ? 'Yes' : 'No — saved but hidden'}
                  color={Number(viewing.show_bir_details) === 1 ? 'success' : 'default'}
                />
              ) : undefined,
            },
            {
              label: 'Receipt footer note',
              // white-space: pre-line so an entered line break (e.g.
              // separating a policy line from a slogan) actually shows
              // as two lines here, matching how it prints on the receipt.
              value: viewing?.receipt_footer_note ? (
                <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                  {viewing.receipt_footer_note}
                </Typography>
              ) : (
                '—'
              ),
            },
          ]}
        />
        <Stack direction="row" sx={{ justifyContent: 'flex-end', mt: 3 }}>
          <Button variant="text" onClick={() => setViewing(null)}>
            Close
          </Button>
        </Stack>
      </Modal>
    </div>
  );
}

function RegistersTab() {
  const { hasPermission } = useAuth();
  const confirm = useConfirm();
  const notify = useSnackbar();
  const [stores, setStores] = useState<Store[]>([]);
  const [storeFilter, setStoreFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const { data, meta, loading, error, page, setPage, perPage, setPerPage, sort, setSort, q, setQ, reload } = useList<Register>('/registers', {
    store_id: storeFilter,
    is_active: statusFilter,
  });

  const [editing, setEditing] = useState<Register | null>(null);
  const [viewing, setViewing] = useState<Register | null>(null);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ store_id: '', name: '', code: '', is_active: true });
  const [saving, setSaving] = useState(false);
  const { fieldErrors, formError, clearErrors, clearField, reportError } = useFormErrors();

  useEffect(() => {
    api.get<Store[]>('/registers/stores/assignable').then(setStores);
  }, []);

  const storeName = (id: number) => stores.find((s) => s.id === id)?.name ?? `#${id}`;

  function openCreate() {
    setEditing(null);
    setForm({ store_id: storeFilter, name: '', code: '', is_active: true });
    clearErrors();
    setShow(true);
  }

  function openEdit(register: Register) {
    setEditing(register);
    setForm({
      store_id: String(register.store_id),
      name: register.name,
      code: register.code,
      is_active: Number(register.is_active) === 1,
    });
    clearErrors();
    setShow(true);
  }

  async function submit() {
    setSaving(true);
    clearErrors();
    const payload = {
      store_id: Number(form.store_id),
      name: form.name,
      code: form.code,
      is_active: form.is_active ? 1 : 0,
    };
    try {
      if (editing) await api.put(`/registers/${editing.id}`, payload);
      else await api.post('/registers', payload);
      setShow(false);
      reload();
      notify(editing ? 'POS terminal updated' : 'POS terminal created');
    } catch (err) {
      reportError(err, 'Failed to save POS terminal');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(register: Register) {
    const activating = Number(register.is_active) !== 1;
    const verb = activating ? 'Activate' : 'Deactivate';
    if (!(await confirm(`${verb} POS terminal "${register.name}"?`, { title: `${verb} POS Terminal`, confirmLabel: verb }))) return;
    try {
      await api.put(`/registers/${register.id}`, { is_active: activating ? 1 : 0 });
      reload();
      notify(`POS terminal ${activating ? 'activated' : 'deactivated'}`);
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Failed to update POS terminal', 'error');
    }
  }

  const columns: Column<Register>[] = [
    { key: 'name', label: 'Name', sortKey: 'name' },
    { key: 'code', label: 'Code', sortKey: 'code', width: 160 },
    { key: 'store', label: 'Store', render: (r) => storeName(r.store_id) },
    {
      key: 'is_active',
      label: 'Status',
      width: 120,
      render: (r) => (
        <Chip size="small" label={Number(r.is_active) === 1 ? 'Active' : 'Inactive'} color={Number(r.is_active) === 1 ? 'success' : 'default'} />
      ),
    },
  ];

  return (
    <div>
      <ListToolbar
        search={q}
        onSearchChange={setQ}
        onAdd={hasPermission('registers.manage') ? openCreate : undefined}
        addLabel="Add POS Terminal"
        onRefresh={reload}
        refreshing={loading}
        extra={
          <Stack direction="row" spacing={1.5} sx={{ width: { xs: '100%', sm: 'auto' } }}>
            <InlineSelectFilter
              label="Store"
              compactOnMobile
              value={storeFilter}
              onChange={setStoreFilter}
              options={[{ value: '', label: 'All Stores' }, ...stores.map((s) => ({ value: String(s.id), label: s.name }))]}
            />
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
          </Stack>
        }
      />

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
        rowActions={(r) => {
          const active = Number(r.is_active) === 1;
          return (
            <>
              <Tooltip title="View">
                <IconButton size="small" aria-label="View" onClick={() => setViewing(r)}>
                  <VisibilityOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              {hasPermission('registers.manage') && (
                <>
                  <Tooltip title="Edit">
                    <IconButton size="small" aria-label="Edit" onClick={() => openEdit(r)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={active ? 'Deactivate' : 'Activate'}>
                    <IconButton
                      size="small"
                      aria-label={active ? 'Deactivate' : 'Activate'}
                      color={active ? 'error' : 'success'}
                      onClick={() => toggleActive(r)}
                    >
                      {active ? <BlockIcon fontSize="small" /> : <CheckCircleIcon fontSize="small" />}
                    </IconButton>
                  </Tooltip>
                </>
              )}
            </>
          );
        }}
      />

      <Modal open={show} title={editing ? 'Edit POS Terminal' : 'Add POS Terminal'} onClose={() => setShow(false)} compact>
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid size={{ xs: 12 }}>
              <SearchableSelect
                label="Store"
                fullWidth
                value={form.store_id}
                onChange={(v) => {
                  setForm({ ...form, store_id: v });
                  clearField('store_id');
                }}
                error={!!fieldErrors?.store_id}
                helperText={fieldErrors?.store_id}
                required
                options={[{ value: '', label: '— Select —' }, ...stores.map((s) => ({ value: String(s.id), label: s.name }))]}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Name"
                fullWidth
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
              <TextField
                label="Code"
                fullWidth
                value={form.code}
                onChange={(e) => {
                  setForm({ ...form, code: e.target.value });
                  clearField('code');
                }}
                error={!!fieldErrors?.code}
                helperText={fieldErrors?.code}
                required
              />
            </Grid>
            {formError && (
              <Grid size={{ xs: 12 }}>
                <Alert severity="error">{formError}</Alert>
              </Grid>
            )}
            <Grid size={{ xs: 12 }}>
              <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'flex-end' }}>
                <Button type="button" variant="text" onClick={() => setShow(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="contained" disabled={saving}>
                  {saving ? 'Saving…' : 'Save'}
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </form>
      </Modal>

      <Modal open={!!viewing} title="View POS Terminal" onClose={() => setViewing(null)} compact>
        <DetailView
          fields={[
            { label: 'Name', value: viewing?.name },
            { label: 'Code', value: viewing?.code },
            { label: 'Store', value: viewing ? storeName(viewing.store_id) : undefined },
            { label: 'Status', value: viewing ? <StatusChip active={Number(viewing.is_active) === 1} /> : undefined },
          ]}
        />
        <Stack direction="row" sx={{ justifyContent: 'flex-end', mt: 3 }}>
          <Button variant="text" onClick={() => setViewing(null)}>
            Close
          </Button>
        </Stack>
      </Modal>
    </div>
  );
}

/** V / E / Z / N — the flag a BIR receipt prints beside each line so a customer can see how that item was taxed. Colour-coded so the vatable case (the one that actually carries tax) stands apart from the three zero-tax classifications at a glance. */
const TAX_INDICATOR_META: Record<string, { label: string; color: 'primary' | 'success' | 'info' | 'default' }> = {
  V: { label: 'VATable', color: 'primary' },
  E: { label: 'VAT-Exempt', color: 'success' },
  Z: { label: 'Zero-Rated', color: 'info' },
  N: { label: 'Non-VAT', color: 'default' },
};

function TaxIndicatorChip({ indicator }: { indicator: string }) {
  const meta = TAX_INDICATOR_META[indicator] ?? { label: indicator, color: 'default' as const };
  return (
    <Tooltip title={meta.label}>
      <Chip
        size="small"
        label={indicator}
        color={meta.color}
        sx={{ fontWeight: 800, width: 30, '& .MuiChip-label': { px: 0 } }}
      />
    </Tooltip>
  );
}

function TaxesTab() {
  const { hasPermission } = useAuth();
  const confirm = useConfirm();
  const notify = useSnackbar();
  const [statusFilter, setStatusFilter] = useState('');
  const { data, meta, loading, error, page, setPage, perPage, setPerPage, sort, setSort, q, setQ, reload } = useList<TaxRate>('/taxes', {
    is_active: statusFilter,
  });

  const [show, setShow] = useState(false);
  const [viewing, setViewing] = useState<TaxRate | null>(null);
  const [form, setForm] = useState({ name: '', rate: '0', is_default: false, is_active: true });
  const [saving, setSaving] = useState(false);
  const { fieldErrors, formError, clearErrors, clearField, reportError } = useFormErrors();

  function openCreate() {
    setForm({ name: '', rate: '0', is_default: false, is_active: true });
    clearErrors();
    setShow(true);
  }

  async function submit() {
    setSaving(true);
    clearErrors();
    try {
      await api.post('/taxes', {
        name: form.name,
        rate: form.rate,
        is_default: form.is_default ? 1 : 0,
        is_active: form.is_active ? 1 : 0,
      });
      setShow(false);
      reload();
      notify('Tax rate created');
    } catch (err) {
      reportError(err, 'Failed to save tax rate');
    } finally {
      setSaving(false);
    }
  }

  async function remove(tax: TaxRate) {
    if (!(await confirm(`Delete tax rate "${tax.name}"?`, { title: 'Delete Tax Rate', confirmLabel: 'Delete' }))) return;
    try {
      await api.del(`/taxes/${tax.id}`);
      reload();
      notify('Tax rate deleted');
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Failed to delete tax rate', 'error');
    }
  }

  const columns: Column<TaxRate>[] = [
    {
      key: 'indicator',
      label: 'Flag',
      width: 72,
      // Not sortable: it's derived server-side per row (TaxService::
      // indicator), so there's no column behind it for the API to ORDER BY.
      render: (t) => (t.indicator ? <TaxIndicatorChip indicator={t.indicator} /> : '—'),
    },
    { key: 'name', label: 'Name', sortKey: 'name' },
    { key: 'rate', label: 'Rate', align: 'right', sortKey: 'rate', width: 100, render: (t) => `${t.rate}%` },
    { key: 'is_default', label: 'Default', width: 100, render: (t) => (Number(t.is_default) === 1 ? 'Yes' : '—') },
  ];

  return (
    <div>
      <ListToolbar
        search={q}
        onSearchChange={setQ}
        onAdd={hasPermission('taxes.manage') ? openCreate : undefined}
        addLabel="Add Tax Rate"
        onRefresh={reload}
        refreshing={loading}
        extra={
          <InlineSelectFilter
            label="Status"
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
      />

      <DataTable
        columns={columns}
        rows={data}
        rowKey={(t) => t.id}
        loading={loading}
        error={error}
        meta={meta}
        page={page}
        onPageChange={setPage}
        perPage={perPage}
        onPerPageChange={setPerPage}
        sort={sort}
        onSortChange={setSort}
        rowActions={(t) => (
          <>
            <Tooltip title="View">
              <IconButton size="small" aria-label="View" onClick={() => setViewing(t)}>
                <VisibilityOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            {hasPermission('taxes.manage') && (
              <Tooltip title="Delete">
                <IconButton size="small" aria-label="Delete" color="error" onClick={() => remove(t)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </>
        )}
      />

      <Modal open={show} title="Add Tax Rate" onClose={() => setShow(false)} compact>
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Name"
                fullWidth
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
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Rate (%)"
                type="number"
                fullWidth
                slotProps={{ htmlInput: { step: '0.01' } }}
                value={form.rate}
                onChange={(e) => {
                  setForm({ ...form, rate: e.target.value });
                  clearField('rate');
                }}
                error={!!fieldErrors?.rate}
                helperText={fieldErrors?.rate}
                required
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControlLabel
                control={<Checkbox checked={form.is_default} onChange={(e) => setForm({ ...form, is_default: e.target.checked })} />}
                label="Default"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControlLabel
                control={<Checkbox checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />}
                label="Active"
              />
            </Grid>
            {formError && (
              <Grid size={{ xs: 12 }}>
                <Alert severity="error">{formError}</Alert>
              </Grid>
            )}
            <Grid size={{ xs: 12 }}>
              <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'flex-end' }}>
                <Button type="button" variant="text" onClick={() => setShow(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="contained" disabled={saving}>
                  {saving ? 'Saving…' : 'Save'}
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </form>
      </Modal>

      <Modal open={!!viewing} title="View Tax Rate" onClose={() => setViewing(null)} compact>
        <DetailView
          fields={[
            { label: 'Name', value: viewing?.name },
            {
              label: 'Receipt flag',
              value:
                viewing?.indicator !== undefined ? (
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <TaxIndicatorChip indicator={viewing.indicator} />
                    <Typography variant="body2" color="text.secondary">
                      {TAX_INDICATOR_META[viewing.indicator]?.label}
                    </Typography>
                  </Stack>
                ) : undefined,
            },
            { label: 'Rate', value: viewing ? `${viewing.rate}%` : undefined },
            { label: 'Default', value: viewing ? (Number(viewing.is_default) === 1 ? 'Yes' : 'No') : undefined },
          ]}
        />
        <Stack direction="row" sx={{ justifyContent: 'flex-end', mt: 3 }}>
          <Button variant="text" onClick={() => setViewing(null)}>
            Close
          </Button>
        </Stack>
      </Modal>
    </div>
  );
}

/**
 * `code` (what's actually stored on payments.method, and what
 * CashSessionsController's drawer math keys off for 'cash' specifically)
 * is server-derived from `name` and never shown as an editable field here
 * — see PaymentMethodsController. Deactivating/deleting Cash is rejected
 * server-side with a clear message; deliberately not re-checked here too,
 * so there's exactly one place that decides it's protected.
 */
function PaymentMethodsTab() {
  const { hasPermission } = useAuth();
  const confirm = useConfirm();
  const notify = useSnackbar();
  const [statusFilter, setStatusFilter] = useState('');
  const { data, meta, loading, error, page, setPage, perPage, setPerPage, sort, setSort, q, setQ, reload } = useList<PaymentMethodOption>('/payment-methods', {
    is_active: statusFilter,
  });

  const [editing, setEditing] = useState<PaymentMethodOption | null>(null);
  const [viewing, setViewing] = useState<PaymentMethodOption | null>(null);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ name: '', is_active: true });
  const [saving, setSaving] = useState(false);
  const { fieldErrors, formError, clearErrors, clearField, reportError } = useFormErrors();

  function openCreate() {
    setEditing(null);
    setForm({ name: '', is_active: true });
    clearErrors();
    setShow(true);
  }

  function openEdit(method: PaymentMethodOption) {
    setEditing(method);
    setForm({ name: method.name, is_active: Number(method.is_active) === 1 });
    clearErrors();
    setShow(true);
  }

  async function submit() {
    setSaving(true);
    clearErrors();
    const payload = { name: form.name, is_active: form.is_active ? 1 : 0 };
    try {
      if (editing) await api.put(`/payment-methods/${editing.id}`, payload);
      else await api.post('/payment-methods', payload);
      setShow(false);
      reload();
      notify(editing ? 'Payment method updated' : 'Payment method created');
    } catch (err) {
      reportError(err, 'Failed to save payment method');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(method: PaymentMethodOption) {
    const activating = Number(method.is_active) !== 1;
    const verb = activating ? 'Activate' : 'Deactivate';
    if (!(await confirm(`${verb} payment method "${method.name}"?`, { title: `${verb} Payment Method`, confirmLabel: verb }))) return;
    try {
      await api.put(`/payment-methods/${method.id}`, { is_active: activating ? 1 : 0 });
      reload();
      notify(`Payment method ${activating ? 'activated' : 'deactivated'}`);
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Failed to update payment method', 'error');
    }
  }

  async function remove(method: PaymentMethodOption) {
    if (!(await confirm(`Delete payment method "${method.name}"?`, { title: 'Delete Payment Method', confirmLabel: 'Delete' }))) return;
    try {
      await api.del(`/payment-methods/${method.id}`);
      reload();
      notify('Payment method deleted');
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Failed to delete payment method', 'error');
    }
  }

  const columns: Column<PaymentMethodOption>[] = [
    { key: 'name', label: 'Name', sortKey: 'name' },
    {
      key: 'is_active',
      label: 'Status',
      width: 120,
      render: (m) => (
        <Chip size="small" label={Number(m.is_active) === 1 ? 'Active' : 'Inactive'} color={Number(m.is_active) === 1 ? 'success' : 'default'} />
      ),
    },
  ];

  return (
    <div>
      <ListToolbar
        search={q}
        onSearchChange={setQ}
        onAdd={hasPermission('payment-methods.manage') ? openCreate : undefined}
        addLabel="Add Payment Method"
        onRefresh={reload}
        refreshing={loading}
        extra={
          <InlineSelectFilter
            label="Status"
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
      />

      <DataTable
        columns={columns}
        rows={data}
        rowKey={(m) => m.id}
        loading={loading}
        error={error}
        meta={meta}
        page={page}
        onPageChange={setPage}
        perPage={perPage}
        onPerPageChange={setPerPage}
        sort={sort}
        onSortChange={setSort}
        rowActions={(m) => {
          const active = Number(m.is_active) === 1;
          return (
            <>
              <Tooltip title="View">
                <IconButton size="small" aria-label="View" onClick={() => setViewing(m)}>
                  <VisibilityOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              {hasPermission('payment-methods.manage') && (
                <>
                  <Tooltip title="Edit">
                    <IconButton size="small" aria-label="Edit" onClick={() => openEdit(m)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={active ? 'Deactivate' : 'Activate'}>
                    <IconButton
                      size="small"
                      aria-label={active ? 'Deactivate' : 'Activate'}
                      color={active ? 'error' : 'success'}
                      onClick={() => toggleActive(m)}
                    >
                      {active ? <BlockIcon fontSize="small" /> : <CheckCircleIcon fontSize="small" />}
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton size="small" aria-label="Delete" color="error" onClick={() => remove(m)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </>
              )}
            </>
          );
        }}
      />

      <Modal open={show} title={editing ? 'Edit Payment Method' : 'Add Payment Method'} onClose={() => setShow(false)} compact>
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Name"
                fullWidth
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
            <Grid size={{ xs: 12 }}>
              <FormControlLabel
                control={<Checkbox checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />}
                label="Active"
              />
            </Grid>
            {formError && (
              <Grid size={{ xs: 12 }}>
                <Alert severity="error">{formError}</Alert>
              </Grid>
            )}
            <Grid size={{ xs: 12 }}>
              <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'flex-end' }}>
                <Button type="button" variant="text" onClick={() => setShow(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="contained" disabled={saving}>
                  {saving ? 'Saving…' : 'Save'}
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </form>
      </Modal>

      <Modal open={!!viewing} title="View Payment Method" onClose={() => setViewing(null)} compact>
        <DetailView
          fields={[
            { label: 'Name', value: viewing?.name },
            { label: 'Code', value: viewing?.code },
            { label: 'Status', value: viewing ? <StatusChip active={Number(viewing.is_active) === 1} /> : undefined },
          ]}
        />
        <Stack direction="row" sx={{ justifyContent: 'flex-end', mt: 3 }}>
          <Button variant="text" onClick={() => setViewing(null)}>
            Close
          </Button>
        </Stack>
      </Modal>
    </div>
  );
}

function UnitsTab() {
  const { hasPermission } = useAuth();
  const confirm = useConfirm();
  const notify = useSnackbar();
  const { data, meta, loading, error, page, setPage, perPage, setPerPage, sort, setSort, q, setQ, reload } = useList<Unit>('/units');

  const [show, setShow] = useState(false);
  const [viewing, setViewing] = useState<Unit | null>(null);
  const [form, setForm] = useState({ name: '', abbreviation: '', decimal_places: '0' });
  const [saving, setSaving] = useState(false);
  const { fieldErrors, formError, clearErrors, clearField, reportError } = useFormErrors();

  function openCreate() {
    setForm({ name: '', abbreviation: '', decimal_places: '0' });
    clearErrors();
    setShow(true);
  }

  async function submit() {
    setSaving(true);
    clearErrors();
    try {
      await api.post('/units', {
        name: form.name,
        abbreviation: form.abbreviation,
        decimal_places: Number(form.decimal_places),
      });
      setShow(false);
      reload();
      notify('Unit created');
    } catch (err) {
      reportError(err, 'Failed to save unit');
    } finally {
      setSaving(false);
    }
  }

  async function remove(unit: Unit) {
    if (!(await confirm(`Delete unit "${unit.name}"?`, { title: 'Delete Unit', confirmLabel: 'Delete' }))) return;
    try {
      await api.del(`/units/${unit.id}`);
      reload();
      notify('Unit deleted');
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Failed to delete unit', 'error');
    }
  }

  const columns: Column<Unit>[] = [
    { key: 'name', label: 'Name', sortKey: 'name' },
    { key: 'abbreviation', label: 'Abbreviation', width: 160 },
    { key: 'decimal_places', label: 'Decimal Places', align: 'right', width: 160 },
  ];

  return (
    <div>
      <ListToolbar
        search={q}
        onSearchChange={setQ}
        onAdd={hasPermission('units.manage') ? openCreate : undefined}
        addLabel="Add Unit"
        onRefresh={reload}
        refreshing={loading}
      />

      <DataTable
        columns={columns}
        rows={data}
        rowKey={(u) => u.id}
        loading={loading}
        error={error}
        meta={meta}
        page={page}
        onPageChange={setPage}
        perPage={perPage}
        onPerPageChange={setPerPage}
        sort={sort}
        onSortChange={setSort}
        rowActions={(u) => (
          <>
            <Tooltip title="View">
              <IconButton size="small" aria-label="View" onClick={() => setViewing(u)}>
                <VisibilityOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            {hasPermission('units.manage') && (
              <Tooltip title="Delete">
                <IconButton size="small" aria-label="Delete" color="error" onClick={() => remove(u)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </>
        )}
      />

      <Modal open={show} title="Add Unit" onClose={() => setShow(false)} compact>
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Name"
                fullWidth
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
              <TextField
                label="Abbreviation"
                fullWidth
                value={form.abbreviation}
                onChange={(e) => {
                  setForm({ ...form, abbreviation: e.target.value });
                  clearField('abbreviation');
                }}
                error={!!fieldErrors?.abbreviation}
                helperText={fieldErrors?.abbreviation}
                required
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Decimal Places"
                type="number"
                fullWidth
                slotProps={{ htmlInput: { min: '0', max: '4' } }}
                value={form.decimal_places}
                onChange={(e) => {
                  setForm({ ...form, decimal_places: e.target.value });
                  clearField('decimal_places');
                }}
                error={!!fieldErrors?.decimal_places}
                helperText={fieldErrors?.decimal_places}
              />
            </Grid>
            {formError && (
              <Grid size={{ xs: 12 }}>
                <Alert severity="error">{formError}</Alert>
              </Grid>
            )}
            <Grid size={{ xs: 12 }}>
              <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'flex-end' }}>
                <Button type="button" variant="text" onClick={() => setShow(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="contained" disabled={saving}>
                  {saving ? 'Saving…' : 'Save'}
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </form>
      </Modal>

      <Modal open={!!viewing} title="View Unit" onClose={() => setViewing(null)} compact>
        <DetailView
          fields={[
            { label: 'Name', value: viewing?.name },
            { label: 'Abbreviation', value: viewing?.abbreviation },
            { label: 'Decimal Places', value: viewing?.decimal_places },
          ]}
        />
        <Stack direction="row" sx={{ justifyContent: 'flex-end', mt: 3 }}>
          <Button variant="text" onClick={() => setViewing(null)}>
            Close
          </Button>
        </Stack>
      </Modal>
    </div>
  );
}

/**
 * A single flat, company-wide rate — "N points per ₱100 of a sale's
 * total" — rather than a list, so this tab is just one form instead of
 * the Add/Edit-modal-over-a-table pattern every other tab here uses.
 * SalesController::create() reads this same column to award points
 * automatically at checkout when a customer is attached to the sale.
 */
function LoyaltyTab() {
  const { user, hasPermission } = useAuth();
  const notify = useSnackbar();
  const canManage = hasPermission('loyalty.manage');
  const [company, setCompany] = useState<Company | null>(null);
  const [rate, setRate] = useState('0');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { fieldErrors, formError, clearErrors, clearField, reportError } = useFormErrors();

  useEffect(() => {
    if (!user?.company_id) return;
    api
      .get<Company>(`/companies/${user.company_id}`)
      .then((c) => {
        setCompany(c);
        setRate(String(c.loyalty_points_per_100));
      })
      .finally(() => setLoading(false));
  }, [user?.company_id]);

  async function submit() {
    if (!company) return;
    setSaving(true);
    clearErrors();
    try {
      const updated = await api.put<Company>(`/companies/${company.id}`, { loyalty_points_per_100: rate || '0' });
      setCompany(updated);
      setRate(String(updated.loyalty_points_per_100));
      notify('Loyalty settings updated');
    } catch (err) {
      reportError(err, 'Failed to save loyalty settings');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Stack sx={{ alignItems: 'center', py: 6 }}>
        <CircularProgress size={22} />
      </Stack>
    );
  }

  return (
    <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, maxWidth: 520 }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 2 }}>
        <LoyaltyOutlinedIcon color="primary" />
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          Points earned per sale
        </Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Every completed sale with a customer attached automatically earns them this many points per ₱100 of the sale
        total — set to 0 to turn off automatic earning (points can still be adjusted manually from a customer's Points
        History).
      </Typography>

      <TextField
        label="Points per ₱100"
        type="number"
        fullWidth
        disabled={!canManage}
        value={rate}
        onChange={(e) => {
          setRate(e.target.value);
          clearField('loyalty_points_per_100');
        }}
        error={!!fieldErrors?.loyalty_points_per_100}
        helperText={fieldErrors?.loyalty_points_per_100}
        slotProps={{ htmlInput: { min: 0, step: 1 }, input: { endAdornment: <InputAdornment position="end">pts</InputAdornment> } }}
      />

      {formError && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {formError}
        </Alert>
      )}

      {canManage && (
        <Stack direction="row" sx={{ justifyContent: 'flex-end', mt: 3 }}>
          <Button variant="contained" onClick={submit} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </Stack>
      )}
    </Paper>
  );
}

/**
 * A single toggle on the same company row Loyalty edits — see
 * Company::require_item_void_approval / require_cancel_approval.
 * Kept as its own tab (not a checkbox
 * bolted onto Loyalty) since it's a security policy decision rather than
 * a pricing/rewards one, and gated on companies.manage end to end: this
 * is the flag that decides whether cashiers can bypass a supervisor at
 * all, so unlike Loyalty there's no separate lighter-weight permission
 * for it.
 */
function SecurityTab() {
  const { user } = useAuth();
  const notify = useSnackbar();
  const [company, setCompany] = useState<Company | null>(null);
  const [itemVoid, setItemVoid] = useState(false);
  const [cancel, setCancel] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.company_id) return;
    api
      .get<Company>(`/companies/${user.company_id}`)
      .then((c) => {
        setCompany(c);
        setItemVoid(Number(c.require_item_void_approval) === 1);
        setCancel(Number(c.require_cancel_approval) === 1);
      })
      .finally(() => setLoading(false));
  }, [user?.company_id]);

  async function toggle(field: 'require_item_void_approval' | 'require_cancel_approval', next: boolean) {
    if (!company) return;
    const setter = field === 'require_item_void_approval' ? setItemVoid : setCancel;
    // Optimistic, then reconciled from the response — a Switch that waits
    // for the round trip before moving reads as broken/laggy for something
    // this immediate.
    setter(next);
    setSaving(true);
    try {
      const updated = await api.put<Company>(`/companies/${company.id}`, { [field]: next ? 1 : 0 });
      setCompany(updated);
      setItemVoid(Number(updated.require_item_void_approval) === 1);
      setCancel(Number(updated.require_cancel_approval) === 1);
      notify('Security settings updated');
    } catch (err) {
      setter(!next);
      notify(err instanceof ApiError ? err.message : 'Failed to save security settings', 'error');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Stack sx={{ alignItems: 'center', py: 6 }}>
        <CircularProgress size={22} />
      </Stack>
    );
  }

  return (
    <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, maxWidth: 620 }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 2 }}>
        <ShieldOutlinedIcon color="primary" />
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          Void / cancel approval
        </Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        When a switch is on, the cashier must have a supervisor (someone with the Void Sales permission) enter their own
        username and password before the action goes through. Either way the cashier picks a reason, and every void,
        cancellation, and denied attempt is recorded in the Audit Trail — turning a switch off changes who signs for it,
        never whether it is recorded. Void counts and totals per shift also appear on the Close Terminal screen.
      </Typography>

      <Stack spacing={1.5}>
        <SecurityToggle
          title="Voiding a single item"
          detail="Mis-scans are constant, so gating each one tends to end with the supervisor's password being shared — which removes the control and the attribution together. Recommended off."
          checked={itemVoid}
          disabled={saving}
          onChange={(v) => toggle('require_item_void_approval', v)}
        />
        <SecurityToggle
          title="Cancelling an entire sale"
          detail="Rare and high-signal, so the friction is cheap and the alarm means something. Recommended on."
          checked={cancel}
          disabled={saving}
          onChange={(v) => toggle('require_cancel_approval', v)}
        />
      </Stack>
    </Paper>
  );
}

function SecurityToggle({
  title,
  detail,
  checked,
  disabled,
  onChange,
}: {
  title: string;
  detail: string;
  checked: boolean;
  disabled: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <Stack
      direction="row"
      spacing={2}
      sx={{ alignItems: 'center', justifyContent: 'space-between', p: 2, borderRadius: 2, bgcolor: 'action.hover' }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontWeight: 700 }}>{title}</Typography>
        <Typography variant="caption" color="text.secondary">
          {detail}
        </Typography>
      </Box>
      <Switch checked={checked} onChange={(e) => onChange(e.target.checked)} disabled={disabled} />
    </Stack>
  );
}
