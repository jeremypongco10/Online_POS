import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { Company, Inventory, InvoiceSeries, PaymentMethodOption, ProductWithStorePrice, Register, Store, TaxRate, Unit } from '../api/types';
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
 * The last two steps finish outside Settings entirely — a configured
 * system still can't sell anything until its products carry a price at a
 * branch and some stock to sell. Kept as their own union rather than
 * folded into SetupTarget so the two navigation paths stay distinct:
 * these change the whole admin section, SetupTarget only swaps a tab.
 */
export type SetupSection = { section: 'products' | 'inventory'; tab: string };

const SECTION_TARGETS: Record<'prices' | 'stock', SetupSection> = {
  prices: { section: 'products', tab: 'prices' },
  stock: { section: 'inventory', tab: 'stock' },
};

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
  /** Exactly one of these — a Settings tab, or another admin section entirely. */
  target?: SetupTarget;
  sectionTarget?: SetupSection;
  /** Permissions (any-of) the Go button needs; defaults to the target's own. */
  permissions?: string[];
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

/** A step's own `permissions` if it declared any, else its Settings tab's. */
function stepPermissions(step: Step): string[] {
  if (step.permissions) return step.permissions;
  return step.target ? TARGET_PERMISSIONS[step.target] : [];
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
 * will accept it.
 *
 * The last two required steps deliberately leave Settings behind. A system
 * whose Settings are perfect still cannot sell anything: every product
 * shows "No price" until it is priced AT A BRANCH, and a stock-tracked one
 * is refused at the till until it has been counted in. Those were the two
 * states this system was actually sitting in after a configuration reset —
 * nine green ticks and a register that couldn't ring up a single item — so
 * the guide now carries them through to a till that takes money rather
 * than stopping at the last settings form.
 */
export function SetupGuideTab({
  onNavigate,
  onNavigateSection,
}: {
  onNavigate: (target: SetupTarget) => void;
  /** Optional so SettingsScreen can still be rendered standalone; the two out-of-Settings steps simply don't navigate without it. */
  onNavigateSection?: (target: SetupSection) => void;
}) {
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
      // Pricing and stock are per-branch, so "is anything priced at all"
      // can only be asked of one branch at a time. The first branch is a
      // fair proxy: a company that has priced its catalog anywhere has
      // priced it here, and the step's job is to catch the zero state (a
      // fresh install or a configuration reset), not to audit coverage
      // branch by branch.
      safe(api.getPaged<Inventory>('/inventory?per_page=1')),
    ]).then(async ([company, stores, registers, methods, taxes, series, units, stock]) => {
      const branchesMissingBir = (stores ?? []).filter((s) => !s.vat_reg_tin || !s.min_no || !s.pos_serial_no || !s.ptu_number);

      // Deliberately sequenced after the batch above rather than joined
      // into it: `store_id` is required to resolve a price at all, and it
      // isn't known until /stores has answered.
      const firstStore = stores?.[0];
      const pricedSample = firstStore
        ? await safe(api.get<ProductWithStorePrice[]>(`/products?store_id=${firstStore.id}&per_page=50`))
        : null;
      const anyPriced = pricedSample === null ? null : pricedSample.some((p) => p.selling_price !== null);

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
          title: 'Product prices',
          detail:
            'Prices are per branch, not per product — a product with no price at the branch a cashier is on shows as "No price" on the till and cannot be added to a cart. Use Bulk Update Prices to set a whole category at once.',
          sectionTarget: SECTION_TARGETS.prices,
          permissions: ['products.update'],
          required: true,
          done: anyPriced,
        },
        {
          title: 'Opening stock',
          detail:
            'What is actually on the shelf right now. Stock-tracked products block a sale once they hit zero, so a catalog that has never been counted in stops the till the first time someone rings one up.',
          sectionTarget: SECTION_TARGETS.stock,
          permissions: ['inventory.view'],
          required: true,
          done: stock === null ? null : (stock.meta?.total ?? 0) > 0,
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
              onClick={() => (step.sectionTarget ? onNavigateSection?.(step.sectionTarget) : step.target && onNavigate(step.target))}
              sx={{ whiteSpace: 'nowrap', flexShrink: 0 }}
              disabled={stepPermissions(step).length > 0 && !stepPermissions(step).some((p) => hasPermission(p))}
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
