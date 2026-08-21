import { useEffect, useState } from 'react';
import { api, ApiError } from '../api/client';
import type { AdminUser, Role, Store } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { useConfirm } from '../ConfirmDialog';
import { useSnackbar } from '../Snackbar';
import { useList } from './useList';
import { useFormErrors } from './useFormErrors';
import { DataTable, type Column } from './DataTable';
import { ListToolbar } from './ListToolbar';
import { Modal } from './Modal';
import { useRetained } from './useRetained';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormGroup from '@mui/material/FormGroup';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Tooltip from '@mui/material/Tooltip';
import CircularProgress from '@mui/material/CircularProgress';
import ManageAccountsOutlinedIcon from '@mui/icons-material/ManageAccountsOutlined';
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined';
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import CheckOutlinedIcon from '@mui/icons-material/CheckOutlined';

interface CreateForm {
  name: string;
  email: string;
  username: string;
  phone: string;
  password: string;
  role_id: string;
}

const EMPTY_CREATE: CreateForm = { name: '', email: '', username: '', phone: '', password: '', role_id: '' };

export function UsersScreen() {
  const { user, hasPermission } = useAuth();
  const confirm = useConfirm();
  const notify = useSnackbar();
  const { data, meta, loading, error, page, setPage, perPage, setPerPage, sort, setSort, q, setQ, reload } = useList<AdminUser>('/users');

  const [roles, setRoles] = useState<Role[]>([]);
  const [stores, setStores] = useState<Store[]>([]);

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>(EMPTY_CREATE);
  const [saving, setSaving] = useState(false);
  const { fieldErrors, formError, clearErrors, clearField, reportError } = useFormErrors();

  const [managing, setManaging] = useState<AdminUser | null>(null);
  const managingR = useRetained(managing);
  const [detailsForm, setDetailsForm] = useState({ name: '', email: '', username: '', phone: '' });
  const [savingDetails, setSavingDetails] = useState(false);
  const [detailsSaved, setDetailsSaved] = useState(false);
  const {
    fieldErrors: detailsFieldErrors,
    formError: detailsFormError,
    clearErrors: clearDetailsErrors,
    clearField: clearDetailsField,
    reportError: reportDetailsError,
  } = useFormErrors();
  const [manageRoleId, setManageRoleId] = useState('');
  const [manageStoreIds, setManageStoreIds] = useState<number[]>([]);
  const [manageError, setManageError] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [savingRole, setSavingRole] = useState(false);
  const [roleSaved, setRoleSaved] = useState(false);
  const [savingStores, setSavingStores] = useState(false);
  const [storesSaved, setStoresSaved] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [passwordCopied, setPasswordCopied] = useState(false);

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

  function openCreate() {
    setCreateForm(EMPTY_CREATE);
    clearErrors();
    setShowCreate(true);
  }

  async function submitCreate() {
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
    try {
      await api.post(`/users/${user.id}/${action}`);
      reload();
      notify(`User ${action}d`);
    } catch (err) {
      notify(err instanceof ApiError ? err.message : `Failed to ${action} user`, 'error');
    }
  }

  async function openManage(user: AdminUser) {
    setManaging(user);
    setManageError(null);
    setTempPassword(null);
    setRoleSaved(false);
    setStoresSaved(false);
    setPasswordCopied(false);
    setDetailsForm({ name: user.name, email: user.email, username: user.username, phone: user.phone ?? '' });
    setDetailsSaved(false);
    clearDetailsErrors();
    setManageRoleId(user.role_id ? String(user.role_id) : '');
    const assigned = await api.get<Array<{ id: number }>>(`/users/${user.id}/stores`);
    setManageStoreIds(assigned.map((s) => s.id));
  }

  async function saveDetails() {
    if (!managing) return;
    setSavingDetails(true);
    clearDetailsErrors();
    setDetailsSaved(false);
    try {
      const updated = await api.put<AdminUser>(`/users/${managing.id}`, {
        name: detailsForm.name,
        email: detailsForm.email,
        username: detailsForm.username,
        phone: detailsForm.phone || null,
      });
      setManaging(updated);
      reload();
      setDetailsSaved(true);
      notify('User details updated');
      setTimeout(() => setDetailsSaved(false), 2000);
    } catch (err) {
      reportDetailsError(err, 'Failed to update details');
    } finally {
      setSavingDetails(false);
    }
  }

  async function saveRole() {
    if (!managing) return;
    setManageError(null);
    setSavingRole(true);
    setRoleSaved(false);
    try {
      await api.put(`/users/${managing.id}/role`, { role_id: manageRoleId || null });
      reload();
      setRoleSaved(true);
      setTimeout(() => setRoleSaved(false), 2000);
    } catch (err) {
      setManageError(err instanceof ApiError ? err.message : 'Failed to update role');
    } finally {
      setSavingRole(false);
    }
  }

  async function saveStores() {
    if (!managing) return;
    setManageError(null);
    setSavingStores(true);
    setStoresSaved(false);
    try {
      await api.put(`/users/${managing.id}/stores`, { store_ids: manageStoreIds });
      setStoresSaved(true);
      setTimeout(() => setStoresSaved(false), 2000);
    } catch (err) {
      setManageError(err instanceof ApiError ? err.message : 'Failed to update store access');
    } finally {
      setSavingStores(false);
    }
  }

  async function resetPassword() {
    if (!managing) return;
    if (
      !(await confirm(`Reset password for ${managing.name}? This invalidates all their current sessions.`, {
        title: 'Reset Password',
        confirmLabel: 'Reset Password',
      }))
    )
      return;
    setManageError(null);
    setResettingPassword(true);
    setPasswordCopied(false);
    try {
      const result = await api.post<{ temporary_password?: string }>(`/users/${managing.id}/reset-password`);
      setTempPassword(result.temporary_password ?? null);
    } catch (err) {
      setManageError(err instanceof ApiError ? err.message : 'Failed to reset password');
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
          hasPermission('users.update')
            ? (u) => (
                <>
                  <IconButton size="small" aria-label="Manage" onClick={() => openManage(u)}>
                    <ManageAccountsOutlinedIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    aria-label={Number(u.is_active) === 1 ? 'Deactivate' : 'Activate'}
                    color={Number(u.is_active) === 1 ? 'error' : 'success'}
                    onClick={() => toggleActive(u)}
                  >
                    {Number(u.is_active) === 1 ? <BlockOutlinedIcon fontSize="small" /> : <CheckCircleOutlinedIcon fontSize="small" />}
                  </IconButton>
                </>
              )
            : undefined
        }
      />

      <Modal open={showCreate} title="Add User" onClose={() => setShowCreate(false)}>
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
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  select
                  label="Role"
                  fullWidth
                  value={createForm.role_id}
                  onChange={(e) => setCreateForm({ ...createForm, role_id: e.target.value })}
                >
                  <MenuItem value="">— None —</MenuItem>
                  {assignableRoles.map((r) => (
                    <MenuItem key={r.id} value={r.id}>
                      {r.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
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

      <Modal open={managing !== null} title={managingR ? `Manage: ${managingR.name}` : ''} onClose={() => setManaging(null)} wide>
          <Stack spacing={3}>
            <Box>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.5 }}>
                <PersonOutlinedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  Details
                </Typography>
              </Stack>
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
                {detailsFormError && (
                  <Grid size={{ xs: 12 }}>
                    <Alert severity="error">{detailsFormError}</Alert>
                  </Grid>
                )}
                <Grid size={{ xs: 12 }}>
                  <Button variant="outlined" onClick={saveDetails} disabled={savingDetails} sx={{ minWidth: 148 }}>
                    {savingDetails ? (
                      <CircularProgress size={18} />
                    ) : detailsSaved ? (
                      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                        <CheckOutlinedIcon fontSize="small" color="success" />
                        Saved
                      </Stack>
                    ) : (
                      'Save Details'
                    )}
                  </Button>
                </Grid>
              </Grid>
            </Box>

            <Divider />

            <Box>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.5 }}>
                <BadgeOutlinedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  Role
                </Typography>
              </Stack>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                <TextField select label="Role" value={manageRoleId} onChange={(e) => setManageRoleId(e.target.value)} fullWidth>
                  <MenuItem value="">— None —</MenuItem>
                  {assignableRoles.map((r) => (
                    <MenuItem key={r.id} value={r.id}>
                      {r.name}
                    </MenuItem>
                  ))}
                </TextField>
                <Button variant="outlined" onClick={saveRole} disabled={savingRole} sx={{ flexShrink: 0, minWidth: 128 }}>
                  {savingRole ? (
                    <CircularProgress size={18} />
                  ) : roleSaved ? (
                    <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                      <CheckOutlinedIcon fontSize="small" color="success" />
                      Saved
                    </Stack>
                  ) : (
                    'Save Role'
                  )}
                </Button>
              </Stack>
            </Box>

            <Divider />

            <Box>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5 }}>
                <StorefrontOutlinedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  Store Access
                </Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                Leave every box unchecked for unrestricted access to every store in the company — check specific stores to
                limit this user to just those.
              </Typography>
              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, mb: 1.5 }}>
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
              </Paper>
              <Button variant="outlined" onClick={saveStores} disabled={savingStores} sx={{ minWidth: 172 }}>
                {savingStores ? (
                  <CircularProgress size={18} />
                ) : storesSaved ? (
                  <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                    <CheckOutlinedIcon fontSize="small" color="success" />
                    Saved
                  </Stack>
                ) : (
                  'Save Store Access'
                )}
              </Button>
            </Box>

            <Divider />

            <Box>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.5 }}>
                <LockOutlinedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  Password
                </Typography>
              </Stack>
              <Button variant="outlined" onClick={resetPassword} disabled={resettingPassword} sx={{ minWidth: 160 }}>
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
            </Box>

            {manageError && <Alert severity="error">{manageError}</Alert>}
          </Stack>

          <Stack direction="row" sx={{ justifyContent: 'flex-end', mt: 3 }}>
            <Button type="button" variant="text" onClick={() => setManaging(null)}>
              Close
            </Button>
          </Stack>
      </Modal>
    </div>
  );
}
