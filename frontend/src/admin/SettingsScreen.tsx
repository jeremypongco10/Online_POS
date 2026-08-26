import { useEffect, useState } from 'react';
import { api, ApiError } from '../api/client';
import type { Register, Store, TaxRate, Unit } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { useConfirm } from '../ConfirmDialog';
import { useSnackbar } from '../Snackbar';
import { useList } from './useList';
import { useFormErrors } from './useFormErrors';
import { DataTable, type Column } from './DataTable';
import { ListToolbar } from './ListToolbar';
import { Modal } from './Modal';
import { DetailView, StatusChip } from './DetailView';
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
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { useRouteState } from '../routing';

type Tab = 'stores' | 'registers' | 'taxes' | 'units';
const TABS: Tab[] = ['stores', 'registers', 'taxes', 'units'];
const TAB_LABELS: Record<Tab, string> = { stores: 'Stores', registers: 'Registers', taxes: 'Taxes', units: 'Units' };

export function SettingsScreen() {
  const { hasPermission } = useAuth();
  // A role can hold e.g. registers.view without stores.view — the tab
  // list (and the default landing tab) has to reflect whichever of the
  // four this particular user actually has, not always start on Stores.
  const availableTabs = TABS.filter((t) => hasPermission(`${t}.view`));
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
      {tab === 'taxes' && hasPermission('taxes.view') && <TaxesTab />}
      {tab === 'units' && hasPermission('units.view') && <UnitsTab />}
    </div>
  );
}

function StoresTab() {
  const { hasPermission } = useAuth();
  const confirm = useConfirm();
  const notify = useSnackbar();
  const { data, meta, loading, error, page, setPage, perPage, setPerPage, sort, setSort, q, setQ, reload } = useList<Store>('/stores');

  const [editing, setEditing] = useState<Store | null>(null);
  const [viewing, setViewing] = useState<Store | null>(null);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', address: '', phone: '', email: '', is_active: true });
  const [saving, setSaving] = useState(false);
  const { fieldErrors, formError, clearErrors, clearField, reportError } = useFormErrors();

  function openCreate() {
    setEditing(null);
    setForm({ name: '', code: '', address: '', phone: '', email: '', is_active: true });
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
  const { data, meta, loading, error, page, setPage, perPage, setPerPage, sort, setSort, q, setQ, reload } = useList<Register>('/registers', {
    store_id: storeFilter,
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
      notify(editing ? 'Register updated' : 'Register created');
    } catch (err) {
      reportError(err, 'Failed to save register');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(register: Register) {
    const activating = Number(register.is_active) !== 1;
    const verb = activating ? 'Activate' : 'Deactivate';
    if (!(await confirm(`${verb} register "${register.name}"?`, { title: `${verb} Register`, confirmLabel: verb }))) return;
    try {
      await api.put(`/registers/${register.id}`, { is_active: activating ? 1 : 0 });
      reload();
      notify(`Register ${activating ? 'activated' : 'deactivated'}`);
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Failed to update register', 'error');
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
        addLabel="Add Register"
        onRefresh={reload}
        refreshing={loading}
        extra={
          <InlineSelectFilter
            label="Store"
            value={storeFilter}
            onChange={setStoreFilter}
            options={[{ value: '', label: 'All Stores' }, ...stores.map((s) => ({ value: String(s.id), label: s.name }))]}
          />
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

      <Modal open={show} title={editing ? 'Edit Register' : 'Add Register'} onClose={() => setShow(false)} compact>
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

      <Modal open={!!viewing} title="View Register" onClose={() => setViewing(null)} compact>
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

function TaxesTab() {
  const { hasPermission } = useAuth();
  const confirm = useConfirm();
  const notify = useSnackbar();
  const { data, meta, loading, error, page, setPage, perPage, setPerPage, sort, setSort, q, setQ, reload } = useList<TaxRate>('/taxes');

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
