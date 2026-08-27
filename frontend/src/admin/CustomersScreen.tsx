import { useState } from 'react';
import { api, ApiError } from '../api/client';
import type { Customer, PointsHistoryEntry } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { useConfirm } from '../ConfirmDialog';
import { useSnackbar } from '../Snackbar';
import { useList } from './useList';
import { useFormErrors } from './useFormErrors';
import { DataTable, type Column } from './DataTable';
import { ListToolbar } from './ListToolbar';
import { InlineSelectFilter } from './InlineSelectFilter';
import { Modal } from './Modal';
import { DetailView, StatusChip } from './DetailView';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import EditIcon from '@mui/icons-material/Edit';
import LoyaltyIcon from '@mui/icons-material/Loyalty';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import InputAdornment from '@mui/material/InputAdornment';
import Tooltip from '@mui/material/Tooltip';
import Divider from '@mui/material/Divider';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';

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
  const [statusFilter, setStatusFilter] = useState('');
  const { data, meta, loading, error, page, setPage, perPage, setPerPage, sort, setSort, q, setQ, reload } = useList<Customer>('/customers', {
    is_active: statusFilter,
  });

  const [editing, setEditing] = useState<Customer | null>(null);
  const [viewing, setViewing] = useState<Customer | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const { fieldErrors, formError, clearErrors, clearField, reportError } = useFormErrors();

  const [pointsCustomer, setPointsCustomer] = useState<Customer | null>(null);
  const [pointsDelta, setPointsDelta] = useState('');
  const [pointsNote, setPointsNote] = useState('');
  const [pointsSaving, setPointsSaving] = useState(false);
  const [pointsHistory, setPointsHistory] = useState<PointsHistoryEntry[]>([]);
  const [pointsHistoryLoading, setPointsHistoryLoading] = useState(false);
  const pointsErrors = useFormErrors();

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

  async function toggleActive(customer: Customer) {
    const activating = Number(customer.is_active) !== 1;
    const verb = activating ? 'Activate' : 'Deactivate';
    if (!(await confirm(`${verb} customer "${customer.name}"?`, { title: `${verb} Customer`, confirmLabel: verb }))) return;
    try {
      await api.put(`/customers/${customer.id}`, { is_active: activating ? 1 : 0 });
      reload();
      notify(`Customer ${activating ? 'activated' : 'deactivated'}`);
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Failed to update customer', 'error');
    }
  }

  function openPoints(customer: Customer) {
    setPointsCustomer(customer);
    setPointsDelta('');
    setPointsNote('');
    pointsErrors.clearErrors();
    loadPointsHistory(customer.id);
  }

  async function loadPointsHistory(customerId: number) {
    setPointsHistoryLoading(true);
    try {
      const history = await api.get<PointsHistoryEntry[]>(`/customers/${customerId}/points-history`);
      setPointsHistory(history);
    } catch {
      setPointsHistory([]);
    } finally {
      setPointsHistoryLoading(false);
    }
  }

  async function submitPoints() {
    if (!pointsCustomer) return;
    const delta = Number(pointsDelta);
    if (!pointsDelta || !Number.isInteger(delta)) {
      pointsErrors.reportError(null, 'Enter a whole number of points (use a minus sign to deduct).');
      return;
    }
    setPointsSaving(true);
    pointsErrors.clearErrors();
    try {
      const updated = await api.post<Customer>(`/customers/${pointsCustomer.id}/points`, {
        points_delta: delta,
        note: pointsNote || undefined,
      });
      setPointsCustomer(updated);
      setPointsDelta('');
      setPointsNote('');
      loadPointsHistory(updated.id);
      reload();
      notify('Points updated');
    } catch (err) {
      pointsErrors.reportError(err, 'Failed to update points');
    } finally {
      setPointsSaving(false);
    }
  }

  const columns: Column<Customer>[] = [
    { key: 'customer_code', label: 'Customer No', sortKey: 'customer_code' },
    { key: 'name', label: 'Name', sortKey: 'name' },
    { key: 'email', label: 'Email', render: (c) => c.email ?? '—' },
    { key: 'mobile', label: 'Mobile', render: (c) => c.mobile ?? '—' },
    ...(hasPermission('loyalty.view')
      ? [{ key: 'points', label: 'Points', width: 100, render: (c: Customer) => (c.points ?? 0).toLocaleString() } as Column<Customer>]
      : []),
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
        rowActions={(c) => {
          const active = Number(c.is_active) === 1;
          return (
            <>
              <Tooltip title="View">
                <IconButton size="small" aria-label="View" onClick={() => setViewing(c)}>
                  <VisibilityOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              {hasPermission('customers.update') && (
                <>
                  <Tooltip title="Edit">
                    <IconButton size="small" aria-label="Edit" onClick={() => openEdit(c)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  {hasPermission('loyalty.manage') && (
                    <Tooltip title="Adjust Points">
                      <IconButton size="small" aria-label="Adjust Points" onClick={() => openPoints(c)}>
                        <LoyaltyIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  <Tooltip title={active ? 'Deactivate' : 'Activate'}>
                    <IconButton
                      size="small"
                      aria-label={active ? 'Deactivate' : 'Activate'}
                      color={active ? 'error' : 'success'}
                      onClick={() => toggleActive(c)}
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

      <Modal open={showForm} title={editing ? 'Edit Customer' : 'Add Customer'} onClose={() => setShowForm(false)} compact>
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
                  label="Customer No"
                  fullWidth
                  disabled
                  value={editing ? editing.customer_code : saving ? 'Generating…' : 'Auto-generated on save'}
                  slotProps={{
                    input: {
                      endAdornment:
                        !editing && saving ? (
                          <InputAdornment position="end">
                            <CircularProgress size={16} />
                          </InputAdornment>
                        ) : undefined,
                    },
                  }}
                />
              </Grid>
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

      <Modal open={!!viewing} title="View Customer" onClose={() => setViewing(null)} compact>
        <DetailView
          fields={[
            { label: 'Customer No', value: viewing?.customer_code },
            { label: 'Name', value: viewing?.name },
            { label: 'Email', value: viewing?.email },
            { label: 'Mobile', value: viewing?.mobile },
            ...(hasPermission('loyalty.view') ? [{ label: 'Points', value: (viewing?.points ?? 0).toLocaleString() }] : []),
            { label: 'Status', value: viewing ? <StatusChip active={Number(viewing.is_active) === 1} /> : undefined },
          ]}
        />
        <Stack direction="row" sx={{ justifyContent: 'flex-end', mt: 3 }}>
          <Button variant="text" onClick={() => setViewing(null)}>
            Close
          </Button>
        </Stack>
      </Modal>

      <Modal open={!!pointsCustomer} title="Points History" onClose={() => setPointsCustomer(null)} wide>
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {pointsCustomer?.name} — current balance: <strong>{(pointsCustomer?.points ?? 0).toLocaleString()} pts</strong>
          </Typography>

          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              submitPoints();
            }}
          >
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: 'flex-start' }}>
              <TextField
                label="Points to add or remove"
                autoFocus
                value={pointsDelta}
                onChange={(e) => {
                  setPointsDelta(e.target.value);
                  pointsErrors.clearField('points_delta');
                }}
                helperText={pointsErrors.fieldErrors?.points_delta ?? 'Negative to deduct, e.g. -20'}
                error={!!pointsErrors.fieldErrors?.points_delta}
                sx={{ flex: 1, width: { xs: '100%', sm: 'auto' } }}
              />
              <TextField
                label="Note (optional)"
                value={pointsNote}
                onChange={(e) => setPointsNote(e.target.value)}
                sx={{ flex: 2, width: { xs: '100%', sm: 'auto' } }}
              />
              <Button type="submit" variant="contained" disabled={pointsSaving} sx={{ mt: { xs: 0, sm: 1 } }}>
                {pointsSaving ? 'Adding…' : 'Add'}
              </Button>
            </Stack>

            {pointsErrors.formError && (
              <Alert severity="error" sx={{ mt: 1.5 }}>
                {pointsErrors.formError}
              </Alert>
            )}
          </form>

          <Divider />

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
              History
            </Typography>
            {pointsHistoryLoading ? (
              <Stack sx={{ alignItems: 'center', py: 3 }}>
                <CircularProgress size={22} />
              </Stack>
            ) : pointsHistory.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No point activity yet.
              </Typography>
            ) : (
              <Box sx={{ maxHeight: 320, overflow: 'auto' }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell align="right">Change</TableCell>
                      <TableCell align="right">Balance</TableCell>
                      <TableCell>Note</TableCell>
                      <TableCell>By</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pointsHistory.map((h) => (
                      <TableRow key={h.id}>
                        <TableCell>{new Date(h.created_at).toLocaleString()}</TableCell>
                        <TableCell align="right">
                          <Typography
                            component="span"
                            variant="body2"
                            sx={{ fontWeight: 600, color: h.points_delta >= 0 ? 'success.main' : 'error.main' }}
                          >
                            {h.points_delta >= 0 ? '+' : ''}
                            {h.points_delta.toLocaleString()}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">{h.balance_after.toLocaleString()}</TableCell>
                        <TableCell>{h.note ?? '—'}</TableCell>
                        <TableCell>{h.created_by_name ?? '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            )}
          </Box>

          <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
            <Button variant="text" onClick={() => setPointsCustomer(null)}>
              Close
            </Button>
          </Stack>
        </Stack>
      </Modal>
    </div>
  );
}
