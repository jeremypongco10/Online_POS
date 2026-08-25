import { useState } from 'react';
import { api, ApiError } from '../api/client';
import type { Supplier } from '../api/types';
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
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';

interface FormState {
  name: string;
  contact_name: string;
  email: string;
  phone: string;
  address: string;
  tax_id: string;
  is_active: boolean;
}

const EMPTY_FORM: FormState = {
  name: '',
  contact_name: '',
  email: '',
  phone: '',
  address: '',
  tax_id: '',
  is_active: true,
};

export function SuppliersScreen() {
  const { hasPermission } = useAuth();
  const confirm = useConfirm();
  const notify = useSnackbar();
  const { data, meta, loading, error, page, setPage, perPage, setPerPage, sort, setSort, q, setQ, reload } = useList<Supplier>('/suppliers');

  const [editing, setEditing] = useState<Supplier | null>(null);
  const [viewing, setViewing] = useState<Supplier | null>(null);
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

  function openEdit(supplier: Supplier) {
    setEditing(supplier);
    setForm({
      name: supplier.name,
      contact_name: supplier.contact_name ?? '',
      email: supplier.email ?? '',
      phone: supplier.phone ?? '',
      address: supplier.address ?? '',
      tax_id: supplier.tax_id ?? '',
      is_active: Number(supplier.is_active) === 1,
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
      reload();
      notify(editing ? 'Supplier updated' : 'Supplier created');
    } catch (err) {
      reportError(err, 'Failed to save supplier');
    } finally {
      setSaving(false);
    }
  }

  async function remove(supplier: Supplier) {
    if (!(await confirm(`Delete supplier "${supplier.name}"?`, { title: 'Delete Supplier', confirmLabel: 'Delete' }))) return;
    try {
      await api.del(`/suppliers/${supplier.id}`);
      reload();
      notify('Supplier deleted');
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Failed to delete supplier', 'error');
    }
  }

  const columns: Column<Supplier>[] = [
    { key: 'name', label: 'Name', sortKey: 'name' },
    { key: 'contact_name', label: 'Contact', render: (s) => s.contact_name ?? '—' },
    { key: 'phone', label: 'Phone', render: (s) => s.phone ?? '—' },
    { key: 'email', label: 'Email', render: (s) => s.email ?? '—' },
    {
      key: 'is_active',
      label: 'Status',
      width: 120,
      render: (s) => (
        <Chip
          size="small"
          label={Number(s.is_active) === 1 ? 'Active' : 'Inactive'}
          color={Number(s.is_active) === 1 ? 'success' : 'default'}
        />
      ),
    },
  ];

  return (
    <div>
      <ListToolbar
        search={q}
        onSearchChange={setQ}
        onAdd={hasPermission('suppliers.manage') ? openCreate : undefined}
        addLabel="Add Supplier"
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
        rowActions={(s) => (
          <>
            <Tooltip title="View">
              <IconButton size="small" aria-label="View" onClick={() => setViewing(s)}>
                <VisibilityOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            {hasPermission('suppliers.manage') && (
              <>
                <Tooltip title="Edit">
                  <IconButton size="small" aria-label="Edit" onClick={() => openEdit(s)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Delete">
                  <IconButton size="small" aria-label="Delete" color="error" onClick={() => remove(s)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </>
            )}
          </>
        )}
      />

      <Modal open={showForm} title={editing ? 'Edit Supplier' : 'Add Supplier'} onClose={() => setShowForm(false)}>
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
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Contact Name"
                  fullWidth
                  value={form.contact_name}
                  onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
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
                <TextField
                  label="Tax ID"
                  fullWidth
                  value={form.tax_id}
                  onChange={(e) => setForm({ ...form, tax_id: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  label="Address"
                  fullWidth
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
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

      <Modal open={!!viewing} title="View Supplier" onClose={() => setViewing(null)}>
        <DetailView
          fields={[
            { label: 'Name', value: viewing?.name },
            { label: 'Contact Name', value: viewing?.contact_name },
            { label: 'Phone', value: viewing?.phone },
            { label: 'Email', value: viewing?.email },
            { label: 'Tax ID', value: viewing?.tax_id },
            { label: 'Status', value: viewing ? <StatusChip active={Number(viewing.is_active) === 1} /> : undefined },
            { label: 'Address', value: viewing?.address, fullWidth: true },
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
