import { useEffect, useState } from 'react';
import { api, ApiError } from '../api/client';
import type { Company, OpeningFloatMode, PaymentMethodOption, Register, Store, TaxRate, Unit } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { formatMoney } from '../pos/format';
import { useConfirm } from '../ConfirmDialog';
import { useSnackbar } from '../Snackbar';
import { useList } from './useList';
import { useFormErrors } from './useFormErrors';
import { DataTable, type Column } from './DataTable';
import { ListToolbar } from './ListToolbar';
import { Modal } from './Modal';
import { DetailView, StatusChip } from './DetailView';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import {
  CURRENCIES,
  currencyName,
  currencySymbol,
  DEFAULT_CURRENCY,
  showsBirDetail,
  TAX_SYSTEMS,
  taxLabel,
  taxSystemForCurrency,
  taxSystemOf,
} from '../regional';
import Box from '@mui/material/Box';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import { SectionTabs } from './SectionTabs';
import { InvoiceSeriesTab } from './InvoiceSeriesTab';
import { SetupGuideTab } from './SetupGuideTab';
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
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';
import CircularProgress from '@mui/material/CircularProgress';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import LoyaltyOutlinedIcon from '@mui/icons-material/LoyaltyOutlined';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import SellOutlinedIcon from '@mui/icons-material/SellOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import Switch from '@mui/material/Switch';
import { useRouteState } from '../routing';

/**
 * Eight tabs in three groups, down from ten ungrouped ones. Two pairs
 * were merged because their split was the main thing making this screen
 * hard to read rather than any real separation of concerns:
 *
 * - 'Currency & Tax' + 'Taxes' -> 'Tax'. Two adjacent tabs whose names
 *   gave no way to guess which held the rates and which held the wording
 *   around them; the Taxes tab's own hint even had to point at the other
 *   one ("the tax system set on the Regional tab" — a name no tab had
 *   carried since it was relabelled). Now one tab: what tax is called on
 *   top, the rates it applies to underneath.
 * - 'Loyalty' -> folded into 'Discounts & Loyalty'. Loyalty was a whole
 *   top-level tab holding exactly one number field, and both sides of the
 *   merge are pricing/rewards decisions written to the same companies row.
 *
 * The groups are presentation only — SectionTabs renders them as one
 * strip with dividers, so a tab is still just a tab in the URL.
 */
type Tab = 'guide' | 'stores' | 'registers' | 'payment-methods' | 'invoicing' | 'tax' | 'discounts' | 'units' | 'security';
const TABS: Tab[] = ['guide', 'stores', 'registers', 'payment-methods', 'invoicing', 'tax', 'discounts', 'units', 'security'];
const TAB_LABELS: Record<Tab, string> = {
  guide: 'Setup Guide',
  stores: 'Stores',
  registers: 'POS Terminals',
  'payment-methods': 'Payment Methods',
  invoicing: 'Sales Invoicing',
  tax: 'Tax',
  discounts: 'Discounts & Loyalty',
  units: 'Units',
  security: 'Security',
};
/** Where a divider is drawn *before* a tab, splitting the strip into guide / places / selling / system. */
const TAB_GROUP_STARTS: Tab[] = ['stores', 'payment-methods', 'units'];

/**
 * Slugs that used to be tabs of their own, pointed at whichever tab
 * absorbed them. Without this a bookmark to .../settings/loyalty falls
 * through useRouteState's validation to the default tab and lands on
 * Stores — not broken, but a silent wrong answer for someone who
 * bookmarked the page they wanted.
 */
const LEGACY_TAB_ALIASES: Record<string, Tab> = {
  regional: 'tax',
  taxes: 'tax',
  loyalty: 'discounts',
};

// Any-of, not a single slug: the two merged tabs each carry two
// independently-gated halves (Tax = rates on taxes.view + currency and
// wording on companies.manage; Discounts & Loyalty = defaults on
// companies.manage + points on loyalty.view), so the tab has to appear
// for a user holding either one, with each card gated again on its own
// permission inside. Everything else falls back to `${tab}.view`, except
// invoicing, whose tab key doesn't match its permission slug
// (invoice-series, not invoicing).
// Deliberately NOT 'loyalty.view' here, even though the loyalty card is
// one of this tab's two halves: every card on it reads the company row,
// and the roles that hold loyalty.view without companies.view (Store
// Manager, Cashier, Cashier Supervisor) can't load that row at all — the
// tab would open empty for them. loyalty.view still gates the card
// itself, for the companies.manage holders who reach the tab.
const TAB_PERMISSIONS: Partial<Record<Tab, string[]>> = {
  // Visible to anyone who can reach Settings at all — it's a map of the
  // other tabs, and it degrades per step for whatever the role can't
  // actually read (see SetupGuideTab's own null handling).
  guide: ['stores.view', 'registers.view', 'payment-methods.view', 'invoice-series.view', 'taxes.view', 'units.view', 'companies.manage'],
  tax: ['taxes.view', 'companies.manage'],
  discounts: ['companies.manage'],
  security: ['companies.manage'],
  invoicing: ['invoice-series.view'],
};

export function SettingsScreen() {
  const { hasPermission } = useAuth();
  // A role can hold e.g. registers.view without stores.view — the tab
  // list (and the default landing tab) has to reflect whichever of the
  // four this particular user actually has, not always start on Stores.
  const availableTabs = TABS.filter((t) => (TAB_PERMISSIONS[t] ?? [`${t}.view`]).some((p) => hasPermission(p)));
  const [tab, setTab] = useRouteState<Tab>(2, TABS, availableTabs[0] ?? 'stores', (t) => `/admin/settings/${t}`);

  // Redirect a bookmark saved before two pairs of tabs were merged, so
  // it lands on the tab that now holds what it was pointing at. Runs
  // once, before the access guard below, and only for a slug no current
  // tab claims.
  useEffect(() => {
    const segment = window.location.pathname.split('/').filter(Boolean)[2];
    const alias = segment ? LEGACY_TAB_ALIASES[segment] : undefined;
    if (alias && availableTabs.includes(alias)) setTab(alias);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          <Tab
            key={t}
            value={t}
            label={TAB_LABELS[t]}
            // A hairline before the first tab of each group. Cheaper than
            // a second navigation surface: a sidebar would have taken
            // ~200px off tabs whose tables already need nearly the full
            // card width (see StoresTab's own column budget).
            sx={
              TAB_GROUP_STARTS.includes(t) && availableTabs.indexOf(t) > 0
                ? { borderLeft: '1px solid', borderColor: 'divider', ml: 1.5, pl: 2.5 }
                : undefined
            }
          />
        ))}
      </SectionTabs>

      {tab === 'guide' && <SetupGuideTab onNavigate={(t) => setTab(t as Tab)} />}
      {tab === 'stores' && hasPermission('stores.view') && <StoresTab />}
      {tab === 'registers' && hasPermission('registers.view') && <RegistersTab />}
      {tab === 'payment-methods' && hasPermission('payment-methods.view') && <PaymentMethodsTab />}
      {tab === 'invoicing' && hasPermission('invoice-series.view') && <InvoiceSeriesTab />}
      {tab === 'tax' && <TaxTab />}
      {tab === 'units' && hasPermission('units.view') && <UnitsTab />}
      {tab === 'discounts' && <DiscountsTab />}
      {tab === 'security' && hasPermission('companies.manage') && <SecurityTab />}
    </div>
  );
}

/**
 * The former 'Currency & Tax' and 'Taxes' tabs, now one: what the tax is
 * called (and the currency that settles it) on top, the actual rates it
 * applies to underneath. Each half keeps its own permission — a user with
 * taxes.view but not companies.manage sees the rates and not the wording
 * controls, which is the same split that used to decide whether they saw
 * one tab or two.
 */
function TaxTab() {
  const { hasPermission } = useAuth();
  /**
   * Bumped when the regime above is saved, to remount the rates table
   * below. The two are separate components with separate fetches, so
   * without this the table kept listing the rates of the system that was
   * just switched away from — the endpoint only ever returns the current
   * regime's rates (TaxesController::applyScope), but nothing had told
   * the table to ask again. A remount rather than a soft reload because
   * the rate set changes wholesale: any page or search still applied to
   * the old list means nothing against the new one.
   */
  const [ratesEpoch, setRatesEpoch] = useState(0);

  return (
    <Stack spacing={4}>
      {hasPermission('companies.manage') && <BirRegistrationCard />}
      {hasPermission('companies.manage') && <TaxSettingsCards onRegimeSaved={() => setRatesEpoch((n) => n + 1)} />}
      {hasPermission('taxes.view') && <TaxesTab key={ratesEpoch} />}
    </Stack>
  );
}

/**
 * The switch that turns the whole tax system off for a business that
 * hasn't registered with the BIR yet.
 *
 * Sits at the top of the Tax tab because it governs everything under it:
 * with this off, the rates below are still listed and still editable,
 * but nothing charges them. Saved on its own rather than folded into the
 * currency card, since flipping it changes what customers are charged
 * and shouldn't ride along with an unrelated Save.
 */
function BirRegistrationCard() {
  const { user } = useAuth();
  const notify = useSnackbar();
  const [company, setCompany] = useState<Company | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.company_id) return;
    api.get<Company>(`/companies/${user.company_id}`).then(setCompany);
  }, [user?.company_id]);

  const registered = company !== null && Number(company.is_bir_registered) === 1;

  async function toggle(next: boolean) {
    if (!company) return;
    setSaving(true);
    try {
      setCompany(await api.put<Company>(`/companies/${company.id}`, { is_bir_registered: next ? 1 : 0 }));
      notify(next ? 'Tax enabled — this business is BIR registered' : 'Tax disabled — no tax will be charged');
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  }

  if (!company) return null;

  return (
    <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 2 }}>
        <ReceiptLongOutlinedIcon color="primary" />
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          BIR registration
        </Typography>
      </Stack>

      <SecurityToggle
        title="This business is registered with the BIR"
        detail="Turn off if you haven't registered yet. No tax is charged on any sale while this is off, whatever rate a product carries, and receipts print without the VAT breakdown or accreditation numbers."
        checked={registered}
        disabled={saving}
        onChange={toggle}
      />

      {!registered && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          Tax is switched off. Every sale is rung up at zero tax, and the tax rates below are saved but unused. Turn this on once the BIR
          issues your registration — sales already rung up are not recalculated.
        </Alert>
      )}
    </Paper>
  );
}

/**
 * A labelled divider between groups of fields inside a form modal.
 *
 * The store form previously had exactly one of these ("Receipt footer")
 * and nothing above it, so the eye read the first two-thirds of the
 * dialog as a single undifferentiated run of inputs and the last third
 * as the only part that had been organised. Either every group gets a
 * heading or none does; this is the "every" side of that.
 */
function FormSectionHeading({ label, hint, first }: { label: string; hint?: string; first?: boolean }) {
  return (
    <>
      {!first && <Divider sx={{ mt: 1, mb: 2 }} />}
      <Typography
        variant="overline"
        color="text.secondary"
        // The bottom margin lives here only when no hint follows —
        // otherwise the heading sat flush against the first field's own
        // label and the two read as one doubled-up caption.
        sx={{ display: 'block', fontWeight: 700, lineHeight: 1.6, mb: hint ? 0 : 1 }}
      >
        {label}
      </Typography>
      {hint && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          {hint}
        </Typography>
      )}
    </>
  );
}

function StoresTab() {
  const { hasPermission } = useAuth();
  const confirm = useConfirm();
  const notify = useSnackbar();
  const [statusFilter, setStatusFilter] = useState('');
  const { data, meta, loading, error, page, setPage, perPage, setPerPage, sort, setSort, q, setQ, reload } = useList<Store>('/stores', {
    is_active: statusFilter,
  });

  const [editing, setEditing] = useState<Store | null>(null);
  const [viewing, setViewing] = useState<Store | null>(null);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({
    name: '', code: '', address: '', phone: '', email: '',
    receiptFooterNote: '', vatRegTin: '', posSerialNo: '', minNo: '', ptuNumber: '', showBirDetails: true,
    is_active: true,
  });
  const [saving, setSaving] = useState(false);
  const { fieldErrors, formError, clearErrors, clearField, reportError } = useFormErrors();

  function openCreate() {
    setEditing(null);
    setForm({
      name: '', code: '', address: '', phone: '', email: '',
      receiptFooterNote: '', vatRegTin: '', posSerialNo: '', minNo: '', ptuNumber: '', showBirDetails: true,
      is_active: true,
    });
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
      receiptFooterNote: store.receipt_footer_note ?? '',
      vatRegTin: store.vat_reg_tin ?? '',
      posSerialNo: store.pos_serial_no ?? '',
      minNo: store.min_no ?? '',
      ptuNumber: store.ptu_number ?? '',
      showBirDetails: Number(store.show_bir_details) === 1,
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
      receipt_footer_note: form.receiptFooterNote || null,
      vat_reg_tin: form.vatRegTin || null,
      pos_serial_no: form.posSerialNo || null,
      min_no: form.minNo || null,
      ptu_number: form.ptuNumber || null,
      show_bir_details: form.showBirDetails ? 1 : 0,
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
    {
      key: 'name',
      label: 'Store Name',
      sortKey: 'name',
      // Capped rather than left flexible: as the only unbounded column it
      // absorbed every pixel freed elsewhere, so the table's total never
      // came down and the Actions column stayed clipped off the edge.
      width: 232,
      // A tinted storefront tile beside the name, matching the avatar
      // treatment products already get in the POS grid — on a table where
      // every other column is plain text, it's what lets the eye find the
      // row's subject without reading across.
      render: (s) => (
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', minWidth: 0 }}>
          <Box
            sx={{
              width: 34,
              height: 34,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              bgcolor: 'color-mix(in srgb, var(--mui-palette-primary-main) 12%, transparent)',
              color: 'primary.main',
            }}
          >
            <StorefrontOutlinedIcon sx={{ fontSize: 19 }} />
          </Box>
          <Tooltip title={s.name}>
            <Typography variant="body2" noWrap sx={{ fontWeight: 600, minWidth: 0 }}>
              {s.name}
            </Typography>
          </Tooltip>
        </Stack>
      ),
    },
    { key: 'code', label: 'Code', sortKey: 'code', width: 110 },
    {
      key: 'address',
      label: 'Address',
      width: 148,
      render: (s) =>
        s.address ? (
          <Tooltip title={s.address}>
            <Typography variant="body2" noWrap>
              {s.address}
            </Typography>
          </Tooltip>
        ) : (
          '—'
        ),
    },
    // These three keep their full width rather than sharing the squeeze:
    // a TIN, serial and MIN differ only in their last few characters, so
    // truncating them to "123-456-789-…" hides the one part that tells
    // two branches apart. The budget comes out of Store Name instead
    // (capped above), which stays identifiable from its first words and
    // carries a tooltip with the rest.
    { key: 'vat_reg_tin', label: 'VAT Reg TIN', width: 150, render: (s) => s.vat_reg_tin ?? '—' },
    { key: 'pos_serial_no', label: 'POS Serial No', width: 150, render: (s) => s.pos_serial_no ?? '—' },
    { key: 'min_no', label: 'MIN No', width: 180, render: (s) => s.min_no ?? '—' },
    {
      key: 'show_bir_details',
      label: 'On Receipt',
      width: 116,
      // Grayed out rather than a plain dash when there's nothing to show
      // yet — "not printing" and "nothing entered" read as different
      // states at a glance, the same distinction the View modal draws.
      render: (s) =>
        !s.vat_reg_tin && !s.pos_serial_no && !s.min_no ? (
          <Typography variant="caption" color="text.disabled">
            —
          </Typography>
        ) : (
          <Chip
            size="small"
            label={Number(s.show_bir_details) === 1 ? 'Shown' : 'Hidden'}
            color={Number(s.show_bir_details) === 1 ? 'success' : 'default'}
          />
        ),
    },
    {
      key: 'is_active',
      label: 'Status',
      width: 104,
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

      {/* `wide`, not `compact`: at the narrow width this used to be, a
          branch name like "Ermita Branch - Grocery & Bakery" and a MIN of
          "MIN-2024-0001-0101" were both cut off inside their own inputs —
          you couldn't read back what you'd typed in the field you were
          editing. */}
      <Modal open={show} title={editing ? 'Edit Store' : 'Add Store'} onClose={() => setShow(false)} wide>
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid size={{ xs: 12 }}>
              <FormSectionHeading label="Branch details" first />
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
                helperText={fieldErrors?.code ?? 'Short branch code, e.g. 101'}
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
            {/* The BIR-mandated identifiers a Philippine POS/CRM receipt
                must carry: fixed accreditation numbers issued by BIR, not
                editorial content, so they get a section of their own
                rather than reading as four more stray text fields.

                Two across rather than the three-then-one they were in
                before, which left PTU stranded on its own row at a third
                of the width looking like it belonged to nothing. */}
            <Grid size={{ xs: 12 }}>
              <FormSectionHeading
                label="BIR accreditation"
                hint="Printed in this branch's receipt header. Leave blank until BIR issues them."
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="VAT Reg TIN"
                fullWidth
                placeholder="123-456-789-000"
                value={form.vatRegTin}
                onChange={(e) => {
                  setForm({ ...form, vatRegTin: e.target.value });
                  clearField('vat_reg_tin');
                }}
                error={!!fieldErrors?.vat_reg_tin}
                helperText={fieldErrors?.vat_reg_tin ?? 'VAT registration TIN'}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="POS Serial No"
                fullWidth
                value={form.posSerialNo}
                onChange={(e) => {
                  setForm({ ...form, posSerialNo: e.target.value });
                  clearField('pos_serial_no');
                }}
                error={!!fieldErrors?.pos_serial_no}
                helperText={fieldErrors?.pos_serial_no ?? "The terminal's serial number"}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="MIN No"
                fullWidth
                value={form.minNo}
                onChange={(e) => {
                  setForm({ ...form, minNo: e.target.value });
                  clearField('min_no');
                }}
                error={!!fieldErrors?.min_no}
                helperText={fieldErrors?.min_no ?? 'Machine Identification Number'}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="PTU No"
                fullWidth
                value={form.ptuNumber}
                onChange={(e) => {
                  setForm({ ...form, ptuNumber: e.target.value });
                  clearField('ptu_number');
                }}
                error={!!fieldErrors?.ptu_number}
                helperText={fieldErrors?.ptu_number ?? 'BIR Permit to Use'}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              {/* Independent of whether the fields above are filled in —
                  lets a store save its MIN/serial ahead of BIR
                  accreditation going live, or pull them off the receipt
                  temporarily, without losing the saved values either way.
                  Also hides the VAT/VAT Exempt/Zero Rated sales breakdown
                  further down the receipt (see ReceiptModal) — a store
                  hiding its identifiers almost never wants that breakdown
                  left showing on its own underneath them.

                  The label carries the short version and the caption the
                  consequence: as one sentence it ran to two wrapped lines
                  beside the checkbox and read as a paragraph someone had
                  attached to a control. */}
              <FormControlLabel
                control={
                  <Checkbox
                    checked={form.showBirDetails}
                    onChange={(e) => setForm({ ...form, showBirDetails: e.target.checked })}
                  />
                }
                label="Print these on this branch's receipts"
              />
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', ml: 4, mt: -0.5 }}>
                Turning this off keeps the numbers saved but leaves them, and the VAT sales breakdown, off the printed receipt.
              </Typography>
            </Grid>
            <Grid size={{ xs: 12 }}>
              {/* Visually separated from the identifiers above, on purpose
                  — the receipt's header is a fixed structured block (name,
                  address, TIN, VAT Reg TIN, POS Serial No, MIN No), so a
                  free-text field sitting right under it read as if it were
                  part of that same header. This is a closing message
                  instead: it prints at the very bottom of the receipt. */}
              <FormSectionHeading label="Receipt footer" />
              {/* Just "Message": the section heading above already says
                  receipt footer, and "Receipt footer" over "Receipt
                  footer note" read as the same words twice. */}
              <TextField
                label="Message"
                fullWidth
                multiline
                minRows={2}
                value={form.receiptFooterNote}
                onChange={(e) => {
                  setForm({ ...form, receiptFooterNote: e.target.value });
                  clearField('receipt_footer_note');
                }}
                error={!!fieldErrors?.receipt_footer_note}
                helperText={
                  fieldErrors?.receipt_footer_note ??
                  'Printed at the bottom of this store’s receipts only — e.g. "Thank you, come again" or a return policy. Changing it only affects sales rung up after the change.'
                }
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
            { label: 'VAT Reg TIN', value: viewing?.vat_reg_tin ?? '—' },
            { label: 'POS Serial No', value: viewing?.pos_serial_no ?? '—' },
            { label: 'MIN No', value: viewing?.min_no ?? '—' },
            { label: 'PTU No', value: viewing?.ptu_number ?? '—' },
            {
              label: 'Shown on receipt',
              value: viewing ? (
                <Chip
                  size="small"
                  label={Number(viewing.show_bir_details) === 1 ? 'Yes' : 'No — saved but hidden'}
                  color={Number(viewing.show_bir_details) === 1 ? 'success' : 'default'}
                />
              ) : undefined,
            },
            {
              label: 'Receipt footer note',
              // white-space: pre-line so an entered line break (e.g.
              // separating a policy line from a slogan) actually shows
              // as two lines here, matching how it prints on the receipt.
              value: viewing?.receipt_footer_note ? (
                <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                  {viewing.receipt_footer_note}
                </Typography>
              ) : (
                '—'
              ),
            },
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

/**
 * What each of the three opening-float modes is called and what it does
 * — shared between the register form's select, the list column, and the
 * View modal, so the wording can't drift between them. Matches
 * RegisterModel's own naming on the backend (see AddOpeningFloatToRegisters).
 */
const OPENING_FLOAT_MODE_META: Record<OpeningFloatMode, { label: string; hint: string }> = {
  manual: { label: 'Cashier enters it', hint: 'The cashier counts the drawer and types the opening cash at Open POS Terminal, same as before this was configurable.' },
  fixed: { label: 'Automatic', hint: 'Opens with the configured float — no screen, no typing, no tap.' },
  fixed_confirm: { label: 'Automatic, with confirm', hint: 'Shows the configured float and asks the cashier to tap once to start the shift — not editable.' },
};

function RegistersTab() {
  const { user, hasPermission } = useAuth();
  const symbol = currencySymbol(user?.currency);
  const confirm = useConfirm();
  const notify = useSnackbar();
  const [stores, setStores] = useState<Store[]>([]);
  const [storeFilter, setStoreFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const { data, meta, loading, error, page, setPage, perPage, setPerPage, sort, setSort, q, setQ, reload } = useList<Register>('/registers', {
    store_id: storeFilter,
    is_active: statusFilter,
  });

  const [editing, setEditing] = useState<Register | null>(null);
  const [viewing, setViewing] = useState<Register | null>(null);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({
    store_id: '',
    name: '',
    code: '',
    is_active: true,
    opening_float_mode: 'manual' as OpeningFloatMode,
    default_opening_float: '',
    is_training_mode: false,
  });
  const [saving, setSaving] = useState(false);
  const { fieldErrors, formError, clearErrors, clearField, reportError } = useFormErrors();

  useEffect(() => {
    api.get<Store[]>('/registers/stores/assignable').then(setStores);
  }, []);

  const storeName = (id: number) => stores.find((s) => s.id === id)?.name ?? `#${id}`;

  function openCreate() {
    setEditing(null);
    setForm({ store_id: storeFilter, name: '', code: '', is_active: true, opening_float_mode: 'manual', default_opening_float: '', is_training_mode: false });
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
      opening_float_mode: register.opening_float_mode,
      default_opening_float: register.default_opening_float ?? '',
      is_training_mode: Number(register.is_training_mode) === 1,
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
      opening_float_mode: form.opening_float_mode,
      // null rather than '' for manual mode — clears any float left over
      // from a register that used to be fixed, so a later switch back to
      // fixed can't silently resurrect a stale figure nobody set this time.
      default_opening_float: form.opening_float_mode === 'manual' ? null : form.default_opening_float || null,
      is_training_mode: form.is_training_mode ? 1 : 0,
    };
    try {
      if (editing) await api.put(`/registers/${editing.id}`, payload);
      else await api.post('/registers', payload);
      setShow(false);
      reload();
      notify(editing ? 'POS terminal updated' : 'POS terminal created');
    } catch (err) {
      reportError(err, 'Failed to save POS terminal');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(register: Register) {
    const activating = Number(register.is_active) !== 1;
    const verb = activating ? 'Activate' : 'Deactivate';
    if (!(await confirm(`${verb} POS terminal "${register.name}"?`, { title: `${verb} POS Terminal`, confirmLabel: verb }))) return;
    try {
      await api.put(`/registers/${register.id}`, { is_active: activating ? 1 : 0 });
      reload();
      notify(`POS terminal ${activating ? 'activated' : 'deactivated'}`);
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Failed to update POS terminal', 'error');
    }
  }

  const columns: Column<Register>[] = [
    { key: 'name', label: 'Name', sortKey: 'name' },
    { key: 'code', label: 'Code', sortKey: 'code', width: 160 },
    { key: 'store', label: 'Store', render: (r) => storeName(r.store_id) },
    {
      key: 'opening_float',
      label: 'Opening Cash',
      width: 200,
      render: (r) =>
        r.opening_float_mode === 'manual' ? (
          <Typography variant="body2" color="text.secondary">
            Cashier enters it
          </Typography>
        ) : (
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {symbol}
              {formatMoney(parseFloat(r.default_opening_float ?? '0'))}
            </Typography>
            <Chip size="small" variant="outlined" label={r.opening_float_mode === 'fixed' ? 'auto' : 'confirm'} sx={{ height: 20, fontSize: 11 }} />
          </Stack>
        ),
    },
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
        addLabel="Add POS Terminal"
        onRefresh={reload}
        refreshing={loading}
        extra={
          <Stack direction="row" spacing={1.5} sx={{ width: { xs: '100%', sm: 'auto' } }}>
            <InlineSelectFilter
              label="Store"
              compactOnMobile
              value={storeFilter}
              onChange={setStoreFilter}
              options={[{ value: '', label: 'All Stores' }, ...stores.map((s) => ({ value: String(s.id), label: s.name }))]}
            />
            <InlineSelectFilter
              label="Status"
              compactOnMobile
              value={statusFilter}
              onChange={setStatusFilter}
              minWidth={140}
              options={[
                { value: '', label: 'All' },
                { value: '1', label: 'Active' },
                { value: '0', label: 'Inactive' },
              ]}
            />
          </Stack>
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

      <Modal open={show} title={editing ? 'Edit POS Terminal' : 'Add POS Terminal'} onClose={() => setShow(false)} compact>
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

            {/* Opening cash: how a cash session starts on this
                terminal, not a fourth product field crammed in next to
                Name/Code — a divider marks it as its own decision. */}
            <Grid size={{ xs: 12 }}>
              <Divider textAlign="left" sx={{ '&::before': { width: '4%' }, mt: 0.5 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: '0.04em' }}>
                  OPENING CASH
                </Typography>
              </Divider>
            </Grid>
            <Grid size={{ xs: 12, sm: form.opening_float_mode === 'manual' ? 12 : 6 }}>
              <SearchableSelect
                label="How it starts"
                fullWidth
                value={form.opening_float_mode}
                onChange={(v) => setForm({ ...form, opening_float_mode: v as OpeningFloatMode })}
                options={(Object.keys(OPENING_FLOAT_MODE_META) as OpeningFloatMode[]).map((m) => ({
                  value: m,
                  label: OPENING_FLOAT_MODE_META[m].label,
                }))}
              />
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
                {OPENING_FLOAT_MODE_META[form.opening_float_mode].hint}
              </Typography>
            </Grid>
            {form.opening_float_mode !== 'manual' && (
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Opening float"
                  type="number"
                  fullWidth
                  value={form.default_opening_float}
                  onChange={(e) => {
                    setForm({ ...form, default_opening_float: e.target.value });
                    clearField('default_opening_float');
                  }}
                  error={!!fieldErrors?.default_opening_float}
                  helperText={fieldErrors?.default_opening_float ?? `e.g. ${symbol}5000`}
                  required
                  slotProps={{ htmlInput: { min: 0.01, step: 0.01 } }}
                />
              </Grid>
            )}
            <Grid size={{ xs: 12 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={form.is_training_mode}
                    onChange={(e) => setForm({ ...form, is_training_mode: e.target.checked })}
                  />
                }
                label="Training mode"
              />
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: -0.5 }}>
                Sales on this terminal become practice only: stamped TRAINING on the receipt, given a TRN- number instead of a real invoice
                number, and left out of every total, report and X/Z reading. Turn it off before the terminal takes real money.
              </Typography>
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

      <Modal open={!!viewing} title="View POS Terminal" onClose={() => setViewing(null)} compact>
        <DetailView
          fields={[
            { label: 'Name', value: viewing?.name },
            { label: 'Code', value: viewing?.code },
            { label: 'Store', value: viewing ? storeName(viewing.store_id) : undefined },
            { label: 'Opening cash', value: viewing ? OPENING_FLOAT_MODE_META[viewing.opening_float_mode].label : undefined },
            ...(viewing && viewing.opening_float_mode !== 'manual'
              ? [{ label: 'Opening float', value: `${symbol}${formatMoney(parseFloat(viewing.default_opening_float ?? '0'))}` }]
              : []),
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

/** V / E / Z / N — the flag a BIR receipt prints beside each line so a customer can see how that item was taxed. Colour-coded so the vatable case (the one that actually carries tax) stands apart from the three zero-tax classifications at a glance. */
const TAX_INDICATOR_META: Record<string, { label: string; color: 'primary' | 'success' | 'info' | 'default' }> = {
  V: { label: 'VATable', color: 'primary' },
  E: { label: 'VAT-Exempt', color: 'success' },
  Z: { label: 'Zero-Rated', color: 'info' },
  N: { label: 'Non-VAT', color: 'default' },
};

function TaxIndicatorChip({ indicator }: { indicator: string }) {
  const meta = TAX_INDICATOR_META[indicator] ?? { label: indicator, color: 'default' as const };
  return (
    <Tooltip title={meta.label}>
      <Chip
        size="small"
        label={indicator}
        color={meta.color}
        sx={{ fontWeight: 800, width: 30, '& .MuiChip-label': { px: 0 } }}
      />
    </Tooltip>
  );
}

function TaxesTab() {
  const { user, hasPermission } = useAuth();
  // Under GST the Flag column is dropped rather than relabelled: V/E/Z/N
  // are BIR classifications with no GST counterpart, so a "GST-Exempt"
  // chip would be inventing one. See src/regional.ts.
  const showFlags = showsBirDetail(user?.tax_system);
  const confirm = useConfirm();
  const notify = useSnackbar();
  const [statusFilter, setStatusFilter] = useState('');
  const { data, meta, loading, error, page, setPage, perPage, setPerPage, sort, setSort, q, setQ, reload } = useList<TaxRate>('/taxes', {
    is_active: statusFilter,
  });

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
    ...(showFlags
      ? [
          {
            key: 'indicator',
            label: 'Flag',
            width: 72,
            // Not sortable: it's derived server-side per row (TaxService::
            // indicator), so there's no column behind it for the API to ORDER BY.
            render: (t: TaxRate) => (t.indicator ? <TaxIndicatorChip indicator={t.indicator} /> : '—'),
          } as Column<TaxRate>,
        ]
      : []),
    { key: 'name', label: 'Name', sortKey: 'name' },
    { key: 'rate', label: 'Rate', align: 'right', sortKey: 'rate', width: 100, render: (t) => `${t.rate}%` },
    { key: 'is_default', label: 'Default', width: 100, render: (t) => (Number(t.is_default) === 1 ? 'Yes' : '—') },
  ];

  return (
    <div>
      {/* Names the regime these rates are read under, and where it comes
          from. Without it the Flag column appearing and disappearing with
          a currency change looks arbitrary — this is the one place the
          two settings are visibly connected. The rates themselves are
          untouched by any of it: they're real rows referenced by products
          and past sales, so nothing here renames or replaces them on a
          currency change.

          "set above" rather than a tab name: the wording controls now sit
          on this same tab (see TaxTab). The old copy pointed at "the
          Regional tab", which had already been relabelled Currency & Tax
          and no longer exists at all. */}
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Rates below are labelled{' '}
        <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>{taxLabel(user?.tax_system)}</Box>, following the
        tax system set above.
      </Typography>

      <ListToolbar
        search={q}
        onSearchChange={setQ}
        onAdd={hasPermission('taxes.manage') ? openCreate : undefined}
        addLabel="Add Tax Rate"
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
        // Says why the list is empty instead of a bare "No records
        // found." Rates are stored per tax system and the endpoint only
        // ever returns the current one's (TaxesController::applyScope),
        // so changing the currency above to one on the other regime
        // empties this table outright — which reads as the table having
        // failed to load rather than as the deliberate scoping it is.
        emptyLabel={
          q || statusFilter
            ? 'No tax rates match this search.'
            : `No ${taxLabel(user?.tax_system)} rates yet. Rates are kept per tax system — any set up under the other one are still saved, and come back if you switch the currency back.`
        }
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
            {
              label: 'Receipt flag',
              value:
                viewing?.indicator !== undefined ? (
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <TaxIndicatorChip indicator={viewing.indicator} />
                    <Typography variant="body2" color="text.secondary">
                      {TAX_INDICATOR_META[viewing.indicator]?.label}
                    </Typography>
                  </Stack>
                ) : undefined,
            },
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

/**
 * `code` (what's actually stored on payments.method, and what
 * CashSessionsController's drawer math keys off for 'cash' specifically)
 * is server-derived from `name` and never shown as an editable field here
 * — see PaymentMethodsController. Deactivating/deleting Cash is rejected
 * server-side with a clear message; deliberately not re-checked here too,
 * so there's exactly one place that decides it's protected.
 */
function PaymentMethodsTab() {
  const { hasPermission } = useAuth();
  const confirm = useConfirm();
  const notify = useSnackbar();
  const [statusFilter, setStatusFilter] = useState('');
  const { data, meta, loading, error, page, setPage, perPage, setPerPage, sort, setSort, q, setQ, reload } = useList<PaymentMethodOption>('/payment-methods', {
    is_active: statusFilter,
  });

  const [editing, setEditing] = useState<PaymentMethodOption | null>(null);
  const [viewing, setViewing] = useState<PaymentMethodOption | null>(null);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ name: '', is_active: true });
  const [saving, setSaving] = useState(false);
  const { fieldErrors, formError, clearErrors, clearField, reportError } = useFormErrors();

  function openCreate() {
    setEditing(null);
    setForm({ name: '', is_active: true });
    clearErrors();
    setShow(true);
  }

  function openEdit(method: PaymentMethodOption) {
    setEditing(method);
    setForm({ name: method.name, is_active: Number(method.is_active) === 1 });
    clearErrors();
    setShow(true);
  }

  async function submit() {
    setSaving(true);
    clearErrors();
    const payload = { name: form.name, is_active: form.is_active ? 1 : 0 };
    try {
      if (editing) await api.put(`/payment-methods/${editing.id}`, payload);
      else await api.post('/payment-methods', payload);
      setShow(false);
      reload();
      notify(editing ? 'Payment method updated' : 'Payment method created');
    } catch (err) {
      reportError(err, 'Failed to save payment method');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(method: PaymentMethodOption) {
    const activating = Number(method.is_active) !== 1;
    const verb = activating ? 'Activate' : 'Deactivate';
    if (!(await confirm(`${verb} payment method "${method.name}"?`, { title: `${verb} Payment Method`, confirmLabel: verb }))) return;
    try {
      await api.put(`/payment-methods/${method.id}`, { is_active: activating ? 1 : 0 });
      reload();
      notify(`Payment method ${activating ? 'activated' : 'deactivated'}`);
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Failed to update payment method', 'error');
    }
  }

  async function remove(method: PaymentMethodOption) {
    if (!(await confirm(`Delete payment method "${method.name}"?`, { title: 'Delete Payment Method', confirmLabel: 'Delete' }))) return;
    try {
      await api.del(`/payment-methods/${method.id}`);
      reload();
      notify('Payment method deleted');
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Failed to delete payment method', 'error');
    }
  }

  const columns: Column<PaymentMethodOption>[] = [
    { key: 'name', label: 'Name', sortKey: 'name' },
    {
      key: 'is_active',
      label: 'Status',
      width: 120,
      render: (m) => (
        <Chip size="small" label={Number(m.is_active) === 1 ? 'Active' : 'Inactive'} color={Number(m.is_active) === 1 ? 'success' : 'default'} />
      ),
    },
  ];

  return (
    <div>
      <ListToolbar
        search={q}
        onSearchChange={setQ}
        onAdd={hasPermission('payment-methods.manage') ? openCreate : undefined}
        addLabel="Add Payment Method"
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
        rowKey={(m) => m.id}
        loading={loading}
        error={error}
        meta={meta}
        page={page}
        onPageChange={setPage}
        perPage={perPage}
        onPerPageChange={setPerPage}
        sort={sort}
        onSortChange={setSort}
        rowActions={(m) => {
          const active = Number(m.is_active) === 1;
          return (
            <>
              <Tooltip title="View">
                <IconButton size="small" aria-label="View" onClick={() => setViewing(m)}>
                  <VisibilityOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              {hasPermission('payment-methods.manage') && (
                <>
                  <Tooltip title="Edit">
                    <IconButton size="small" aria-label="Edit" onClick={() => openEdit(m)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={active ? 'Deactivate' : 'Activate'}>
                    <IconButton
                      size="small"
                      aria-label={active ? 'Deactivate' : 'Activate'}
                      color={active ? 'error' : 'success'}
                      onClick={() => toggleActive(m)}
                    >
                      {active ? <BlockIcon fontSize="small" /> : <CheckCircleIcon fontSize="small" />}
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton size="small" aria-label="Delete" color="error" onClick={() => remove(m)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </>
              )}
            </>
          );
        }}
      />

      <Modal open={show} title={editing ? 'Edit Payment Method' : 'Add Payment Method'} onClose={() => setShow(false)} compact>
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

      <Modal open={!!viewing} title="View Payment Method" onClose={() => setViewing(null)} compact>
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

/**
 * A single flat, company-wide rate — "N points per ₱100 of a sale's
 * total" — rather than a list, so this tab is just one form instead of
 * the Add/Edit-modal-over-a-table pattern every other tab here uses.
 * SalesController::create() reads this same column to award points
 * automatically at checkout when a customer is attached to the sale.
 */
/**
 * Was its own top-level tab holding this one field; now a card on
 * Discounts & Loyalty (see the Tab type's own note). Takes the company
 * from its parent rather than fetching again — same shape as
 * DiscountDefaultsSection, which already shares that tab's single load.
 */
function LoyaltyPointsSection({ company, onSaved }: { company: Company; onSaved: (c: Company) => void }) {
  const { user, hasPermission } = useAuth();
  const symbol = currencySymbol(user?.currency);
  const notify = useSnackbar();
  const canManage = hasPermission('loyalty.manage');
  const [rate, setRate] = useState(() => String(company.loyalty_points_per_100));
  const [saving, setSaving] = useState(false);
  const { fieldErrors, formError, clearErrors, clearField, reportError } = useFormErrors();

  async function submit() {
    setSaving(true);
    clearErrors();
    try {
      const updated = await api.put<Company>(`/companies/${company.id}`, { loyalty_points_per_100: rate || '0' });
      onSaved(updated);
      setRate(String(updated.loyalty_points_per_100));
      notify('Loyalty settings updated');
    } catch (err) {
      reportError(err, 'Failed to save loyalty settings');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, width: '100%' }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 2 }}>
        <LoyaltyOutlinedIcon color="primary" />
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          Points earned per sale
        </Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Earned automatically per {symbol}100 when a customer is attached. 0 turns it off — points can still be adjusted by
        hand from a customer's Points History.
      </Typography>

      <TextField
        label={`Points per ${symbol}100`}
        type="number"
        fullWidth
        disabled={!canManage}
        value={rate}
        onChange={(e) => {
          setRate(e.target.value);
          clearField('loyalty_points_per_100');
        }}
        error={!!fieldErrors?.loyalty_points_per_100}
        helperText={fieldErrors?.loyalty_points_per_100}
        slotProps={{ htmlInput: { min: 0, step: 1 }, input: { endAdornment: <InputAdornment position="end">pts</InputAdornment> } }}
      />

      {formError && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {formError}
        </Alert>
      )}

      {canManage && (
        <Stack direction="row" sx={{ justifyContent: 'flex-end', mt: 3 }}>
          <Button variant="contained" onClick={submit} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </Stack>
      )}
    </Paper>
  );
}

/**
 * A single toggle on the same company row Loyalty edits — see
 * Company::require_item_void_approval / require_cancel_approval.
 * Kept as its own tab (not a checkbox
 * bolted onto Loyalty) since it's a security policy decision rather than
 * a pricing/rewards one, and gated on companies.manage end to end: this
 * is the flag that decides whether cashiers can bypass a supervisor at
 * all, so unlike Loyalty there's no separate lighter-weight permission
 * for it.
 *
 * Manual Discount's own approval switch, and everything else about how
 * discounts behave, live on the separate Discounts tab (DiscountsTab,
 * below) — split out from here so this tab stays about voiding/
 * cancelling a sale specifically, not a catch-all for every switch that
 * happens to need a supervisor.
 */
function SecurityTab() {
  const { user, refreshUser } = useAuth();
  const notify = useSnackbar();
  const [company, setCompany] = useState<Company | null>(null);
  const [itemVoid, setItemVoid] = useState(false);
  const [cancel, setCancel] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // Kept separate from `saving` above — the toggles save themselves the
  // instant they're flipped, but the idle-lock minutes field below needs
  // its own explicit Save, and conflating the two flags would grey out
  // (or spin) the wrong control while the other one's request is in flight.
  const [lockMinutes, setLockMinutes] = useState('0');
  const [lockSaving, setLockSaving] = useState(false);
  const { fieldErrors, formError, clearErrors, clearField, reportError } = useFormErrors();

  useEffect(() => {
    if (!user?.company_id) return;
    api
      .get<Company>(`/companies/${user.company_id}`)
      .then((c) => {
        setCompany(c);
        setItemVoid(Number(c.require_item_void_approval) === 1);
        setCancel(Number(c.require_cancel_approval) === 1);
        setLockMinutes(String(c.pos_lock_idle_minutes));
      })
      .finally(() => setLoading(false));
  }, [user?.company_id]);

  async function toggle(field: 'require_item_void_approval' | 'require_cancel_approval', next: boolean) {
    if (!company) return;
    const setter = field === 'require_item_void_approval' ? setItemVoid : setCancel;
    // Optimistic, then reconciled from the response — a Switch that waits
    // for the round trip before moving reads as broken/laggy for something
    // this immediate.
    setter(next);
    setSaving(true);
    try {
      const updated = await api.put<Company>(`/companies/${company.id}`, { [field]: next ? 1 : 0 });
      setCompany(updated);
      setItemVoid(Number(updated.require_item_void_approval) === 1);
      setCancel(Number(updated.require_cancel_approval) === 1);
      notify('Security settings updated');
    } catch (err) {
      setter(!next);
      notify(err instanceof ApiError ? err.message : 'Failed to save security settings', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function submitLockMinutes() {
    if (!company) return;
    setLockSaving(true);
    clearErrors();
    try {
      const updated = await api.put<Company>(`/companies/${company.id}`, { pos_lock_idle_minutes: lockMinutes || '0' });
      setCompany(updated);
      setLockMinutes(String(updated.pos_lock_idle_minutes));
      // This value rides the auth payload (see AuthController::
      // attachCompanyProfile), not a dedicated endpoint — without this,
      // a shift already underway on another terminal would keep the old
      // timeout until that cashier's next sign-in.
      await refreshUser();
      notify('Idle lock updated');
    } catch (err) {
      reportError(err, 'Failed to save idle lock');
    } finally {
      setLockSaving(false);
    }
  }

  if (loading) {
    return (
      <Stack sx={{ alignItems: 'center', py: 6 }}>
        <CircularProgress size={22} />
      </Stack>
    );
  }

  return (
    <Grid container spacing={2.5} sx={{ alignItems: 'stretch' }}>
      <Grid size={{ xs: 12, md: 6 }} sx={{ display: 'flex' }}>
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, width: '100%' }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 2 }}>
          <ShieldOutlinedIcon color="primary" />
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Void / cancel approval
          </Typography>
        </Stack>
        {/* One line, not the five-line paragraph this used to open with.
            The detail it carried — that a reason is always collected and
            everything lands in the Audit Trail either way — is true of
            both switches regardless of setting, so it reads as a footnote
            below them rather than a preamble above them. */}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Whether a supervisor has to sign off before the cashier can take something back off a sale.
        </Typography>

        <Stack spacing={1.5}>
          <SecurityToggle
            title="Voiding a single item"
            detail="Mis-scans are constant, and gating every one tends to end with the supervisor's password being shared. Recommended off."
            checked={itemVoid}
            disabled={saving}
            onChange={(v) => toggle('require_item_void_approval', v)}
          />
          <SecurityToggle
            title="Cancelling an entire sale"
            detail="Rare and high-signal, so the friction is cheap and the alarm means something. Recommended on."
            checked={cancel}
            disabled={saving}
            onChange={(v) => toggle('require_cancel_approval', v)}
          />
        </Stack>

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2.5 }}>
          Either way the cashier picks a reason, and every void, cancellation and denied attempt is recorded in the
          Audit Trail.
        </Typography>
      </Paper>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }} sx={{ display: 'flex' }}>
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, width: '100%' }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 2 }}>
          <LockOutlinedIcon color="primary" />
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Idle lock
          </Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Covers the POS screen after it sits untouched this long, so a half-rung sale isn't left on show. 0 turns
          automatic locking off — cashiers can always lock by hand from the account menu.
        </Typography>

        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
          <TextField
            label="Lock after"
            type="number"
            value={lockMinutes}
            onChange={(e) => {
              setLockMinutes(e.target.value);
              clearField('pos_lock_idle_minutes');
            }}
            error={!!fieldErrors?.pos_lock_idle_minutes}
            helperText={fieldErrors?.pos_lock_idle_minutes}
            slotProps={{ htmlInput: { min: 0, step: 1 }, input: { endAdornment: <InputAdornment position="end">minutes idle</InputAdornment> } }}
            sx={{ width: 260 }}
          />
          <Button variant="contained" onClick={submitLockMinutes} disabled={lockSaving} sx={{ height: 56 }}>
            {lockSaving ? 'Saving…' : 'Save'}
          </Button>
        </Stack>
        {formError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {formError}
          </Alert>
        )}
      </Paper>
      </Grid>

      <Grid size={{ xs: 12 }}>
        <ResetConfigurationCard />
      </Grid>
    </Grid>
  );
}

/**
 * Wipes this company's configuration back to how a new install starts.
 *
 * Lives at the bottom of Security, behind its own red-bordered card and
 * a typed confirmation, because it is the only irreversible control in
 * Settings. Eligibility is checked up front rather than on press: the
 * server refuses a reset once the system has issued any document, and
 * saying so before the button is touched is better than offering an
 * action that is going to be rejected.
 */
function ResetConfigurationCard() {
  const notify = useSnackbar();
  const [eligibility, setEligibility] = useState<{ can_reset: boolean; blockers: string[] } | null>(null);
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [resetting, setResetting] = useState(false);

  function loadEligibility() {
    api
      .get<{ can_reset: boolean; blockers: string[] }>('/system/reset-eligibility')
      .then(setEligibility)
      .catch(() => setEligibility(null));
  }

  useEffect(loadEligibility, []);

  async function run() {
    setResetting(true);
    try {
      await api.post('/system/reset', { confirm: 'RESET' });
      notify('Configuration reset. Start again from the Setup Guide.');
      // Hard reload: half the app is holding company settings, store
      // lists and tax rates in state that no longer exist.
      window.location.assign('/admin/settings/guide');
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Reset failed', 'error');
      setResetting(false);
      setOpen(false);
      loadEligibility();
    }
  }

  return (
    <>
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, borderColor: 'error.main' }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 2 }}>
          <WarningAmberOutlinedIcon color="error" />
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Reset configuration
          </Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Clears every branch, terminal, payment method, tax rate and invoice series, along with all company settings, and puts the system
          back where a new install starts. Products, suppliers and customers are kept — but their per-branch prices and stock go with the
          branches.
        </Typography>

        {eligibility && !eligibility.can_reset ? (
          <Alert severity="info">
            Not available — this system has already been used for real business ({eligibility.blockers.join(', ')}). Configuration that
            produced issued documents has to stay with them.
          </Alert>
        ) : (
          <Button
            variant="outlined"
            color="error"
            onClick={() => {
              setTyped('');
              setOpen(true);
            }}
            disabled={!eligibility}
          >
            Reset configuration…
          </Button>
        )}
      </Paper>

      <Modal open={open} title="Reset configuration" onClose={() => setOpen(false)} compact>
        <Alert severity="error" sx={{ mb: 2 }}>
          This cannot be undone. Everything listed below is deleted immediately.
        </Alert>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Branches, POS terminals, payment methods, tax rates, invoice series, cash sessions and Z-readings, plus all company settings —
          business profile, currency, discounts, loyalty and security. Per-branch prices and stock levels go with the branches. Your
          products, suppliers and customers stay.
        </Typography>
        <TextField
          label="Type RESET to confirm"
          fullWidth
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          autoComplete="off"
        />
        <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'flex-end', mt: 3 }}>
          <Button variant="text" onClick={() => setOpen(false)} disabled={resetting}>
            Cancel
          </Button>
          <Button variant="contained" color="error" onClick={run} disabled={typed !== 'RESET' || resetting}>
            {resetting ? 'Resetting…' : 'Reset everything'}
          </Button>
        </Stack>
      </Modal>
    </>
  );
}

/**
 * Everything about how a discount behaves at the register, plus the
 * loyalty earn rate that used to be a tab of its own — split out from
 * Security (which covers only voiding/cancelling a sale) since these are
 * pricing/rewards decisions, not a security policy, even though the
 * approval switch below happens to work the same way a security switch
 * does.
 *
 * Discount ELIGIBILITY (which products/categories a given type even
 * applies to) is deliberately NOT duplicated here — it's configured per
 * category or per product, from each one's own Discount Eligibility
 * action on the Products screen, since it doesn't have a single
 * company-wide value the way approval and the default rates do. The
 * note below just points there rather than re-explaining it.
 */
function DiscountsTab() {
  const { user, hasPermission } = useAuth();
  const notify = useSnackbar();
  // Each half of this merged tab keeps the permission it had as its own
  // tab — the tab itself appears for either (see TAB_PERMISSIONS).
  const canManageCompany = hasPermission('companies.manage');
  const canViewLoyalty = hasPermission('loyalty.view');
  const [company, setCompany] = useState<Company | null>(null);
  const [manualDiscount, setManualDiscount] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.company_id) return;
    api
      .get<Company>(`/companies/${user.company_id}`)
      .then((c) => {
        setCompany(c);
        setManualDiscount(Number(c.require_manual_discount_approval) === 1);
      })
      .finally(() => setLoading(false));
  }, [user?.company_id]);

  async function toggleManualDiscount(next: boolean) {
    if (!company) return;
    setManualDiscount(next);
    setSaving(true);
    try {
      const updated = await api.put<Company>(`/companies/${company.id}`, { require_manual_discount_approval: next ? 1 : 0 });
      setCompany(updated);
      setManualDiscount(Number(updated.require_manual_discount_approval) === 1);
      notify('Discount settings updated');
    } catch (err) {
      setManualDiscount(!next);
      notify(err instanceof ApiError ? err.message : 'Failed to save discount settings', 'error');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Stack sx={{ alignItems: 'center', py: 6 }}>
        <CircularProgress size={22} />
      </Stack>
    );
  }

  return (
    <Grid container spacing={2.5} sx={{ alignItems: 'stretch' }}>
      {canManageCompany && (
        <Grid size={{ xs: 12, md: 6 }} sx={{ display: 'flex' }}>
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, width: '100%' }}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 2 }}>
              <SellOutlinedIcon color="primary" />
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Manual Discount approval
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              The one discount type with no statutory rate or company policy behind it — pure cashier discretion.
            </Typography>
            <SecurityToggle
              title="Applying a Manual Discount"
              detail="Needs a supervisor's username and password. Recommended on."
              checked={manualDiscount}
              disabled={saving}
              onChange={toggleManualDiscount}
            />
          </Paper>
        </Grid>
      )}

      {company && canViewLoyalty && (
        <Grid size={{ xs: 12, md: 6 }} sx={{ display: 'flex' }}>
          <LoyaltyPointsSection company={company} onSaved={setCompany} />
        </Grid>
      )}

      {company && canManageCompany && (
        <Grid size={{ xs: 12 }}>
          <DiscountDefaultsSection company={company} onSaved={setCompany} />
        </Grid>
      )}

      {canManageCompany && (
        <Grid size={{ xs: 12 }}>
          <Alert severity="info">
            Which products or categories a discount applies to is set per item — open Products, then a category or
            item's own Discount Eligibility action.
          </Alert>
        </Grid>
      )}
    </Grid>
  );
}

const DISCOUNT_DEFAULT_FIELDS = [
  { field: 'default_regular_discount_percent' as const, label: 'Regular Discount' },
  { field: 'default_promo_discount_percent' as const, label: 'Promo Discount' },
  { field: 'default_employee_discount_percent' as const, label: 'Employee Discount' },
  { field: 'default_member_discount_percent' as const, label: 'Member / Loyalty Discount' },
  { field: 'default_wholesale_discount_percent' as const, label: 'Wholesale / Bulk Discount' },
];

/**
 * A starting percentage the POS's Discount dialog pre-fills for each of
 * the five configurable discount types — Regular/Promo/Employee/Member/
 * Wholesale (see TaxService::DISCOUNT_TYPES; Senior Citizen/PWD/5% BNPC
 * have a statutory rate instead, and Manual is deliberately left blank
 * every time). Never an enforced ceiling: the cashier can always type a
 * different number over whatever this pre-fills, so leaving a field
 * blank here just means the dialog starts empty, same as before this
 * existed — not that the discount type is unavailable.
 */
function DiscountDefaultsSection({ company, onSaved }: { company: Company; onSaved: (c: Company) => void }) {
  const notify = useSnackbar();
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(DISCOUNT_DEFAULT_FIELDS.map(({ field }) => [field, company[field] === null ? '' : String(company[field])]))
  );
  const [saving, setSaving] = useState(false);
  const { fieldErrors, formError, clearErrors, clearField, reportError } = useFormErrors();

  async function submit() {
    setSaving(true);
    clearErrors();
    try {
      const payload = Object.fromEntries(
        DISCOUNT_DEFAULT_FIELDS.map(({ field }) => [field, values[field].trim() === '' ? null : values[field].trim()])
      );
      const updated = await api.put<Company>(`/companies/${company.id}`, payload);
      onSaved(updated);
      setValues(Object.fromEntries(DISCOUNT_DEFAULT_FIELDS.map(({ field }) => [field, updated[field] === null ? '' : String(updated[field])])));
      notify('Discount defaults updated');
    } catch (err) {
      reportError(err, 'Failed to save discount defaults');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 2 }}>
        <SellOutlinedIcon color="primary" />
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          Discount defaults
        </Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        What the cashier's Discount dialog pre-fills. They can always type over it; blank just opens it empty.
      </Typography>

      {/* Three across rather than five stacked: as a single column these
          five short percent fields ran the height of the viewport while
          leaving half the card empty beside them. */}
      <Grid container spacing={2}>
        {DISCOUNT_DEFAULT_FIELDS.map(({ field, label }) => (
          <Grid key={field} size={{ xs: 12, sm: 6, md: 4 }}>
            <TextField
              label={label}
              type="number"
              fullWidth
              value={values[field]}
              onChange={(e) => {
                setValues((prev) => ({ ...prev, [field]: e.target.value }));
                clearField(field);
              }}
              error={!!fieldErrors?.[field]}
              helperText={fieldErrors?.[field] ?? 'Blank = no default'}
              slotProps={{ htmlInput: { min: 0, max: 100, step: 0.01 }, input: { endAdornment: <InputAdornment position="end">%</InputAdornment> } }}
            />
          </Grid>
        ))}
      </Grid>

      {formError && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {formError}
        </Alert>
      )}

      <Stack direction="row" sx={{ justifyContent: 'flex-end', mt: 3 }}>
        <Button variant="contained" onClick={submit} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </Stack>
    </Paper>
  );
}

function SecurityToggle({
  title,
  detail,
  checked,
  disabled,
  onChange,
}: {
  title: string;
  detail: string;
  checked: boolean;
  disabled: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <Stack
      direction="row"
      spacing={2}
      sx={{ alignItems: 'center', justifyContent: 'space-between', p: 2, borderRadius: 2, bgcolor: 'action.hover' }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontWeight: 700 }}>{title}</Typography>
        <Typography variant="caption" color="text.secondary">
          {detail}
        </Typography>
      </Box>
      <Switch checked={checked} onChange={(e) => onChange(e.target.checked)} disabled={disabled} />
    </Stack>
  );
}

/**
 * Currency and tax regime — the two company-wide settings that decide how
 * money is written and what the tax on a receipt is called.
 *
 * Both live on the companies table and both ride out to the rest of the
 * app on the auth payload rather than behind an endpoint of their own
 * (see AuthController::attachCompanyProfile), which is why saving here
 * calls refreshUser: without it the POS would keep printing the old
 * currency symbol until the cashier next signed in.
 */
/**
 * The currency/tax-wording half of the Tax tab (see TaxTab). Laid out as
 * two side-by-side cards rather than a 620px-wide single column — these
 * are two short forms, and stacking them left-aligned left roughly half
 * the card empty at desktop widths.
 */
function TaxSettingsCards({ onRegimeSaved }: { onRegimeSaved: () => void }) {
  const { user, refreshUser } = useAuth();
  const notify = useSnackbar();
  const [company, setCompany] = useState<Company | null>(null);
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { fieldErrors, formError, clearErrors, reportError } = useFormErrors();

  /**
   * Derived from the currency rather than chosen: the tax system a
   * company is on follows from where it trades, so picking Peso settles
   * VAT and picking Kina settles GST on its own (see
   * taxSystemForCurrency). The select below shows it read-only.
   *
   * Not state, because there's no second source for it to drift from —
   * whatever the saved column says, what will be saved next is whatever
   * this currency implies. A company loaded with a mismatched pair (set
   * before this was derived) therefore shows as dirty until saved, which
   * is the correction being offered rather than a bug.
   */
  const system = taxSystemForCurrency(currency);

  useEffect(() => {
    if (!user?.company_id) return;
    api
      .get<Company>(`/companies/${user.company_id}`)
      .then((c) => {
        setCompany(c);
        setCurrency(c.currency || DEFAULT_CURRENCY);
      })
      .finally(() => setLoading(false));
  }, [user?.company_id]);

  const dirty = company !== null && (currency !== (company.currency || DEFAULT_CURRENCY) || system !== taxSystemOf(company.tax_system));
  /**
   * Saving this particular change swaps the whole rate list underneath —
   * rates belong to one regime or the other (TaxesController::
   * applyScope), so a company moving to GST stops seeing its VAT rates
   * and starts with none. Worth saying before the Save rather than
   * leaving an empty table to explain itself afterwards.
   */
  const switchesRegime = company !== null && system !== taxSystemOf(company.tax_system);

  async function submit() {
    if (!company) return;
    setSaving(true);
    clearErrors();
    try {
      const updated = await api.put<Company>(`/companies/${company.id}`, { currency, tax_system: system });
      const regimeChanged = taxSystemOf(updated.tax_system) !== taxSystemOf(company.tax_system);
      setCompany(updated);
      setCurrency(updated.currency || DEFAULT_CURRENCY);
      // Before onRegimeSaved: the rates table reads the regime off the
      // auth user, so it has to be current by the time that remount
      // refetches, or it asks again as the system it just left.
      await refreshUser();
      if (regimeChanged) onRegimeSaved();
      notify('Regional settings updated');
    } catch (err) {
      reportError(err, 'Failed to save regional settings');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Typography color="text.secondary">Loading…</Typography>;
  if (!company) return <Alert severity="error">Could not load company settings.</Alert>;

  const sample = `${currencySymbol(currency)}1,234.50`;

  return (
    <Grid container spacing={2.5} sx={{ alignItems: 'stretch' }}>
      <Grid size={{ xs: 12, md: 6 }} sx={{ display: 'flex' }}>
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, width: '100%' }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 2 }}>
          <PaymentsOutlinedIcon color="primary" />
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Currency
          </Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
          How money is written across the POS and Back Office — never what it is worth. Nothing already recorded is
          converted.
        </Typography>
        <SearchableSelect
          label="Currency"
          value={currency}
          onChange={setCurrency}
          fullWidth
          options={CURRENCIES.map((c) => ({ value: c.code, label: `${c.code} — ${c.name} (${c.symbol})` }))}
        />
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
          Amounts will read as <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>{sample}</Box>
        </Typography>
        {fieldErrors?.currency && (
          <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1 }}>
            {fieldErrors.currency}
          </Typography>
        )}
      </Paper>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }} sx={{ display: 'flex' }}>
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, width: '100%' }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 2 }}>
          <ReceiptLongOutlinedIcon color="primary" />
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Tax system
          </Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
          What the tax is called and which receipt lines print. The rates themselves are set below.
        </Typography>
        <SearchableSelect
          label="Tax system"
          value={system}
          // Read-only, and driven entirely by the currency above. The
          // regime a company is on is a fact about where it trades, not
          // a preference, so it's shown rather than asked — which also
          // removes the one combination that was previously reachable
          // and always wrong: pesos labelled GST, or kina labelled
          // Philippine VAT.
          disabled
          onChange={() => {}}
          fullWidth
          options={[
            { value: 'vat', label: 'Philippine VAT' },
            { value: 'gst', label: 'GST' },
          ]}
        />
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
          Set automatically from the currency —{' '}
          <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>{currencyName(currency)}</Box>{' '}
          countries levy{' '}
          <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>{TAX_SYSTEMS[system].label}</Box>.
        </Typography>
        {/* Said plainly and up front, because the alternative is someone
            switching to GST and assuming the system has become compliant
            somewhere it hasn't. The arithmetic genuinely is identical;
            the Philippine statutory apparatus around it is not. */}
        <Alert severity="info" sx={{ mt: 2.5, borderRadius: 2 }}>
          {system === 'gst' ? (
            <>
              Tax is calculated exactly as before — a percentage, inclusive or exclusive — and is labelled{' '}
              <strong>GST</strong>. The Philippine BIR line indicators (V / E / Z / N) and the Vatable, VAT-Exempt and
              Zero-Rated receipt breakdown are hidden, because they have no GST equivalent. Senior Citizen, PWD and 5%
              BNPC discounts stay Philippine-specific and are unaffected by this setting.
            </>
          ) : (
            <>
              Tax is labelled <strong>VAT</strong>, and receipts print the BIR line indicators (V / E / Z / N) and the
              Vatable, VAT-Exempt and Zero-Rated breakdown where a store has BIR details switched on.
            </>
          )}
        </Alert>
      </Paper>
      </Grid>

      {switchesRegime && (
        <Grid size={{ xs: 12 }}>
          <Alert severity="warning">
            Saving this switches the tax system to <strong>{TAX_SYSTEMS[system].label}</strong>, and the rates below
            change with it — each rate belongs to one system. Anything set up under{' '}
            <strong>{TAX_SYSTEMS[taxSystemOf(company.tax_system)].label}</strong> stays saved and comes back if you
            switch the currency back, but you'll need to add {TAX_SYSTEMS[system].label} rates before tax can be
            charged.
          </Alert>
        </Grid>
      )}

      {formError && (
        <Grid size={{ xs: 12 }}>
          <Alert severity="error">{formError}</Alert>
        </Grid>
      )}

      <Grid size={{ xs: 12 }}>
        <Button variant="contained" onClick={submit} disabled={saving || !dirty}>
          {saving ? 'Saving…' : 'Save Changes'}
        </Button>
      </Grid>
    </Grid>
  );
}
