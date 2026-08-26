import { useEffect, useMemo, useState } from 'react';
import { api, ApiError } from '../api/client';
import type { Permission, Role } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { useConfirm } from '../ConfirmDialog';
import { useSnackbar } from '../Snackbar';
import { useList } from './useList';
import { useFormErrors } from './useFormErrors';
import { DataTable, type Column } from './DataTable';
import { ListToolbar } from './ListToolbar';
import { Modal } from './Modal';
import { DetailView } from './DetailView';
import { SearchField } from '../SearchField';
import { useRetained } from './useRetained';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SecurityIcon from '@mui/icons-material/Security';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';

export function RolesScreen() {
  const { hasPermission } = useAuth();
  const confirm = useConfirm();
  const notify = useSnackbar();
  const { data, meta, loading, error, page, setPage, perPage, setPerPage, sort, setSort, reload } = useList<Role>('/roles');

  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);

  const [editing, setEditing] = useState<Role | null>(null);
  const [viewing, setViewing] = useState<Role | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const { fieldErrors, formError, clearErrors, clearField, reportError } = useFormErrors();

  const [managing, setManaging] = useState<Role | null>(null);
  const managingR = useRetained(managing);
  const [rolePermissions, setRolePermissions] = useState<string[]>([]);
  const [manageError, setManageError] = useState<string | null>(null);
  const [permSearch, setPermSearch] = useState('');

  useEffect(() => {
    api.get<Permission[]>('/permissions?per_page=200').then(setAllPermissions);
  }, []);

  // Group permissions by their prefix (e.g. "products.view" -> "products")
  // so the matrix reads as one section per resource rather than one long list.
  const grouped = allPermissions.reduce<Record<string, Permission[]>>((acc, p) => {
    const group = p.slug.split('.')[0];
    (acc[group] ??= []).push(p);
    return acc;
  }, {});

  // Narrowed to whatever the search box matches — by friendly name, slug,
  // or description, so "refund" finds sales.refund even if you don't know
  // the slug. Groups with no surviving matches drop out entirely.
  const visibleGroups = useMemo(() => {
    const q = permSearch.trim().toLowerCase();
    if (!q) return grouped;
    const result: Record<string, Permission[]> = {};
    for (const [group, perms] of Object.entries(grouped)) {
      const matches = perms.filter(
        (p) => p.name.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q) || (p.description ?? '').toLowerCase().includes(q)
      );
      if (matches.length > 0) result[group] = matches;
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allPermissions, permSearch]);

  function groupCheckState(perms: Permission[]): 'all' | 'some' | 'none' {
    const selected = perms.filter((p) => rolePermissions.includes(p.slug)).length;
    if (selected === 0) return 'none';
    return selected === perms.length ? 'all' : 'some';
  }

  function toggleGroup(perms: Permission[]) {
    const slugs = perms.map((p) => p.slug);
    if (groupCheckState(perms) === 'all') {
      setRolePermissions((prev) => prev.filter((s) => !slugs.includes(s)));
    } else {
      setRolePermissions((prev) => Array.from(new Set([...prev, ...slugs])));
    }
  }

  function openCreate() {
    setEditing(null);
    setName('');
    setDescription('');
    clearErrors();
    setShowForm(true);
  }

  function openEdit(role: Role) {
    setEditing(role);
    setName(role.name);
    setDescription(role.description ?? '');
    clearErrors();
    setShowForm(true);
  }

  async function submitForm() {
    setSaving(true);
    clearErrors();
    try {
      if (editing) await api.put(`/roles/${editing.id}`, { name, description: description || null });
      else await api.post('/roles', { name, description: description || null });
      setShowForm(false);
      reload();
      notify(editing ? 'Role updated' : 'Role created');
    } catch (err) {
      reportError(err, 'Failed to save role');
    } finally {
      setSaving(false);
    }
  }

  async function remove(role: Role) {
    if (!(await confirm(`Delete role "${role.name}"?`, { title: 'Delete Role', confirmLabel: 'Delete' }))) return;
    try {
      await api.del(`/roles/${role.id}`);
      reload();
      notify('Role deleted');
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Failed to delete role', 'error');
    }
  }

  async function openManage(role: Role) {
    setManaging(role);
    setManageError(null);
    setPermSearch('');
    setRolePermissions(await api.get<string[]>(`/roles/${role.id}/permissions`));
  }

  function togglePermission(slug: string) {
    setRolePermissions((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]));
  }

  function selectAllPermissions() {
    setRolePermissions(allPermissions.map((p) => p.slug));
  }

  function clearAllPermissions() {
    setRolePermissions([]);
  }

  async function savePermissions() {
    if (!managing) return;
    setManageError(null);
    try {
      await api.put(`/roles/${managing.id}/permissions`, { permissions: rolePermissions });
      setManaging(null);
      notify('Permissions updated');
    } catch (err) {
      setManageError(err instanceof ApiError ? err.message : 'Failed to save permissions');
    }
  }

  const columns: Column<Role>[] = [
    { key: 'name', label: 'Name', sortKey: 'name' },
    { key: 'description', label: 'Description', render: (r) => r.description ?? '—' },
    {
      key: 'is_system',
      label: 'Type',
      render: (r) => (Number(r.is_system) === 1 ? <Chip size="small" label="System" color="success" /> : 'Custom'),
    },
  ];

  return (
    <div>
      <ListToolbar
        search=""
        onSearchChange={() => {}}
        onAdd={hasPermission('roles.manage') ? openCreate : undefined}
        addLabel="Add Role"
        onRefresh={reload}
        refreshing={loading}
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
        rowActions={(r) => (
          <>
            <Tooltip title="View">
              <IconButton size="small" aria-label="View" onClick={() => setViewing(r)}>
                <VisibilityOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            {hasPermission('roles.manage') && (
              <>
                <Tooltip title="Permissions">
                  <IconButton size="small" aria-label="Permissions" onClick={() => openManage(r)}>
                    <SecurityIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Edit">
                  <IconButton size="small" aria-label="Edit" onClick={() => openEdit(r)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                {Number(r.is_system) !== 1 && (
                  <Tooltip title="Delete">
                    <IconButton size="small" aria-label="Delete" color="error" onClick={() => remove(r)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </>
            )}
          </>
        )}
      />

      <Modal open={showForm} title={editing ? 'Edit Role' : 'Add Role'} onClose={() => setShowForm(false)} compact>
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
                  label="Name"
                  fullWidth
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    clearField('name');
                  }}
                  error={!!fieldErrors?.name}
                  helperText={fieldErrors?.name}
                  required
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  label="Description"
                  fullWidth
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    clearField('description');
                  }}
                  error={!!fieldErrors?.description}
                  helperText={fieldErrors?.description}
                />
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
                    {saving ? 'Saving…' : 'Save'}
                  </Button>
                </Stack>
              </Grid>
            </Grid>
          </form>
      </Modal>

      <Modal open={!!viewing} title="View Role" onClose={() => setViewing(null)} compact>
        <DetailView
          fields={[
            { label: 'Name', value: viewing?.name },
            { label: 'Type', value: viewing ? (Number(viewing.is_system) === 1 ? 'System' : 'Custom') : undefined },
            { label: 'Description', value: viewing?.description, fullWidth: true },
          ]}
        />
        <Stack direction="row" sx={{ justifyContent: 'flex-end', mt: 3 }}>
          <Button variant="text" onClick={() => setViewing(null)}>
            Close
          </Button>
        </Stack>
      </Modal>

      <Modal open={managing !== null} title={managingR ? `Permissions: ${managingR.name}` : ''} onClose={() => setManaging(null)} maxWidth="lg">
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { xs: 'stretch', sm: 'center' }, mb: 2 }}>
            <SearchField value={permSearch} onChange={setPermSearch} placeholder="Search permissions…" fullWidth />
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 1 }}>
              <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                {rolePermissions.length} of {allPermissions.length} selected
              </Typography>
              <Button size="small" onClick={selectAllPermissions}>
                Select All
              </Button>
              <Button size="small" onClick={clearAllPermissions}>
                Clear All
              </Button>
            </Stack>
          </Stack>

          <Box sx={{ maxHeight: '55vh', overflowY: 'auto', pr: 0.5 }}>
            {Object.entries(visibleGroups).map(([group, perms]) => {
              const state = groupCheckState(perms);
              return (
                <Paper key={group} variant="outlined" sx={{ p: 1.75, borderRadius: 2, mb: 1.5 }}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
                    <Checkbox
                      size="small"
                      checked={state === 'all'}
                      indeterminate={state === 'some'}
                      onChange={() => toggleGroup(perms)}
                      sx={{ p: 0 }}
                    />
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: 'capitalize' }}>
                      {group.replace('-', ' ')}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      ({perms.filter((p) => rolePermissions.includes(p.slug)).length}/{perms.length})
                    </Typography>
                  </Stack>
                  <Divider sx={{ mb: 1.25 }} />
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', columnGap: 1, rowGap: 0.25 }}>
                    {perms.map((p) => (
                      <Tooltip key={p.slug} title={p.description ?? p.slug} placement="top" arrow>
                        <FormControlLabel
                          control={<Checkbox size="small" checked={rolePermissions.includes(p.slug)} onChange={() => togglePermission(p.slug)} />}
                          label={p.name}
                          sx={{ mr: 0 }}
                        />
                      </Tooltip>
                    ))}
                  </Box>
                </Paper>
              );
            })}
            {Object.keys(visibleGroups).length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                No permissions match “{permSearch}”.
              </Typography>
            )}
          </Box>

          {manageError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {manageError}
            </Alert>
          )}

          <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'flex-end', mt: 2 }}>
            <Button type="button" variant="text" onClick={() => setManaging(null)}>
              Cancel
            </Button>
            <Button type="button" variant="contained" onClick={savePermissions}>
              Save Permissions
            </Button>
          </Stack>
      </Modal>
    </div>
  );
}
