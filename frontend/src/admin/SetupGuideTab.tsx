import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { Company, InvoiceSeries, PaymentMethodOption, Register, Store, TaxRate, Unit } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import LinearProgress from '@mui/material/LinearProgress';
import CircularProgress from '@mui/material/CircularProgress';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import HelpOutlineIcon from '@mui/icons-material/HelpOutlineOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

/** The Settings tabs this guide can send someone to — kept as a loose string so SettingsScreen owns the real Tab union. */
export type SetupTarget = 'stores' | 'registers' | 'payment-methods' | 'invoicing' | 'tax' | 'discounts' | 'units' | 'security';

/**
 * Any-of permissions per target, mirroring SettingsScreen's own
 * TAB_PERMISSIONS. Not derivable as `${target}.view`: Discounts &
 * Loyalty and Security both write the companies row and are gated on
 * companies.manage, and there is no discounts.view or security.view slug
 * to check — assuming the pattern held left both steps' buttons dead.
 */
const TARGET_PERMISSIONS: Record<SetupTarget, string[]> = {
  stores: ['stores.view'],
  registers: ['registers.view'],
  'payment-methods': ['payment-methods.view'],
  invoicing: ['invoice-series.view'],
  tax: ['taxes.view', 'companies.manage'],
  discounts: ['companies.manage'],
  units: ['units.view'],
  security: ['companies.manage'],
};

interface Step {
  title: string;
  /** Why this step exists, in terms of what breaks without it. */
  detail: string;
  target: SetupTarget;
  /** A sale cannot be rung up at all until every required step is done. */
  required: boolean;
  /**
   * true = configured, false = not yet, null = couldn't tell (the
   * signed-in role can't read that endpoint). Null renders as "Can't
   * check" rather than a false "not done", because telling an admin
   * their tax rates are missing when they simply can't see them is
   * worse than admitting the guide doesn't know.
   */
  done: boolean | null;
  /** Shown under a done step when it works but isn't fully set up for BIR. */
  warning?: string;
}

/**
 * Settings → Setup Guide. The configuration order for a new deployment,
 * with each step's real state read from the API rather than ticked off by
 * hand.
 *
 * The order is the dependency order, not a preference: a terminal needs a
 * branch to belong to, an invoice series needs a branch to be registered
 * against, and a sale needs all of a branch, a terminal, a payment
 * method, a tax rate and an ACTIVE invoice series before the register
 * will accept it. Working down this list is the shortest path to a till
 * that can actually take money.
 */
export function SetupGuideTab({ onNavigate }: { onNavigate: (target: SetupTarget) => void }) {
  const { user, hasPermission } = useAuth();
  const [steps, setSteps] = useState<Step[] | null>(null);

  useEffect(() => {
    if (!user?.company_id) return;

    // Every call is individually catchable: this screen is read by roles
    // with very different reach, and one 403 must degrade that step to
    // "can't check" rather than blanking the whole guide.
    const safe = <T,>(p: Promise<T>) => p.then((v) => v).catch(() => null);

    Promise.all([
      safe(api.get<Company>(`/companies/${user.company_id}`)),
      safe(api.get<Store[]>('/stores?per_page=200')),
      safe(api.get<Register[]>('/registers?per_page=200')),
      safe(api.get<PaymentMethodOption[]>('/payment-methods?per_page=200')),
      safe(api.get<TaxRate[]>('/taxes?per_page=200')),
      safe(api.get<InvoiceSeries[]>('/invoice-series?status=active&per_page=200')),
      safe(api.get<Unit[]>('/units?per_page=200')),
    ]).then(([company, stores, registers, methods, taxes, series, units]) => {
      const branchesMissingBir = (stores ?? []).filter((s) => !s.vat_reg_tin || !s.min_no || !s.pos_serial_no || !s.ptu_number);

      setSteps([
        {
          title: 'Business profile',
          detail:
            "Your registered business name and TIN. These print at the top of every receipt, so a receipt issued before they're set carries the wrong identity permanently.",
          target: 'invoicing',
          required: true,
          done: company === null ? null : Boolean(company.tax_id && (company.legal_name || company.trade_name)),
        },
        {
          title: 'Currency and tax rates',
          detail:
            'The currency settles whether tax is called VAT or GST. Then add the rates you actually charge — a product with no tax rate can still be sold, but nothing will be reported as VATable.',
          target: 'tax',
          required: true,
          done: taxes === null ? null : taxes.length > 0,
        },
        {
          title: 'Branches',
          detail:
            'One per physical location. Each carries its own BIR identifiers — VAT Reg TIN, MIN, POS serial and Permit to Use — which print on that branch’s receipts.',
          target: 'stores',
          required: true,
          done: stores === null ? null : stores.length > 0,
          warning:
            stores && stores.length > 0 && branchesMissingBir.length > 0
              ? `${branchesMissingBir.length} of ${stores.length} branch${stores.length === 1 ? '' : 'es'} still missing BIR identifiers (VAT Reg TIN, MIN, serial or PTU). Sales will work, but the receipts are not accreditation-ready.`
              : undefined,
        },
        {
          title: 'POS terminals',
          detail:
            'The registers at each branch. A cashier picks one when they open a drawer, and every X/Z reading belongs to one terminal.',
          target: 'registers',
          required: true,
          done: registers === null ? null : registers.length > 0,
        },
        {
          title: 'Payment methods',
          detail: 'What a cashier can accept. Cash always exists and cannot be removed; add card, GCash, Maya or your own.',
          target: 'payment-methods',
          required: true,
          done: methods === null ? null : methods.length > 0,
        },
        {
          title: 'Invoice series',
          detail:
            'The BIR-registered numbering each branch issues invoices from. This is the one that stops the till outright — with no active series, the register refuses every sale.',
          target: 'invoicing',
          required: true,
          done: series === null ? null : series.length > 0,
        },
        {
          title: 'Units',
          detail: 'Pieces, kilos, packs. A product needs one before it can be priced and sold by anything other than whole numbers.',
          target: 'units',
          required: true,
          done: units === null ? null : units.length > 0,
        },
        {
          title: 'Discounts and loyalty',
          detail:
            'Default discount percentages, whether a manual discount needs a supervisor, and points earned per sale. Senior Citizen and PWD rates are statutory and already built in.',
          target: 'discounts',
          required: false,
          done: null,
        },
        {
          title: 'Security',
          detail: 'Whether voiding an item or cancelling a sale needs a supervisor, and how long the POS sits idle before it locks itself.',
          target: 'security',
          required: false,
          done: null,
        },
      ]);
    });
  }, [user?.company_id]);

  if (!steps) {
    return (
      <Stack sx={{ alignItems: 'center', py: 6 }}>
        <CircularProgress size={22} />
      </Stack>
    );
  }

  const required = steps.filter((s) => s.required);
  const doneCount = required.filter((s) => s.done === true).length;
  const blockers = required.filter((s) => s.done === false);
  const allDone = blockers.length === 0;

  return (
    <Stack spacing={2.5}>
      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
          Setting up this system
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Work down the list in order — each step depends on the ones above it. The required steps are what a register needs before it will
          accept a single sale; the last two are policy choices you can come back to.
        </Typography>

        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 1 }}>
          <Box sx={{ flex: 1 }}>
            <LinearProgress
              variant="determinate"
              value={(doneCount / required.length) * 100}
              sx={{ height: 8, borderRadius: 99 }}
              color={allDone ? 'success' : 'primary'}
            />
          </Box>
          <Typography variant="body2" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
            {doneCount} of {required.length} required
          </Typography>
        </Stack>

        {allDone ? (
          <Alert severity="success" sx={{ mt: 2 }}>
            Everything a register needs is configured. A cashier can open a drawer and start selling.
          </Alert>
        ) : (
          <Alert severity="warning" sx={{ mt: 2 }}>
            Not ready to sell yet — {blockers.length} required step{blockers.length === 1 ? '' : 's'} left
            {blockers.length > 0 && `, starting with ${blockers[0].title.toLowerCase()}`}.
          </Alert>
        )}
      </Paper>

      {steps.map((step, i) => (
        <Paper key={step.title} variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'flex-start' } }}>
            <Box sx={{ pt: 0.25 }}>
              {step.done === true ? (
                <CheckCircleIcon color="success" />
              ) : step.done === null ? (
                <HelpOutlineIcon sx={{ color: 'text.disabled' }} />
              ) : (
                <RadioButtonUncheckedIcon sx={{ color: 'text.disabled' }} />
              )}
            </Box>

            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', mb: 0.5 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {i + 1}. {step.title}
                </Typography>
                {step.required ? (
                  step.done === true ? (
                    <Chip size="small" label="Done" color="success" />
                  ) : step.done === null ? (
                    <Chip size="small" label="Can't check" />
                  ) : (
                    <Chip size="small" label="Needed to sell" color="warning" />
                  )
                ) : (
                  <Chip size="small" label="Optional" variant="outlined" />
                )}
              </Stack>
              <Typography variant="body2" color="text.secondary">
                {step.detail}
              </Typography>
              {step.warning && (
                <Alert severity="info" sx={{ mt: 1.5 }}>
                  {step.warning}
                </Alert>
              )}
              {step.done === null && step.required && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                  Your role can't read this setting, so the guide can't tell whether it's configured.
                </Typography>
              )}
            </Box>

            <Button
              variant={step.done === true ? 'text' : 'contained'}
              endIcon={<ArrowForwardIcon />}
              onClick={() => onNavigate(step.target)}
              sx={{ whiteSpace: 'nowrap', flexShrink: 0 }}
              disabled={!TARGET_PERMISSIONS[step.target].some((p) => hasPermission(p))}
            >
              {step.done === true ? 'Review' : 'Set up'}
            </Button>
          </Stack>
        </Paper>
      ))}

      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
          After Settings
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Settings only covers how the business is configured. To actually trade you still need a catalogue (Products), stock on hand
          (Inventory), and people to ring it up (Team). A cashier then opens a drawer on a terminal from the POS screen, and X/Z readings
          close it out under Cash Drawers.
        </Typography>
      </Paper>
    </Stack>
  );
}
