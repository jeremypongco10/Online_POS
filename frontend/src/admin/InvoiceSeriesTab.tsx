import { useEffect, useMemo, useState } from 'react';
import { api, ApiError } from '../api/client';
import type { Company, InvoiceSeries, Store, AuditLog } from '../api/types';
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
import { DetailView } from './DetailView';
import Stack from '@mui/material/Stack';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import EditIcon from '@mui/icons-material/Edit';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import NumbersOutlinedIcon from '@mui/icons-material/NumbersOutlined';

interface FormState {
  store_id: string;
  invoice_type: string;
  series_code: string;
  prefix: string;
  suffix: string;
  starting_number: string;
  current_number: string;
  maximum_number: string;
  number_length: string;
  warning_threshold: string;
  critical_threshold: string;
  effective_from: string;
  effective_to: string;
  status: 'active' | 'inactive' | 'exhausted';
}

const today = () => new Date().toISOString().slice(0, 10);

function emptyForm(storeId: string): FormState {
  return {
    store_id: storeId,
    invoice_type: 'Sales Invoice',
    series_code: String(new Date().getFullYear()),
    prefix: 'SI-',
    suffix: '',
    starting_number: '1',
    current_number: '0',
    maximum_number: '99999999',
    number_length: '8',
    warning_threshold: '10000',
    critical_threshold: '1000',
    effective_from: today(),
    effective_to: '',
    status: 'active',
  };
}

/** The three BIR terms this system's own tax handling already assumes (see regional.ts) — offered as one-tap presets, never enforced: an admin can type anything their actual BIR permit calls it (spec §16). */
const INVOICE_TYPE_PRESETS = ['Sales Invoice', 'VAT Invoice', 'Non-VAT Invoice', 'Service Invoice'];

const STATUS_COLOR: Record<InvoiceSeries['status'], 'success' | 'default' | 'error'> = {
  active: 'success',
  inactive: 'default',
  exhausted: 'error',
};

const HISTORY_ACTION_LABEL: Record<string, string> = {
  create: 'Created',
  update: 'Updated',
  activate: 'Activated',
  deactivate: 'Deactivated',
};
const HISTORY_ACTION_COLOR: Record<string, 'success' | 'error' | 'warning' | 'default'> = {
  create: 'success',
  update: 'default',
  activate: 'success',
  deactivate: 'warning',
};

const RESET_RULE_OPTIONS: { value: Company['transaction_no_reset_rule']; label: string; detail: string }[] = [
  {
    value: 'per_session',
    label: 'Per cash session',
    detail: 'Resets to 1 each time a register opens a new cash session — matches shift-based reconciliation (X/Z-reading).',
  },
  {
    value: 'per_register',
    label: 'Per register, never resets',
    detail: 'One continuously-climbing sequence per register, for as long as that register exists.',
  },
  {
    value: 'per_day',
    label: 'Per register, per day',
    detail: 'Resets to 1 at the start of each calendar day, per register.',
  },
];

/**
 * Settings → Sales Invoicing. Two cards, matching spec §12 exactly: a
 * read-only Business Information card (the branch's own registered
 * identity — editing any of it happens on the Stores/Company screens this
 * only reads from, not here) and the Invoice Series table itself, with
 * Add/View/Edit/Activate/Deactivate/View History actions and deliberately
 * no Reset Number action anywhere.
 *
 * Numbering is never generated here — this screen only configures the
 * series a real sale later draws from via InvoiceSeriesModel::nextNumber()
 * (see SalesController::create() on the backend). A cashier never reaches
 * this tab at all (gated on invoice-series.view/.manage, neither of which
 * any cashier-facing role holds).
 */
export function InvoiceSeriesTab() {
  const { user, hasPermission } = useAuth();
  const canManage = hasPermission('invoice-series.manage');
  const canManageCompany = hasPermission('companies.manage');
  const confirm = useConfirm();
  const notify = useSnackbar();

  const [stores, setStores] = useState<Store[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    if (!user) return;
    api.get<Store[]>(`/stores?company_id=${user.company_id}&per_page=200`).then((data) => {
      setStores(data);
      setSelectedStoreId((prev) => prev || (data.length > 0 ? String(data[0].id) : ''));
    });
    api.get<Company>(`/companies/${user.company_id}`).then(setCompany);
  }, [user]);

  // Business profile — the company-wide registered identity. Its own
  // card and save action, separate from both the branch fields beside it
  // (those live in Stores) and the numbering below.
  const [profile, setProfile] = useState({ legal_name: '', tax_id: '', is_vat_registered: '0', vat_registration_number: '' });
  const [profileSaving, setProfileSaving] = useState(false);
  const {
    fieldErrors: profileErrors,
    formError: profileError,
    clearErrors: clearProfileErrors,
    clearField: clearProfileField,
    reportError: reportProfileError,
  } = useFormErrors();

  useEffect(() => {
    if (!company) return;
    setProfile({
      legal_name: company.legal_name ?? '',
      tax_id: company.tax_id ?? '',
      is_vat_registered: Number(company.is_vat_registered) === 1 ? '1' : '0',
      vat_registration_number: company.vat_registration_number ?? '',
    });
  }, [company]);

  async function saveProfile() {
    if (!company) return;
    setProfileSaving(true);
    clearProfileErrors();
    try {
      const updated = await api.put<Company>(`/companies/${company.id}`, {
        legal_name: profile.legal_name || null,
        tax_id: profile.tax_id || null,
        is_vat_registered: profile.is_vat_registered === '1' ? 1 : 0,
        // Cleared alongside the flag: a VAT number left behind on a
        // business that has since deregistered would keep printing.
        vat_registration_number: profile.is_vat_registered === '1' ? profile.vat_registration_number || null : null,
      });
      setCompany(updated);
      notify('Business profile updated');
    } catch (err) {
      reportProfileError(err, 'Failed to save the business profile');
    } finally {
      setProfileSaving(false);
    }
  }

  // Transaction Numbering — deliberately its own card/save action, kept
  // out of the Invoice Series form's state entirely: it edits a company
  // setting via a completely different endpoint (PUT /companies/{id}),
  // not an invoice_series row, and shares nothing with that form except
  // living on the same tab.
  const [txnRule, setTxnRule] = useState<Company['transaction_no_reset_rule']>('per_session');
  const [txnPrefix, setTxnPrefix] = useState('');
  const [txnLength, setTxnLength] = useState('0');
  const [txnSaving, setTxnSaving] = useState(false);
  const {
    fieldErrors: txnFieldErrors,
    formError: txnFormError,
    clearErrors: clearTxnErrors,
    clearField: clearTxnField,
    reportError: reportTxnError,
  } = useFormErrors();

  useEffect(() => {
    if (!company) return;
    setTxnRule(company.transaction_no_reset_rule);
    setTxnPrefix(company.transaction_no_prefix ?? '');
    setTxnLength(String(company.transaction_no_length));
  }, [company]);

  const txnPreview = useMemo(() => {
    const length = Number(txnLength) || 0;
    const padded = length > 0 ? '1'.padStart(length, '0') : '1';
    return `${txnPrefix}${padded}`;
  }, [txnPrefix, txnLength]);

  async function saveTransactionNumbering() {
    if (!company) return;
    setTxnSaving(true);
    clearTxnErrors();
    try {
      const updated = await api.put<Company>(`/companies/${company.id}`, {
        transaction_no_reset_rule: txnRule,
        transaction_no_prefix: txnPrefix || null,
        transaction_no_length: txnLength || '0',
      });
      setCompany(updated);
      notify('Transaction numbering updated');
    } catch (err) {
      reportTxnError(err, 'Failed to save transaction numbering');
    } finally {
      setTxnSaving(false);
    }
  }

  const selectedStore = stores.find((s) => String(s.id) === selectedStoreId) ?? null;

  const { data, meta, loading, error, page, setPage, perPage, setPerPage, sort, setSort, q, setQ, reload } = useList<InvoiceSeries>(
    '/invoice-series',
    { store_id: selectedStoreId || undefined, status: statusFilter || undefined }
  );

  const [editing, setEditing] = useState<InvoiceSeries | null>(null);
  const [viewing, setViewing] = useState<InvoiceSeries | null>(null);
  const [historyFor, setHistoryFor] = useState<InvoiceSeries | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm(selectedStoreId));
  const [saving, setSaving] = useState(false);
  const { fieldErrors, formError, clearErrors, clearField, reportError } = useFormErrors();

  function openCreate() {
    setEditing(null);
    setForm(emptyForm(selectedStoreId));
    clearErrors();
    setShowForm(true);
  }

  // Locked once a series has actually issued a number: its identity
  // (which branch, which invoice type, where it starts) must never move
  // out from under numbers already printed on a real receipt — only the
  // forward-looking fields (maximum, thresholds, effective-to, status)
  // stay editable. See CartLine.voided-style "never rewrite history"
  // reasoning throughout this module's own backend design.
  const editingIsLocked = editing !== null && Number(editing.current_number) > 0;

  function openEdit(row: InvoiceSeries) {
    setEditing(row);
    setForm({
      store_id: String(row.store_id),
      invoice_type: row.invoice_type,
      series_code: row.series_code,
      prefix: row.prefix ?? '',
      suffix: row.suffix ?? '',
      starting_number: String(row.starting_number),
      current_number: String(row.current_number),
      maximum_number: String(row.maximum_number),
      number_length: String(row.number_length),
      warning_threshold: String(row.warning_threshold),
      critical_threshold: String(row.critical_threshold),
      effective_from: row.effective_from.slice(0, 10),
      effective_to: row.effective_to ? row.effective_to.slice(0, 10) : '',
      status: row.status,
    });
    clearErrors();
    setShowForm(true);
  }

  // Fast, client-side echo of spec §13's own rules (starting ≤ maximum,
  // number_length long enough for maximum) — the server re-checks all of
  // this regardless (InvoiceSeriesModel::validateBusinessRules), this is
  // only for a same-keystroke error instead of a round trip to find out.
  const clientErrors = useMemo(() => {
    const errors: Partial<Record<keyof FormState, string>> = {};
    const starting = Number(form.starting_number);
    const maximum = Number(form.maximum_number);
    const length = Number(form.number_length);
    if (starting > 0 && maximum > 0 && starting > maximum) {
      errors.starting_number = 'Starting number must not exceed the maximum number.';
    }
    if (maximum > 0 && length > 0 && String(maximum).length > length) {
      errors.number_length = `Number length must be long enough to print the maximum number (${maximum}).`;
    }
    if (form.effective_from && form.effective_to && form.effective_to < form.effective_from) {
      errors.effective_to = 'Effective To cannot be earlier than Effective From.';
    }
    return errors;
  }, [form.starting_number, form.maximum_number, form.number_length, form.effective_from, form.effective_to]);

  const preview = useMemo(() => {
    const shown = Number(form.current_number) > 0 ? form.current_number : form.starting_number || '0';
    const padded = String(shown).padStart(Number(form.number_length) || String(shown).length, '0');
    return `${form.prefix}${form.series_code}-${padded}${form.suffix}`;
  }, [form.prefix, form.series_code, form.current_number, form.starting_number, form.number_length, form.suffix]);

  async function submitForm() {
    if (Object.keys(clientErrors).length > 0) return;

    setSaving(true);
    clearErrors();
    const payload = {
      store_id: Number(form.store_id),
      invoice_type: form.invoice_type,
      series_code: form.series_code,
      prefix: form.prefix || null,
      suffix: form.suffix || null,
      starting_number: form.starting_number,
      current_number: form.current_number,
      maximum_number: form.maximum_number,
      number_length: form.number_length,
      warning_threshold: form.warning_threshold,
      critical_threshold: form.critical_threshold,
      effective_from: form.effective_from,
      effective_to: form.effective_to || null,
      status: form.status,
    };
    try {
      if (editing) await api.put(`/invoice-series/${editing.id}`, payload);
      else await api.post('/invoice-series', payload);
      setShowForm(false);
      reload();
      notify(editing ? 'Invoice series updated' : 'Invoice series created');
    } catch (err) {
      reportError(err, 'Failed to save invoice series');
    } finally {
      setSaving(false);
    }
  }

  async function activate(row: InvoiceSeries) {
    if (!(await confirm(`Activate series "${row.prefix ?? ''}${row.series_code}"?`, { title: 'Activate Series', confirmLabel: 'Activate' }))) return;
    try {
      await api.post(`/invoice-series/${row.id}/activate`, {});
      reload();
      notify('Series activated');
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Failed to activate series', 'error');
    }
  }

  async function deactivate(row: InvoiceSeries) {
    if (!(await confirm(`Deactivate series "${row.prefix ?? ''}${row.series_code}"?`, { title: 'Deactivate Series', confirmLabel: 'Deactivate' }))) return;
    try {
      await api.post(`/invoice-series/${row.id}/deactivate`, {});
      reload();
      notify('Series deactivated');
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Failed to deactivate series', 'error');
    }
  }

  const storeOptions = stores.map((s) => ({ value: String(s.id), label: `${s.name} (${s.code})` }));

  const columns: Column<InvoiceSeries>[] = [
    {
      key: 'series',
      label: 'Series',
      sortKey: 'series_code',
      render: (r) => (
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {(r.prefix ?? '') + r.series_code}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {r.number_length}-digit
          </Typography>
        </Box>
      ),
    },
    { key: 'invoice_type', label: 'Invoice Type', render: (r) => r.invoice_type },
    { key: 'current_number', label: 'Current No.', align: 'right', render: (r) => Number(r.current_number).toLocaleString('en-PH') },
    { key: 'maximum_number', label: 'Maximum No.', align: 'right', render: (r) => Number(r.maximum_number).toLocaleString('en-PH') },
    {
      key: 'remaining',
      label: 'Remaining',
      align: 'right',
      render: (r) => {
        const remaining = Number(r.maximum_number) - Number(r.current_number);
        const color =
          remaining <= Number(r.critical_threshold) ? 'error.main' : remaining <= Number(r.warning_threshold) ? 'warning.main' : 'text.primary';
        return (
          <Typography variant="body2" sx={{ fontWeight: 700, color }}>
            {remaining.toLocaleString('en-PH')}
          </Typography>
        );
      },
    },
    {
      key: 'status',
      label: 'Status',
      width: 120,
      render: (r) => <Chip size="small" label={r.status[0].toUpperCase() + r.status.slice(1)} color={STATUS_COLOR[r.status]} />,
    },
  ];

  return (
    <Stack spacing={2.5}>
      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
          Business Information
        </Typography>
        {/* Editable, where this card used to be read-only and pointed at
            "the Company profile" for the name/TIN/VAT status — a screen
            that has never existed anywhere in this app, leaving the three
            fields that print at the top of every BIR receipt with no way
            to set them at all. The branch half below stays read-only and
            still points at Stores, which is a real screen. */}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
          The registered identity printed at the top of every receipt this business issues. Branch details below come from Settings → Stores.
        </Typography>

        <Grid container spacing={2} sx={{ mb: 1 }}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Registered Business Name"
              fullWidth
              value={profile.legal_name}
              onChange={(e) => {
                setProfile({ ...profile, legal_name: e.target.value });
                clearProfileField('legal_name');
              }}
              error={!!profileErrors?.legal_name}
              helperText={profileErrors?.legal_name ?? 'As registered with the BIR — falls back to the trade name if blank.'}
              disabled={!canManageCompany}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="TIN"
              fullWidth
              value={profile.tax_id}
              onChange={(e) => {
                setProfile({ ...profile, tax_id: e.target.value });
                clearProfileField('tax_id');
              }}
              error={!!profileErrors?.tax_id}
              helperText={profileErrors?.tax_id ?? 'Prints as "TIN:" on every receipt.'}
              disabled={!canManageCompany}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <SearchableSelect
              label="VAT Status"
              value={profile.is_vat_registered}
              onChange={(v) => setProfile({ ...profile, is_vat_registered: v })}
              options={[
                { value: '1', label: 'VAT Registered' },
                { value: '0', label: 'Non-VAT' },
              ]}
              fullWidth
              disabled={!canManageCompany}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="VAT Registration Number"
              fullWidth
              value={profile.vat_registration_number}
              onChange={(e) => {
                setProfile({ ...profile, vat_registration_number: e.target.value });
                clearProfileField('vat_registration_number');
              }}
              error={!!profileErrors?.vat_registration_number}
              helperText={profileErrors?.vat_registration_number ?? 'Leave blank if not VAT registered.'}
              disabled={!canManageCompany || profile.is_vat_registered !== '1'}
            />
          </Grid>

          {profileError && (
            <Grid size={{ xs: 12 }}>
              <Alert severity="error">{profileError}</Alert>
            </Grid>
          )}

          {canManageCompany && (
            <Grid size={{ xs: 12 }}>
              <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
                <Button variant="contained" onClick={saveProfile} disabled={profileSaving}>
                  {profileSaving ? 'Saving…' : 'Save Business Profile'}
                </Button>
              </Stack>
            </Grid>
          )}
        </Grid>

        <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 2, mb: 1.5 }}>
          Branch
        </Typography>
        <Box sx={{ maxWidth: 360, mb: 2 }}>
          <SearchableSelect label="Branch" value={selectedStoreId} onChange={setSelectedStoreId} options={storeOptions} fullWidth />
        </Box>

        <DetailView
          fields={[
            { label: 'Branch', value: selectedStore?.name ?? '—' },
            { label: 'Branch Code', value: selectedStore?.code ?? '—' },
            { label: 'Registered Address', value: selectedStore?.address ?? company?.address ?? '—', fullWidth: true },
          ]}
        />
      </Paper>

      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
          Invoice Series
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          The active series is what the POS draws every invoice number from — continuously, never reset. A series that reaches its maximum number
          retires itself automatically; configure a new one rather than reusing or resetting it.
        </Typography>

        <ListToolbar
          search={q}
          onSearchChange={setQ}
          onAdd={canManage && selectedStoreId ? openCreate : undefined}
          addLabel="Add Series"
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
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
                { value: 'exhausted', label: 'Exhausted' },
              ]}
            />
          }
        />

        {!selectedStoreId ? (
          <Alert severity="info" sx={{ mt: 2 }}>
            Add a store before configuring an invoice series.
          </Alert>
        ) : (
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
                <Tooltip title="View History">
                  <IconButton size="small" aria-label="View History" onClick={() => setHistoryFor(r)}>
                    <HistoryOutlinedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                {canManage && r.status !== 'exhausted' && (
                  <>
                    <Tooltip title="Edit">
                      <IconButton size="small" aria-label="Edit" onClick={() => openEdit(r)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {r.status === 'active' ? (
                      <Tooltip title="Deactivate">
                        <IconButton size="small" aria-label="Deactivate" color="error" onClick={() => deactivate(r)}>
                          <BlockIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ) : (
                      <Tooltip title="Activate">
                        <IconButton size="small" aria-label="Activate" color="success" onClick={() => activate(r)}>
                          <CheckCircleIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </>
                )}
              </>
            )}
          />
        )}
      </Paper>

      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 0.5 }}>
          <NumbersOutlinedIcon color="primary" />
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Transaction Numbering
          </Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
          A plain internal shift reference printed on the receipt alongside the invoice number — not a legal document number, so it has no BIR
          requirements of its own. Deliberately separate from the Invoice Series configuration above: change this without it affecting invoice
          numbering in any way, or vice versa.
        </Typography>

        <Grid container spacing={2} sx={{ maxWidth: 640 }}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <SearchableSelect
              label="Resets"
              value={txnRule}
              onChange={(v) => {
                setTxnRule(v as Company['transaction_no_reset_rule']);
                clearTxnField('transaction_no_reset_rule');
              }}
              options={RESET_RULE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
              fullWidth
              disabled={!canManageCompany}
            />
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              {RESET_RULE_OPTIONS.find((o) => o.value === txnRule)?.detail}
            </Typography>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <TextField
              label="Prefix (optional)"
              fullWidth
              value={txnPrefix}
              onChange={(e) => {
                setTxnPrefix(e.target.value);
                clearTxnField('transaction_no_prefix');
              }}
              error={!!txnFieldErrors?.transaction_no_prefix}
              helperText={txnFieldErrors?.transaction_no_prefix}
              disabled={!canManageCompany}
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <TextField
              label="Number Length"
              type="number"
              fullWidth
              value={txnLength}
              onChange={(e) => {
                setTxnLength(e.target.value);
                clearTxnField('transaction_no_length');
              }}
              error={!!txnFieldErrors?.transaction_no_length}
              helperText={txnFieldErrors?.transaction_no_length ?? '0 = no padding'}
              slotProps={{ htmlInput: { min: 0, step: 1 } }}
              disabled={!canManageCompany}
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: 'action.hover' }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Preview
              </Typography>
              <Typography sx={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontWeight: 700, fontSize: 18 }}>
                {txnPreview}
              </Typography>
            </Paper>
          </Grid>

          {txnFormError && (
            <Grid size={{ xs: 12 }}>
              <Alert severity="error">{txnFormError}</Alert>
            </Grid>
          )}

          {canManageCompany && (
            <Grid size={{ xs: 12 }}>
              <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
                <Button variant="contained" onClick={saveTransactionNumbering} disabled={txnSaving}>
                  {txnSaving ? 'Saving…' : 'Save'}
                </Button>
              </Stack>
            </Grid>
          )}
        </Grid>
      </Paper>

      <Modal open={showForm} title={editing ? 'Edit Invoice Series' : 'Add Invoice Series'} onClose={() => setShowForm(false)} wide>
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            submitForm();
          }}
        >
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <SearchableSelect
                label="Branch"
                value={form.store_id}
                onChange={(v) => setForm({ ...form, store_id: v })}
                options={storeOptions}
                fullWidth
                required
                disabled={editingIsLocked}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Invoice Type"
                fullWidth
                value={form.invoice_type}
                onChange={(e) => {
                  setForm({ ...form, invoice_type: e.target.value });
                  clearField('invoice_type');
                }}
                error={!!fieldErrors?.invoice_type}
                helperText={fieldErrors?.invoice_type ?? `Common: ${INVOICE_TYPE_PRESETS.join(', ')}`}
                required
                disabled={editingIsLocked}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="Series Code"
                fullWidth
                value={form.series_code}
                onChange={(e) => {
                  setForm({ ...form, series_code: e.target.value });
                  clearField('series_code');
                }}
                error={!!fieldErrors?.series_code}
                helperText={fieldErrors?.series_code}
                required
                disabled={editingIsLocked}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 4 }}>
              <TextField label="Prefix" fullWidth value={form.prefix} onChange={(e) => setForm({ ...form, prefix: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 6, sm: 4 }}>
              <TextField label="Suffix (optional)" fullWidth value={form.suffix} onChange={(e) => setForm({ ...form, suffix: e.target.value })} />
            </Grid>

            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="Starting Number"
                type="number"
                fullWidth
                value={form.starting_number}
                onChange={(e) => {
                  setForm({ ...form, starting_number: e.target.value });
                  clearField('starting_number');
                }}
                error={!!fieldErrors?.starting_number || !!clientErrors.starting_number}
                helperText={fieldErrors?.starting_number ?? clientErrors.starting_number}
                required
                disabled={editingIsLocked}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="Current Number"
                type="number"
                fullWidth
                value={form.current_number}
                onChange={(e) => setForm({ ...form, current_number: e.target.value })}
                // Only ever set once, when migrating an already-partially-
                // used legacy series — never editable afterward (no Reset
                // Number anywhere in this module).
                disabled={editing !== null}
                helperText={editing ? 'Only settable when the series is first created.' : "Where a migrated legacy series already left off — 0 for a brand-new one."}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="Maximum Number"
                type="number"
                fullWidth
                value={form.maximum_number}
                onChange={(e) => {
                  setForm({ ...form, maximum_number: e.target.value });
                  clearField('maximum_number');
                }}
                error={!!fieldErrors?.maximum_number}
                helperText={fieldErrors?.maximum_number}
                required
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="Number Length"
                type="number"
                fullWidth
                value={form.number_length}
                onChange={(e) => {
                  setForm({ ...form, number_length: e.target.value });
                  clearField('number_length');
                }}
                error={!!fieldErrors?.number_length || !!clientErrors.number_length}
                helperText={fieldErrors?.number_length ?? clientErrors.number_length ?? 'Digits printed, e.g. 8 for 00000001'}
                required
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 4 }}>
              <TextField
                label="Warning At (remaining)"
                type="number"
                fullWidth
                value={form.warning_threshold}
                onChange={(e) => setForm({ ...form, warning_threshold: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 4 }}>
              <TextField
                label="Critical At (remaining)"
                type="number"
                fullWidth
                value={form.critical_threshold}
                onChange={(e) => setForm({ ...form, critical_threshold: e.target.value })}
              />
            </Grid>

            <Grid size={{ xs: 6, sm: 4 }}>
              <TextField
                label="Effective From"
                type="date"
                fullWidth
                value={form.effective_from}
                onChange={(e) => setForm({ ...form, effective_from: e.target.value })}
                slotProps={{ inputLabel: { shrink: true } }}
                required
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 4 }}>
              <TextField
                label="Effective To (optional)"
                type="date"
                fullWidth
                value={form.effective_to}
                onChange={(e) => setForm({ ...form, effective_to: e.target.value })}
                slotProps={{ inputLabel: { shrink: true } }}
                error={!!fieldErrors?.effective_to || !!clientErrors.effective_to}
                helperText={fieldErrors?.effective_to ?? clientErrors.effective_to}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <SearchableSelect
                label="Status"
                value={form.status}
                onChange={(v) => {
                  setForm({ ...form, status: v as FormState['status'] });
                  clearField('status');
                }}
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                  ...(editing?.status === 'exhausted' ? [{ value: 'exhausted', label: 'Exhausted' }] : []),
                ]}
                fullWidth
                disabled={editing?.status === 'exhausted'}
                // The overlap rule ("Another series is already active…")
                // comes back keyed to this field — without wiring it here
                // a rejected submit would fail with no visible feedback at
                // all, since it's not a generic formError.
                error={!!fieldErrors?.status}
                helperText={fieldErrors?.status}
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: 'action.hover' }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Preview
                </Typography>
                <Typography sx={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontWeight: 700, fontSize: 18 }}>
                  {preview}
                </Typography>
              </Paper>
            </Grid>

            {editingIsLocked && (
              <Grid size={{ xs: 12 }}>
                <Alert severity="info">
                  This series has already issued numbers — Branch, Invoice Type, Series Code, and Starting Number can no longer be changed. Configure
                  a new series instead if the numbering needs to change.
                </Alert>
              </Grid>
            )}
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
                <Button type="submit" variant="contained" disabled={saving || Object.keys(clientErrors).length > 0}>
                  {saving ? 'Saving…' : 'Save'}
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </form>
      </Modal>

      <Modal open={!!viewing} title="View Invoice Series" onClose={() => setViewing(null)} compact>
        {viewing && (
          <>
            <DetailView
              fields={[
                { label: 'Series', value: (viewing.prefix ?? '') + viewing.series_code + (viewing.suffix ?? '') },
                { label: 'Invoice Type', value: viewing.invoice_type },
                { label: 'Branch', value: stores.find((s) => s.id === viewing.store_id)?.name ?? `#${viewing.store_id}` },
                { label: 'Status', value: <Chip size="small" label={viewing.status} color={STATUS_COLOR[viewing.status]} /> },
                { label: 'Starting Number', value: Number(viewing.starting_number).toLocaleString('en-PH') },
                { label: 'Current Number', value: Number(viewing.current_number).toLocaleString('en-PH') },
                { label: 'Maximum Number', value: Number(viewing.maximum_number).toLocaleString('en-PH') },
                { label: 'Remaining', value: (Number(viewing.maximum_number) - Number(viewing.current_number)).toLocaleString('en-PH') },
                { label: 'Effective From', value: viewing.effective_from.slice(0, 10) },
                { label: 'Effective To', value: viewing.effective_to ? viewing.effective_to.slice(0, 10) : 'No end date' },
              ]}
            />
            <Stack direction="row" sx={{ justifyContent: 'flex-end', mt: 3 }}>
              <Button variant="text" onClick={() => setViewing(null)}>
                Close
              </Button>
            </Stack>
          </>
        )}
      </Modal>

      <Modal open={!!historyFor} title={`History — ${historyFor ? (historyFor.prefix ?? '') + historyFor.series_code : ''}`} onClose={() => setHistoryFor(null)}>
        {historyFor && <InvoiceSeriesHistory seriesId={historyFor.id} />}
      </Modal>
    </Stack>
  );
}

/**
 * Reads the same generic audit log every other entity in this app already
 * writes to (Services::auditLogger() — see InvoiceSeriesController), just
 * scoped to this one series via the entity_type/entity_id filters
 * AuditLogsController's index already supports. No dedicated history
 * endpoint needed.
 */
function InvoiceSeriesHistory({ seriesId }: { seriesId: number }) {
  const { data, loading, error, meta, page, setPage, perPage, setPerPage } = useList<AuditLog>('/audit-logs', {
    entity_type: 'Invoice Series',
    entity_id: seriesId,
  });

  const columns: Column<AuditLog>[] = [
    { key: 'created_at', label: 'Date', render: (r) => r.created_at.slice(0, 16).replace('T', ' ') },
    { key: 'user_name', label: 'User', render: (r) => r.user_name ?? 'System' },
    {
      key: 'action',
      label: 'Action',
      width: 140,
      render: (r) => <Chip size="small" label={HISTORY_ACTION_LABEL[r.action] ?? r.action} color={HISTORY_ACTION_COLOR[r.action] ?? 'default'} />,
    },
  ];

  return (
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
    />
  );
}
