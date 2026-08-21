import { useState } from 'react';
import { api, ApiError } from '../api/client';
import type { Category } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { useConfirm } from '../ConfirmDialog';
import { useSnackbar } from '../Snackbar';
import { useList } from './useList';
import { useFormErrors } from './useFormErrors';
import { DataTable, type Column } from './DataTable';
import { ListToolbar } from './ListToolbar';
import { Modal } from './Modal';
import Stack from '@mui/material/Stack';
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

interface FormState {
  name: string;
  description: string;
  parent_id: string;
  is_active: boolean;
}

const EMPTY_FORM: FormState = { name: '', description: '', parent_id: '', is_active: true };

export function CategoriesScreen() {
  const { hasPermission } = useAuth();
  const confirm = useConfirm();
  const notify = useSnackbar();
  const { data, meta, loading, error, page, setPage, perPage, setPerPage, sort, setSort, q, setQ, reload } = useList<Category>('/categories');

  const [editing, setEditing] = useState<Category | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const { fieldErrors, formError, clearErrors, clearField, reportError } = useFormErrors();

  const parentName = (id: number | null) => data.find((c) => c.id === id)?.name ?? '—';

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    clearErrors();
    setShowForm(true);
  }

  function openEdit(category: Category) {
    setEditing(category);
    setForm({
      name: category.name,
      description: category.description ?? '',
      parent_id: category.parent_id ? String(category.parent_id) : '',
      is_active: Number(category.is_active) === 1,
    });
    clearErrors();
    setShowForm(true);
  }

  async function submitForm() {
    setSaving(true);
    clearErrors();
    const payload = {
      name: form.name,
      description: form.description || null,
      parent_id: form.parent_id || null,
      is_active: form.is_active ? 1 : 0,
    };
    try {
      if (editing) await api.put(`/categories/${editing.id}`, payload);
      else await api.post('/categories', payload);
      setShowForm(false);
      reload();
      notify(editing ? 'Category updated' : 'Category created');
    } catch (err) {
      reportError(err, 'Failed to save category');
    } finally {
      setSaving(false);
    }
  }

  async function remove(category: Category) {
    if (!(await confirm(`Delete category "${category.name}"?`, { title: 'Delete Category', confirmLabel: 'Delete' }))) return;
    try {
      await api.del(`/categories/${category.id}`);
      reload();
      notify('Category deleted');
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Failed to delete category', 'error');
    }
  }

  const columns: Column<Category>[] = [
    { key: 'name', label: 'Name', sortKey: 'name' },
    { key: 'parent', label: 'Parent', render: (c) => parentName(c.parent_id) },
    { key: 'description', label: 'Description', render: (c) => c.description ?? '—' },
    {
      key: 'is_active',
      label: 'Status',
      width: 120,
      render: (c) => (
        <Chip
          size="small"
          label={Number(c.is_active) === 1 ? 'Active' : 'Inactive'}
          color={Number(c.is_active) === 1 ? 'success' : 'default'}
        />
      ),
    },
  ];

  return (
    <div>
      <ListToolbar
        search={q}
        onSearchChange={setQ}
        onAdd={hasPermission('categories.manage') ? openCreate : undefined}
        addLabel="Add Category"
        onRefresh={reload}
        refreshing={loading}
      />

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
        rowActions={
          hasPermission('categories.manage')
            ? (c) => (
                <>
                  <IconButton size="small" aria-label="Edit" onClick={() => openEdit(c)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" aria-label="Delete" color="error" onClick={() => remove(c)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </>
              )
            : undefined
        }
      />

      <Modal open={showForm} title={editing ? 'Edit Category' : 'Add Category'} onClose={() => setShowForm(false)}>
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
                  label="Description"
                  fullWidth
                  multiline
                  rows={2}
                  value={form.description}
                  onChange={(e) => {
                    setForm({ ...form, description: e.target.value });
                    clearField('description');
                  }}
                  error={!!fieldErrors?.description}
                  helperText={fieldErrors?.description}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  select
                  label="Parent Category"
                  fullWidth
                  value={form.parent_id}
                  onChange={(e) => setForm({ ...form, parent_id: e.target.value })}
                >
                  <MenuItem value="">— None (top level) —</MenuItem>
                  {data
                    .filter((c) => c.id !== editing?.id)
                    .map((c) => (
                      <MenuItem key={c.id} value={c.id}>
                        {c.name}
                      </MenuItem>
                    ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={form.is_active}
                      onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                    />
                  }
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
    </div>
  );
}
