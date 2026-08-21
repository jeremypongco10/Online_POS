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
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useRouteState } from '../routing';

type Tab = 'stores' | 'registers' | 'taxes' | 'units';
const TABS: Tab[] = ['stores', 'registers', 'taxes', 'units'];

export function SettingsScreen() {
  const [tab, setTab] = useRouteState<Tab>(2, TABS, 'stores', (t) => `/admin/settings/${t}`);

  return (
    <div>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline', mb: 2.25 }}>
        <Typography variant="h5">Settings</Typography>
      </Stack>

      <Tabs
        value={tab}
        onChange={(_, value) => setTab(value)}
        sx={{ mb: 2.25, borderBottom: '1px solid', borderColor: 'divider', minHeight: 40 }}
      >
        <Tab value="stores" label="Stores" sx={{ minHeight: 40, textTransform: 'none' }} />
        <Tab value="registers" label="Registers" sx={{ minHeight: 40, textTransform: 'none' }} />
        <Tab value="taxes" label="Taxes" sx={{ minHeight: 40, textTransform: 'none' }} />
        <Tab value="units" label="Units" sx={{ minHeight: 40, textTransform: 'none' }} />
      </Tabs>

      {tab === 'stores' && <StoresTab />}
      {tab === 'registers' && <RegistersTab />}
      {tab === 'taxes' && <TaxesTab />}
      {tab === 'units' && <UnitsTab />}
    </div>
  );
}

function StoresTab() {
  const { hasPermission } = useAuth();
  const confirm = useConfirm();
  const notify = useSnackbar();
  const { data, meta, loading, error, page, setPage, perPage, setPerPage, sort, setSort, q, setQ, reload } = useList<Store>('/stores');

  const [editing, setEditing] = useState<Store | null>(null);
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

  async function remove(store: Store) {
    if (!(await confirm(`Delete store "${store.name}"?`, { title: 'Delete Store', confirmLabel: 'Delete' }))) return;
    try {
      await api.del(`/stores/${store.id}`);
      reload();
      notify('Store deleted');
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Failed to delete store', 'error');
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
        rowActions={
          hasPermission('stores.manage')
            ? (s) => (
                <>
                  <IconButton size="small" aria-label="Edit" onClick={() => openEdit(s)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" aria-label="Delete" color="error" onClick={() => remove(s)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </>
              )
            : undefined
        }
      />

      <Modal open={show} title={editing ? 'Edit Store' : 'Add Store'} onClose={() => setShow(false)}>
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

  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ store_id: '', name: '', code: '', is_active: true });
  const [saving, setSaving] = useState(false);
  const { fieldErrors, formError, clearErrors, clearField, reportError } = useFormErrors();

  useEffect(() => {
    api.get<Store[]>('/stores?per_page=100').then(setStores);
  }, []);

  const storeName = (id: number) => stores.find((s) => s.id === id)?.name ?? `#${id}`;

  function openCreate() {
    setForm({ store_id: storeFilter, name: '', code: '', is_active: true });
    clearErrors();
    setShow(true);
  }

  async function submit() {
    setSaving(true);
    clearErrors();
    try {
      await api.post('/registers', {
        store_id: Number(form.store_id),
        name: form.name,
        code: form.code,
        is_active: form.is_active ? 1 : 0,
      });
      setShow(false);
      reload();
      notify('Register created');
    } catch (err) {
      reportError(err, 'Failed to save register');
    } finally {
      setSaving(false);
    }
  }

  async function remove(register: Register) {
    if (!(await confirm(`Delete register "${register.name}"?`, { title: 'Delete Register', confirmLabel: 'Delete' }))) return;
    try {
      await api.del(`/registers/${register.id}`);
      reload();
      notify('Register deleted');
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Failed to delete register', 'error');
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
          <TextField select value={storeFilter} onChange={(e) => setStoreFilter(e.target.value)} sx={{ minWidth: 180 }}>
            <MenuItem value="">All Stores</MenuItem>
            {stores.map((s) => (
              <MenuItem key={s.id} value={s.id}>
                {s.name}
              </MenuItem>
            ))}
          </TextField>
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
        rowActions={
          hasPermission('registers.manage')
            ? (r) => (
                <IconButton size="small" aria-label="Delete" color="error" onClick={() => remove(r)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              )
            : undefined
        }
      />

      <Modal open={show} title="Add Register" onClose={() => setShow(false)}>
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
                select
                label="Store"
                fullWidth
                value={form.store_id}
                onChange={(e) => {
                  setForm({ ...form, store_id: e.target.value });
                  clearField('store_id');
                }}
                error={!!fieldErrors?.store_id}
                helperText={fieldErrors?.store_id}
                required
              >
                <MenuItem value="">— Select —</MenuItem>
                {stores.map((s) => (
                  <MenuItem key={s.id} value={s.id}>
                    {s.name}
                  </MenuItem>
                ))}
              </TextField>
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
    </div>
  );
}

function TaxesTab() {
  const { hasPermission } = useAuth();
  const confirm = useConfirm();
  const notify = useSnackbar();
  const { data, meta, loading, error, page, setPage, perPage, setPerPage, sort, setSort, q, setQ, reload } = useList<TaxRate>('/taxes');

  const [show, setShow] = useState(false);
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
        rowActions={
          hasPermission('taxes.manage')
            ? (t) => (
                <IconButton size="small" aria-label="Delete" color="error" onClick={() => remove(t)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              )
            : undefined
        }
      />

      <Modal open={show} title="Add Tax Rate" onClose={() => setShow(false)}>
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
    </div>
  );
}

function UnitsTab() {
  const { hasPermission } = useAuth();
  const confirm = useConfirm();
  const notify = useSnackbar();
  const { data, meta, loading, error, page, setPage, perPage, setPerPage, sort, setSort, q, setQ, reload } = useList<Unit>('/units');

  const [show, setShow] = useState(false);
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
        rowActions={
          hasPermission('units.manage')
            ? (u) => (
                <IconButton size="small" aria-label="Delete" color="error" onClick={() => remove(u)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              )
            : undefined
        }
      />

      <Modal open={show} title="Add Unit" onClose={() => setShow(false)}>
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
    </div>
  );
}
