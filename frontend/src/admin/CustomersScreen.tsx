import { useState } from 'react';
import { api, ApiError } from '../api/client';
import type { Customer } from '../api/types';
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
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

interface FormState {
  first_name: string;
  last_name: string;
  email: string;
  mobile: string;
  address: string;
  is_active: boolean;
}

const EMPTY_FORM: FormState = { first_name: '', last_name: '', email: '', mobile: '', address: '', is_active: true };

export function CustomersScreen() {
  const { hasPermission } = useAuth();
  const confirm = useConfirm();
  const notify = useSnackbar();
  const { data, meta, loading, error, page, setPage, perPage, setPerPage, sort, setSort, q, setQ, reload } = useList<Customer>('/customers');

  const [editing, setEditing] = useState<Customer | null>(null);
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

  function openEdit(customer: Customer) {
    setEditing(customer);
    setForm({
      first_name: customer.first_name,
      last_name: customer.last_name,
      email: customer.email ?? '',
      mobile: customer.mobile ?? '',
      address: '',
      is_active: Number(customer.is_active) === 1,
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
      reload();
      notify(editing ? 'Customer updated' : 'Customer created');
    } catch (err) {
      reportError(err, 'Failed to save customer');
    } finally {
      setSaving(false);
    }
  }

  async function remove(customer: Customer) {
    if (!(await confirm(`Delete customer "${customer.name}"?`, { title: 'Delete Customer', confirmLabel: 'Delete' }))) return;
    try {
      await api.del(`/customers/${customer.id}`);
      reload();
      notify('Customer deleted');
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Failed to delete customer', 'error');
    }
  }

  const columns: Column<Customer>[] = [
    { key: 'customer_code', label: 'Code', sortKey: 'customer_code' },
    { key: 'name', label: 'Name', sortKey: 'name' },
    { key: 'email', label: 'Email', render: (c) => c.email ?? '—' },
    { key: 'mobile', label: 'Mobile', render: (c) => c.mobile ?? '—' },
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
        onAdd={hasPermission('customers.create') ? openCreate : undefined}
        addLabel="Add Customer"
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
          hasPermission('customers.update')
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

      <Modal open={showForm} title={editing ? 'Edit Customer' : 'Add Customer'} onClose={() => setShowForm(false)}>
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              submitForm();
            }}
          >
            <Grid container spacing={2} sx={{ pt: 1 }}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="First Name"
                  fullWidth
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
    </div>
  );
}
