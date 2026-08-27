import { useEffect, useState, type ReactNode } from 'react';
import { api, ApiError } from '../api/client';
import type { AdminUser, Role, Store } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { useConfirm } from '../ConfirmDialog';
import { useSnackbar } from '../Snackbar';
import { useList } from './useList';
import { useFormErrors } from './useFormErrors';
import { DataTable, type Column } from './DataTable';
import { ListToolbar } from './ListToolbar';
import { InlineSelectFilter } from './InlineSelectFilter';
import { Modal } from './Modal';
import { SearchableSelect } from './SearchableSelect';
import { DetailView, StatusChip } from './DetailView';
import { useRetained } from './useRetained';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormGroup from '@mui/material/FormGroup';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Paper from '@mui/material/Paper';
import Tooltip from '@mui/material/Tooltip';
import CircularProgress from '@mui/material/CircularProgress';
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import CheckOutlinedIcon from '@mui/icons-material/CheckOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';

interface CreateForm {
  name: string;
  email: string;
  username: string;
  phone: string;
  password: string;
  role_id: string;
  /** Required (and required to be exactly one store) only when role_id resolves to a single-store role (Store Admin, Cashier, Cashier Supervisor) — see roleRequiresOneStore below. */
  store_id: string;
}

const EMPTY_CREATE: CreateForm = { name: '', email: '', username: '', phone: '', password: '', role_id: '', store_id: '' };

type SectionColor = 'primary' | 'warning' | 'success' | 'error';

function SectionHeader({ icon, label, color }: { icon: ReactNode; label: string; color: SectionColor }) {
  return (
    <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', mb: 2 }}>
      <Box
        sx={{
          width: 30,
          height: 30,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          bgcolor: `color-mix(in srgb, var(--mui-palette-${color}-main) 15%, transparent)`,
          color: `${color}.main`,
        }}
      >
        {icon}
      </Box>
      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
        {label}
      </Typography>
    </Stack>
  );
}

export function UsersScreen() {
  const { user, hasPermission } = useAuth();
  const confirm = useConfirm();
  const notify = useSnackbar();
  const [statusFilter, setStatusFilter] = useState('');
  const { data, meta, loading, error, page, setPage, perPage, setPerPage, sort, setSort, q, setQ, reload } = useList<AdminUser>('/users', {
    is_active: statusFilter,
  });

  const [roles, setRoles] = useState<Role[]>([]);
  const [stores, setStores] = useState<Store[]>([]);

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>(EMPTY_CREATE);
  const [saving, setSaving] = useState(false);
  const { fieldErrors, formError, clearErrors, clearField, reportError } = useFormErrors();

  const [managing, setManaging] = useState<AdminUser | null>(null);
  const [viewing, setViewing] = useState<AdminUser | null>(null);
  const managingR = useRetained(managing);
  const [detailsForm, setDetailsForm] = useState({ name: '', email: '', username: '', phone: '' });
  const [savingDetails, setSavingDetails] = useState(false);
  const {
    fieldErrors: detailsFieldErrors,
    formError: detailsFormError,
    clearErrors: clearDetailsErrors,
    clearField: clearDetailsField,
    reportError: reportDetailsError,
  } = useFormErrors();
  const [manageRoleId, setManageRoleId] = useState('');
  const [manageStoreIds, setManageStoreIds] = useState<number[]>([]);
  const [loadingStoreAccess, setLoadingStoreAccess] = useState(false);
  const [manageError, setManageError] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [savingStores, setSavingStores] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [passwordCopied, setPasswordCopied] = useState(false);

  const [storeAccessUser, setStoreAccessUser] = useState<AdminUser | null>(null);
  const storeAccessUserR = useRetained(storeAccessUser);
  const [storeAccessError, setStoreAccessError] = useState<string | null>(null);

  const [passwordUser, setPasswordUser] = useState<AdminUser | null>(null);
  const passwordUserR = useRetained(passwordUser);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    api.get<Role[]>('/roles?per_page=50').then(setRoles);
    // Only the stores the current admin themselves can reach — a
    // store-restricted admin shouldn't be able to grant someone else
    // access to a store the admin can't operate in themselves.
    // Gated the same way the Manage button is: view-only users can't hit
    // this endpoint (it requires users.update) and don't need the list.
    if (hasPermission('users.update')) {
      api.get<Store[]>('/users/stores/assignable').then(setStores);
    }
  }, [hasPermission]);

  const roleName = (id: number | null) => roles.find((r) => r.id === id)?.name ?? '—';
  // Mirrors the backend guard in UsersController — only a Super Admin can
  // hand out the Super Admin role, so it's never even offered as an
  // option to anyone else.
  const assignableRoles = roles.filter((r) => r.name !== 'Super Admin' || user?.role_name === 'Super Admin');
  // These role names all mean "assigned to work at one specific store" —
  // the backend rejects a create/role-change/store-access edit that would
  // leave one of them assigned to anything other than exactly one store,
  // so the form requires it too rather than letting the request
  // round-trip just to find out. Mirrors UsersController::SINGLE_STORE_ROLES.
  const SINGLE_STORE_ROLES = ['Store Admin', 'Cashier', 'Cashier Supervisor'];
  const roleRequiresOneStore = (roleId: string) => SINGLE_STORE_ROLES.includes(roles.find((r) => String(r.id) === roleId)?.name ?? '');
  const creatingSingleStoreRole = roleRequiresOneStore(createForm.role_id);
  const targetRequiresOneStore = storeAccessUserR ? roleRequiresOneStore(storeAccessUserR.role_id ? String(storeAccessUserR.role_id) : '') : false;

  function openCreate() {
    setCreateForm(EMPTY_CREATE);
    clearErrors();
    setShowCreate(true);
  }

  async function submitCreate() {
    if (creatingSingleStoreRole && !createForm.store_id) {
      reportError(null, 'Pick the one store this role is assigned to.');
      return;
    }
    setSaving(true);
    clearErrors();
    try {
      await api.post('/users', {
        name: createForm.name,
        email: createForm.email,
        username: createForm.username,
        phone: createForm.phone || null,
        password: createForm.password,
        role_id: createForm.role_id || null,
        store_id: creatingSingleStoreRole ? createForm.store_id : undefined,
      });
      setShowCreate(false);
      reload();
      notify('User created');
    } catch (err) {
      reportError(err, 'Failed to create user');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(user: AdminUser) {
    const action = Number(user.is_active) === 1 ? 'deactivate' : 'activate';
    const verb = action === 'activate' ? 'Activate' : 'Deactivate';
    if (!(await confirm(`${verb} user "${user.name}"?`, { title: `${verb} User`, confirmLabel: verb }))) return;
    try {
      await api.post(`/users/${user.id}/${action}`);
      reload();
      notify(`User ${action}d`);
    } catch (err) {
      notify(err instanceof ApiError ? err.message : `Failed to ${action} user`, 'error');
    }
  }

  function openManage(user: AdminUser) {
    setManaging(user);
    setManageError(null);
    setDetailsForm({ name: user.name, email: user.email, username: user.username, phone: user.phone ?? '' });
    clearDetailsErrors();
    setManageRoleId(user.role_id ? String(user.role_id) : '');
  }

  function openPassword(user: AdminUser) {
    setPasswordUser(user);
    setPasswordError(null);
    setTempPassword(null);
    setPasswordCopied(false);
  }

  async function openStoreAccess(user: AdminUser) {
    setStoreAccessUser(user);
    setStoreAccessError(null);
    setLoadingStoreAccess(true);
    try {
      const assigned = await api.get<Array<{ id: number }>>(`/users/${user.id}/stores`);
      setManageStoreIds(assigned.map((s) => s.id));
    } finally {
      setLoadingStoreAccess(false);
    }
  }

  async function saveDetails() {
    if (!managing) return;
    setSavingDetails(true);
    clearDetailsErrors();
    try {
      await api.put<AdminUser>(`/users/${managing.id}`, {
        name: detailsForm.name,
        email: detailsForm.email,
        username: detailsForm.username,
        phone: detailsForm.phone || null,
        role_id: manageRoleId || null,
      });
      reload();
      notify('User details updated');
      setManaging(null);
    } catch (err) {
      reportDetailsError(err, 'Failed to update details');
    } finally {
      setSavingDetails(false);
    }
  }

  async function saveStores() {
    if (!storeAccessUser) return;
    setStoreAccessError(null);
    setSavingStores(true);
    try {
      await api.put(`/users/${storeAccessUser.id}/stores`, { store_ids: manageStoreIds });
      notify('Store access updated');
      setStoreAccessUser(null);
    } catch (err) {
      setStoreAccessError(err instanceof ApiError ? err.message : 'Failed to update store access');
    } finally {
      setSavingStores(false);
    }
  }

  async function resetPassword() {
    if (!passwordUser) return;
    if (
      !(await confirm(`Reset password for ${passwordUser.name}? This invalidates all their current sessions.`, {
        title: 'Reset Password',
        confirmLabel: 'Reset Password',
      }))
    )
      return;
    setPasswordError(null);
    setResettingPassword(true);
    setPasswordCopied(false);
    try {
      const result = await api.post<{ temporary_password?: string }>(`/users/${passwordUser.id}/reset-password`);
      setTempPassword(result.temporary_password ?? null);
    } catch (err) {
      setPasswordError(err instanceof ApiError ? err.message : 'Failed to reset password');
    } finally {
      setResettingPassword(false);
    }
  }

  async function copyTempPassword() {
    if (!tempPassword) return;
    await navigator.clipboard.writeText(tempPassword);
    setPasswordCopied(true);
    setTimeout(() => setPasswordCopied(false), 2000);
  }

  function toggleStore(storeId: number) {
    setManageStoreIds((prev) => (prev.includes(storeId) ? prev.filter((id) => id !== storeId) : [...prev, storeId]));
  }

  const columns: Column<AdminUser>[] = [
    { key: 'name', label: 'Name', sortKey: 'name' },
    { key: 'email', label: 'Email', sortKey: 'email' },
    { key: 'username', label: 'Username' },
    { key: 'role', label: 'Role', render: (u) => roleName(u.role_id) },
    {
      key: 'is_active',
      label: 'Status',
      width: 120,
      render: (u) => (
        <Chip
          size="small"
          label={Number(u.is_active) === 1 ? 'Active' : 'Inactive'}
          color={Number(u.is_active) === 1 ? 'success' : 'default'}
        />
      ),
    },
  ];

  return (
    <div>
      <ListToolbar
        search={q}
        onSearchChange={setQ}
        onAdd={hasPermission('users.create') ? openCreate : undefined}
        addLabel="Add User"
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
        rowActions={(u) => {
          const active = Number(u.is_active) === 1;
          return (
            <>
              <Tooltip title="View">
                <IconButton size="small" aria-label="View" onClick={() => setViewing(u)}>
                  <VisibilityOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              {hasPermission('users.update') && (
                <>
                  <Tooltip title="Manage">
                    <IconButton size="small" aria-label="Manage" onClick={() => openManage(u)}>
                      <EditOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Store Access">
                    <IconButton size="small" aria-label="Store Access" onClick={() => openStoreAccess(u)}>
                      <StorefrontOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Password">
                    <IconButton size="small" aria-label="Password" onClick={() => openPassword(u)}>
                      <LockOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={active ? 'Deactivate' : 'Activate'}>
                    <IconButton
                      size="small"
                      aria-label={active ? 'Deactivate' : 'Activate'}
                      color={active ? 'error' : 'success'}
                      onClick={() => toggleActive(u)}
                    >
                      {active ? <BlockOutlinedIcon fontSize="small" /> : <CheckCircleOutlinedIcon fontSize="small" />}
                    </IconButton>
                  </Tooltip>
                </>
              )}
            </>
          );
        }}
      />

      <Modal open={showCreate} title="Add User" onClose={() => setShowCreate(false)} compact>
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              submitCreate();
            }}
          >
            <Grid container spacing={2} sx={{ pt: 1 }}>
              <Grid size={{ xs: 12 }}>
                <TextField
                  label="Name"
                  fullWidth
                  value={createForm.name}
                  onChange={(e) => {
                    setCreateForm({ ...createForm, name: e.target.value });
                    clearField('name');
                  }}
                  error={!!fieldErrors?.name}
                  helperText={fieldErrors?.name}
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Email"
                  type="email"
                  fullWidth
                  value={createForm.email}
                  onChange={(e) => {
                    setCreateForm({ ...createForm, email: e.target.value });
                    clearField('email');
                  }}
                  error={!!fieldErrors?.email}
                  helperText={fieldErrors?.email}
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Username"
                  fullWidth
                  value={createForm.username}
                  onChange={(e) => {
                    setCreateForm({ ...createForm, username: e.target.value });
                    clearField('username');
                  }}
                  error={!!fieldErrors?.username}
                  helperText={fieldErrors?.username}
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Phone"
                  fullWidth
                  value={createForm.phone}
                  onChange={(e) => {
                    setCreateForm({ ...createForm, phone: e.target.value });
                    clearField('phone');
                  }}
                  error={!!fieldErrors?.phone}
                  helperText={fieldErrors?.phone}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: creatingSingleStoreRole ? 6 : 12 }}>
                <SearchableSelect
                  label="Role"
                  fullWidth
                  value={createForm.role_id}
                  onChange={(v) => setCreateForm({ ...createForm, role_id: v, store_id: '' })}
                  options={[{ value: '', label: '— None —' }, ...assignableRoles.map((r) => ({ value: String(r.id), label: r.name }))]}
                />
              </Grid>
              {creatingSingleStoreRole && (
                <Grid size={{ xs: 12, sm: 6 }}>
                  <SearchableSelect
                    label="Store"
                    fullWidth
                    required
                    value={createForm.store_id}
                    onChange={(v) => setCreateForm({ ...createForm, store_id: v })}
                    options={stores.map((s) => ({ value: String(s.id), label: s.name }))}
                    helperText="This role is assigned to exactly one store."
                  />
                </Grid>
              )}
              <Grid size={{ xs: 12 }}>
                <TextField
                  label="Password (min 8 characters)"
                  type="password"
                  fullWidth
                  value={createForm.password}
                  onChange={(e) => {
                    setCreateForm({ ...createForm, password: e.target.value });
                    clearField('password');
                  }}
                  error={!!fieldErrors?.password}
                  helperText={fieldErrors?.password}
                  slotProps={{ htmlInput: { minLength: 8 } }}
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
                  <Button type="button" variant="text" onClick={() => setShowCreate(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="contained" disabled={saving}>
                    {saving ? 'Creating…' : 'Create'}
                  </Button>
                </Stack>
              </Grid>
            </Grid>
          </form>
      </Modal>

      <Modal open={managing !== null} title="Manage User" onClose={() => setManaging(null)} wide compact>
          <Stack spacing={2.5}>
            {managingR && (
              <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                <Avatar sx={{ width: 48, height: 48, fontSize: 18, fontWeight: 700, bgcolor: 'primary.main' }}>
                  {managingR.name.charAt(0).toUpperCase()}
                </Avatar>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography sx={{ fontWeight: 700, fontSize: 17 }} noWrap>
                    {managingR.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {managingR.email}
                  </Typography>
                </Box>
                <Chip
                  size="small"
                  label={Number(managingR.is_active) === 1 ? 'Active' : 'Inactive'}
                  color={Number(managingR.is_active) === 1 ? 'success' : 'default'}
                />
              </Stack>
            )}

            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
              <SectionHeader icon={<PersonOutlinedIcon fontSize="small" />} label="Details" color="primary" />
              <Grid container spacing={2}>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    label="Name"
                    fullWidth
                    value={detailsForm.name}
                    onChange={(e) => {
                      setDetailsForm({ ...detailsForm, name: e.target.value });
                      clearDetailsField('name');
                    }}
                    error={!!detailsFieldErrors?.name}
                    helperText={detailsFieldErrors?.name}
                    required
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Email"
                    type="email"
                    fullWidth
                    value={detailsForm.email}
                    onChange={(e) => {
                      setDetailsForm({ ...detailsForm, email: e.target.value });
                      clearDetailsField('email');
                    }}
                    error={!!detailsFieldErrors?.email}
                    helperText={detailsFieldErrors?.email}
                    required
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Username"
                    fullWidth
                    value={detailsForm.username}
                    onChange={(e) => {
                      setDetailsForm({ ...detailsForm, username: e.target.value });
                      clearDetailsField('username');
                    }}
                    error={!!detailsFieldErrors?.username}
                    helperText={detailsFieldErrors?.username}
                    required
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Phone"
                    fullWidth
                    value={detailsForm.phone}
                    onChange={(e) => {
                      setDetailsForm({ ...detailsForm, phone: e.target.value });
                      clearDetailsField('phone');
                    }}
                    error={!!detailsFieldErrors?.phone}
                    helperText={detailsFieldErrors?.phone}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <SearchableSelect
                    label="Role"
                    value={manageRoleId}
                    onChange={setManageRoleId}
                    fullWidth
                    options={[{ value: '', label: '— None —' }, ...assignableRoles.map((r) => ({ value: String(r.id), label: r.name }))]}
                  />
                </Grid>
                {detailsFormError && (
                  <Grid size={{ xs: 12 }}>
                    <Alert severity="error">{detailsFormError}</Alert>
                  </Grid>
                )}
              </Grid>
            </Paper>

            {manageError && <Alert severity="error">{manageError}</Alert>}
          </Stack>

          <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'flex-end', mt: 3 }}>
            <Button type="button" variant="text" onClick={() => setManaging(null)}>
              Close
            </Button>
            <Button variant="contained" onClick={saveDetails} disabled={savingDetails} sx={{ minWidth: 148 }}>
              {savingDetails ? <CircularProgress size={18} sx={{ color: 'inherit' }} /> : 'Save Details'}
            </Button>
          </Stack>
      </Modal>

      <Modal open={storeAccessUser !== null} title="Store Access" onClose={() => setStoreAccessUser(null)} compact>
          <Stack spacing={2.5}>
            {storeAccessUserR && (
              <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                <Avatar sx={{ width: 40, height: 40, fontSize: 16, fontWeight: 700, bgcolor: 'primary.main' }}>
                  {storeAccessUserR.name.charAt(0).toUpperCase()}
                </Avatar>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography sx={{ fontWeight: 700, fontSize: 15 }} noWrap>
                    {storeAccessUserR.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {storeAccessUserR.email}
                  </Typography>
                </Box>
              </Stack>
            )}

            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
              <SectionHeader icon={<StorefrontOutlinedIcon fontSize="small" />} label="Store Access" color="success" />
              {targetRequiresOneStore ? (
                <>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                    This role is assigned to exactly one store — pick which one.
                  </Typography>
                  {loadingStoreAccess ? (
                    <Stack sx={{ alignItems: 'center', py: 1.5 }}>
                      <CircularProgress size={20} />
                    </Stack>
                  ) : (
                    <SearchableSelect
                      label="Store"
                      fullWidth
                      required
                      value={manageStoreIds[0] ? String(manageStoreIds[0]) : ''}
                      onChange={(v) => setManageStoreIds(v ? [Number(v)] : [])}
                      options={stores.map((s) => ({ value: String(s.id), label: s.name }))}
                    />
                  )}
                </>
              ) : (
                <>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                    Leave every box unchecked for unrestricted access to every store in the company — check specific stores
                    to limit this user to just those.
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, mb: 1.5, bgcolor: 'action.hover' }}>
                    {loadingStoreAccess ? (
                      <Stack sx={{ alignItems: 'center', py: 1.5 }}>
                        <CircularProgress size={20} />
                      </Stack>
                    ) : (
                      <FormGroup row sx={{ gap: 1.5 }}>
                        {stores.map((store) => (
                          <FormControlLabel
                            key={store.id}
                            control={<Checkbox checked={manageStoreIds.includes(store.id)} onChange={() => toggleStore(store.id)} />}
                            label={store.name}
                            sx={{ mr: 0 }}
                          />
                        ))}
                        {stores.length === 0 && (
                          <Typography variant="body2" color="text.secondary">
                            No stores yet.
                          </Typography>
                        )}
                      </FormGroup>
                    )}
                  </Paper>
                </>
              )}
            </Paper>

            {storeAccessError && <Alert severity="error">{storeAccessError}</Alert>}
          </Stack>

          <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'flex-end', mt: 3 }}>
            <Button type="button" variant="text" onClick={() => setStoreAccessUser(null)}>
              Close
            </Button>
            <Button
              variant="contained"
              onClick={saveStores}
              disabled={savingStores || loadingStoreAccess || (targetRequiresOneStore && manageStoreIds.length !== 1)}
              sx={{ minWidth: 172 }}
            >
              {savingStores ? <CircularProgress size={18} sx={{ color: 'inherit' }} /> : 'Save Store Access'}
            </Button>
          </Stack>
      </Modal>

      <Modal open={passwordUser !== null} title="Password" onClose={() => setPasswordUser(null)} compact>
          <Stack spacing={2.5}>
            {passwordUserR && (
              <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                <Avatar sx={{ width: 40, height: 40, fontSize: 16, fontWeight: 700, bgcolor: 'primary.main' }}>
                  {passwordUserR.name.charAt(0).toUpperCase()}
                </Avatar>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography sx={{ fontWeight: 700, fontSize: 15 }} noWrap>
                    {passwordUserR.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {passwordUserR.email}
                  </Typography>
                </Box>
              </Stack>
            )}

            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
              <SectionHeader icon={<LockOutlinedIcon fontSize="small" />} label="Password" color="error" />
              <Button variant="outlined" color="error" onClick={resetPassword} disabled={resettingPassword} sx={{ minWidth: 160 }}>
                {resettingPassword ? <CircularProgress size={18} /> : 'Reset Password'}
              </Button>
              {tempPassword && (
                <Paper variant="outlined" sx={{ mt: 1.5, p: 1.5, borderRadius: 2, bgcolor: 'action.hover' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                    Temporary password — share out of band, it cannot be shown again:
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <Typography sx={{ fontFamily: 'ui-monospace, Consolas, monospace', fontWeight: 700, flex: 1 }}>{tempPassword}</Typography>
                    <Tooltip title={passwordCopied ? 'Copied!' : 'Copy to clipboard'}>
                      <IconButton size="small" onClick={copyTempPassword}>
                        {passwordCopied ? <CheckOutlinedIcon fontSize="small" color="success" /> : <ContentCopyOutlinedIcon fontSize="small" />}
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Paper>
              )}
            </Paper>

            {passwordError && <Alert severity="error">{passwordError}</Alert>}
          </Stack>

          <Stack direction="row" sx={{ justifyContent: 'flex-end', mt: 3 }}>
            <Button type="button" variant="text" onClick={() => setPasswordUser(null)}>
              Close
            </Button>
          </Stack>
      </Modal>

      <Modal open={!!viewing} title="View User" onClose={() => setViewing(null)} compact>
        <DetailView
          fields={[
            { label: 'Name', value: viewing?.name },
            { label: 'Email', value: viewing?.email },
            { label: 'Username', value: viewing?.username },
            { label: 'Phone', value: viewing?.phone },
            { label: 'Role', value: viewing ? roleName(viewing.role_id) : undefined },
            { label: 'Status', value: viewing ? <StatusChip active={Number(viewing.is_active) === 1} /> : undefined },
            { label: 'Last Login', value: viewing?.last_login_at ? new Date(viewing.last_login_at).toLocaleString() : undefined },
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
