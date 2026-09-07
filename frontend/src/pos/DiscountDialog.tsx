import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CloseIcon from '@mui/icons-material/Close';
import ElderlyIcon from '@mui/icons-material/Elderly';
import AccessibleIcon from '@mui/icons-material/Accessible';
import ShoppingBasketOutlinedIcon from '@mui/icons-material/ShoppingBasketOutlined';
import SellOutlinedIcon from '@mui/icons-material/SellOutlined';
import CampaignOutlinedIcon from '@mui/icons-material/CampaignOutlined';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import LoyaltyOutlinedIcon from '@mui/icons-material/LoyaltyOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutlineOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { api, ApiError } from '../api/client';
import type { CartLine } from './posTypes';
import { previewGovernmentDiscount } from './posTypes';
import {
  DISCOUNT_TYPES,
  type ConfigurableDiscountTypeCode,
  type DiscountCategory,
  type DiscountDefaults,
  type DiscountTypeCode,
} from './discountTypes';
import { formatMoney, formatQuantity, POS_ACCENT } from './format';
import { IS_TOUCH } from '../isTouch';

/**
 * Which lines the discount is being chosen for.
 *
 *  - 'cart' is the normal workflow: the cashier picks ONE discount for
 *    the sale and the POS decides which lines qualify. It deliberately
 *    doesn't carry the lines with it — they're passed live, so a cart
 *    edited while this is open can't be applied against a stale snapshot.
 *  - 'line' is the exception path, from a single cart row, for
 *    correcting one item after the fact.
 */
export type DiscountTarget = { kind: 'cart' } | { kind: 'line'; line: CartLine };

/** What DiscountDialog hands back once the cashier confirms. `amounts` is keyed by CartLine.key — one entry per line that qualified. */
export interface DiscountResult {
  discountType: DiscountTypeCode;
  amounts: Record<string, number>;
  holderName?: string;
  holderIdNumber?: string;
}

interface Props {
  /** null = closed. */
  target: DiscountTarget | null;
  /** The live cart. A 'cart' target discounts every eligible line of this; a 'line' target ignores it. */
  lines: CartLine[];
  /** Whether picking Manual Discount asks for a supervisor — Company::require_manual_discount_approval, see PosScreen. */
  requireManualApproval: boolean;
  /** Per-company starting points for Regular/Promo/Employee/Member/Wholesale — see Settings' Discounts tab. */
  discountDefaults: DiscountDefaults;
  storeId: number | null;
  /** Senior Citizen/PWD documentation already on file this sale, if any — prefilled so it isn't re-typed. */
  holderName: string;
  holderIdNumber: string;
  onClose: () => void;
  onApply: (result: DiscountResult) => void;
  /** Clears every discount on the cart. Offered only when something is actually discounted. */
  onRemoveAll: () => void;
}

const CATEGORY_LABELS: Record<DiscountCategory, string> = {
  government: 'Government',
  configurable: 'Store & Promotional',
  manual: 'Other',
};

/** The picker's two columns, balanced by row count rather than meaning — see the layout comment where it's rendered. */
const CATEGORY_COLUMNS: DiscountCategory[][] = [
  ['government', 'manual'],
  ['configurable'],
];

/**
 * The face each type wears in the picker. Presentation only, so it lives
 * here rather than in discountTypes.ts, which stays the data/rules
 * source both this and the Back Office screens read.
 */
const TYPE_FACE: Record<DiscountTypeCode, { icon: ReactNode; color: string }> = {
  senior_citizen: { icon: <ElderlyIcon />, color: '#16a34a' },
  pwd: { icon: <AccessibleIcon />, color: '#2563eb' },
  sc_pwd_5_bnpc: { icon: <ShoppingBasketOutlinedIcon />, color: '#0d9488' },
  regular: { icon: <SellOutlinedIcon />, color: '#e11d48' },
  promo: { icon: <CampaignOutlinedIcon />, color: '#ea580c' },
  employee: { icon: <BadgeOutlinedIcon />, color: '#7c3aed' },
  member: { icon: <LoyaltyOutlinedIcon />, color: '#f59e0b' },
  wholesale: { icon: <Inventory2OutlinedIcon />, color: '#0891b2' },
  manual: { icon: <TuneOutlinedIcon />, color: '#475569' },
};

/** Preset, matching VoidApprovalDialog's reasoning: a fixed set keeps the audit trail groupable, and typing a sentence mid-queue is slow. */
const MANUAL_REASONS = ['Customer service gesture', 'Damaged packaging', 'Price match', 'Clearance', 'Other'];

const BACKSPACE = '⌫';

/** Same phone-style layout (1 at top-left) as AddQuantityDialog's keypad — a till keypad is what the muscle memory here expects. */
const KEYPAD_ROWS: string[][] = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['.', '0', BACKSPACE],
];

/** One tap instead of two for the rates a store actually reaches for. Percent mode only. */
const QUICK_PERCENTS = [5, 10, 15, 20];

const round2 = (n: number) => Math.round(n * 100) / 100;

const lineSubtotal = (line: CartLine) => line.quantity * line.unitPrice;

/**
 * What the confirm step spells out about the chosen type, derived from
 * the type's own flags rather than written out per type — so the rules
 * shown to the cashier can never drift from the rules actually applied
 * (discountTypes.ts, and TaxService on the server).
 */
function typeNotes(def: (typeof DISCOUNT_TYPES)[number]): string[] {
  const notes: string[] = [];
  if (def.fixedRatePercent !== null) notes.push(`${def.fixedRatePercent}% discount on eligible items`);
  if (def.vatExempt) notes.push('VAT exempt (for qualified purchases)');
  if (def.requiresId) notes.push('Please ensure the customer presents a valid ID.');
  if (def.alwaysRequiresApproval) notes.push('Requires supervisor approval.');
  return notes;
}

/**
 * Splits one cart-wide peso amount across the qualifying lines in
 * proportion to what each contributes, with the last line absorbing
 * whatever the roundings left over so the parts always add back up to
 * exactly the amount entered.
 */
function distributeFixedAmount(amount: number, lines: CartLine[]): Record<string, number> {
  const total = lines.reduce((sum, l) => sum + lineSubtotal(l), 0);
  if (total <= 0 || lines.length === 0) return {};

  const out: Record<string, number> = {};
  let allocated = 0;
  lines.forEach((line, i) => {
    const share = i === lines.length - 1 ? round2(amount - allocated) : round2((amount * lineSubtotal(line)) / total);
    out[line.key] = share;
    allocated = round2(allocated + share);
  });

  return out;
}

/**
 * Discount entry for a sale, in two steps: pick the type, then give
 * that one type what it needs.
 *
 * Split deliberately. Every type asks for something different — Senior
 * Citizen wants a name and an ID, Promo wants a percentage, Manual
 * wants a reason and a supervisor — and showing all of that at once
 * next to a nine-item list made the cashier read past most of a screen
 * to find the two fields that applied to them. One decision per screen
 * is also what makes this usable on a tablet without scrolling.
 *
 * The workflow it serves is unchanged: one discount is chosen for the
 * whole sale and the POS works out which lines qualify (see
 * TaxService::isProductEligibleForDiscount), rather than the cashier
 * picking a type on every row.
 */
export function DiscountDialog({
  target,
  lines,
  requireManualApproval,
  discountDefaults,
  storeId,
  holderName,
  holderIdNumber,
  onClose,
  onApply,
  onRemoveAll,
}: Props) {
  const [step, setStep] = useState<'select' | 'details'>('select');
  const [selected, setSelected] = useState<DiscountTypeCode>('regular');
  const [mode, setMode] = useState<'percent' | 'fixed'>('percent');
  const [valueText, setValueText] = useState('');
  const [name, setName] = useState(holderName);
  const [idNumber, setIdNumber] = useState(holderIdNumber);
  const [reason, setReason] = useState(MANUAL_REASONS[0]);
  const [otherReason, setOtherReason] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  /** Resolved eligibility per product id for everything in scope — one request for the whole basket (ProductsController::bulkDiscountEligibility). null leaves everything eligible; checkout re-checks server-side regardless. */
  const [eligibility, setEligibility] = useState<Record<string, Partial<Record<DiscountTypeCode, boolean>>> | null>(null);

  const targetLines = useMemo(() => {
    if (!target) return [];
    return target.kind === 'cart' ? lines : [target.line];
  }, [target, lines]);

  /** Stable across renders that don't change WHICH products are in scope, so the fetch below doesn't re-run on every quantity tweak. */
  const productIdsKey = useMemo(
    () =>
      Array.from(new Set(targetLines.filter((l) => !l.isCustom).map((l) => l.product.id)))
        .sort((a, b) => a - b)
        .join(','),
    [targetLines]
  );

  const open = target !== null;

  useEffect(() => {
    if (!open || productIdsKey === '') {
      setEligibility(null);
      return;
    }
    let cancelled = false;
    api
      .get<Record<string, Partial<Record<DiscountTypeCode, boolean>>>>(`/products/discount-eligibility?product_ids=${productIdsKey}`)
      .then((res) => {
        if (!cancelled) setEligibility(res);
      })
      .catch(() => {
        if (!cancelled) setEligibility(null);
      });
    return () => {
      cancelled = true;
    };
  }, [open, productIdsKey]);

  /**
   * True while `valueText` holds a number THIS dialog put there as a
   * suggestion (a company default) rather than something the cashier
   * entered — the only state safe to replace when the type changes.
   * Doubles as the keypad's "pristine" flag (see pressKey).
   */
  const autoFilledRef = useRef(false);

  function defaultPercentFor(type: DiscountTypeCode): number | undefined {
    const def = DISCOUNT_TYPES.find((d) => d.code === type);
    if (!def || def.category !== 'configurable') return undefined;
    const value = discountDefaults[def.code as ConfigurableDiscountTypeCode];
    return value === null || value === undefined ? undefined : value;
  }

  /** Resets on each OPEN (and on switching which single line is targeted), not on every cart edit while open. */
  const resetKey = target?.kind === 'line' ? target.line.key : target ? 'cart' : null;

  useEffect(() => {
    if (!target) return;
    const initialType = (target.kind === 'line' ? (target.line.discountType as DiscountTypeCode) : null) || 'regular';
    // Always back to the picker on open — the cashier's first decision is
    // which discount this is, even when re-opening a line that already
    // has one.
    setStep('select');
    setSelected(initialType);
    setMode('percent');

    const existing = target.kind === 'line' ? target.line.discount : 0;
    if (existing > 0) {
      setValueText(String(existing));
      autoFilledRef.current = false;
    } else {
      const defaultPercent = defaultPercentFor(initialType);
      setValueText(defaultPercent !== undefined ? String(defaultPercent) : '');
      autoFilledRef.current = defaultPercent !== undefined;
    }

    setName(holderName);
    setIdNumber(holderIdNumber);
    setReason(MANUAL_REASONS[0]);
    setOtherReason('');
    setIdentifier('');
    setPassword('');
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  /** Offers the company default when a type is picked, but only into an empty field or over a suggestion this dialog put there — never over a number the cashier entered. */
  useEffect(() => {
    if (mode !== 'percent') return;
    if (!autoFilledRef.current && valueText !== '') return;
    const defaultPercent = defaultPercentFor(selected);
    setValueText(defaultPercent !== undefined ? String(defaultPercent) : '');
    autoFilledRef.current = defaultPercent !== undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, mode]);

  const def = useMemo(() => DISCOUNT_TYPES.find((d) => d.code === selected)!, [selected]);

  /** A custom (non-catalog) line has no product to look a rule up against — the backend treats it as eligible, and so does this. */
  function isEligible(line: CartLine, type: DiscountTypeCode): boolean {
    if (line.isCustom) return true;
    return eligibility?.[String(line.product.id)]?.[type] !== false;
  }

  const eligibleLines = targetLines.filter((l) => isEligible(l, def.code));
  const skippedLines = targetLines.filter((l) => !isEligible(l, def.code));
  const eligibleSubtotal = round2(eligibleLines.reduce((sum, l) => sum + lineSubtotal(l), 0));

  /** What each qualifying line would receive, keyed by CartLine.key. */
  const amounts = useMemo(() => {
    if (def.fixedRatePercent !== null) {
      return Object.fromEntries(
        eligibleLines.map((l) => [l.key, previewGovernmentDiscount(l.quantity, l.unitPrice, l.taxRate, def.code)])
      );
    }

    const value = parseFloat(valueText) || 0;
    if (mode === 'percent') {
      return Object.fromEntries(eligibleLines.map((l) => [l.key, round2((lineSubtotal(l) * value) / 100)]));
    }
    return distributeFixedAmount(value, eligibleLines);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [def, mode, valueText, eligibleLines.map((l) => `${l.key}:${l.quantity}:${l.unitPrice}`).join('|')]);

  const totalDiscount = round2(Object.values(amounts).reduce((sum, n) => sum + n, 0));

  function pressKey(key: string) {
    const base = autoFilledRef.current ? '' : valueText;
    autoFilledRef.current = false;

    if (key === BACKSPACE) {
      setValueText(base.slice(0, -1));
      return;
    }
    if (key === '.') {
      setValueText(base.includes('.') ? base : `${base || '0'}.`);
      return;
    }
    setValueText(base + key);
  }

  if (!target) return null;

  const isCartTarget = target.kind === 'cart';
  const resolvedReason = reason === 'Other' ? otherReason.trim() : reason;
  const needsSupervisor = def.alwaysRequiresApproval && requireManualApproval;
  const amountValid = totalDiscount >= 0 && totalDiscount <= eligibleSubtotal + 0.001;
  const idValid = !def.requiresId || (name.trim() !== '' && idNumber.trim() !== '');
  const manualValid = def.code !== 'manual' || (resolvedReason !== '' && (!needsSupervisor || (identifier.trim() !== '' && password !== '')));
  const hasEligibleLines = eligibleLines.length > 0;
  const needsAmountEntry = def.fixedRatePercent === null;
  const canSubmit =
    amountValid && idValid && manualValid && hasEligibleLines && (!needsAmountEntry || valueText.trim() !== '' || totalDiscount === 0);

  const cartHasDiscount = lines.some((l) => l.discount > 0);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!target || !canSubmit) return;

    const applied: DiscountResult = {
      discountType: def.code,
      amounts,
      ...(def.requiresId ? { holderName: name.trim(), holderIdNumber: idNumber.trim() } : null),
    };

    // Only Manual Discount ever touches the network here — every other
    // type is a client-only cart edit. Manual is the one type with no
    // statutory rate or standing policy behind it, so it is the one that
    // gets an audit trail entry (approved, or merely logged) before it
    // lands.
    if (def.code !== 'manual') {
      onApply(applied);
      return;
    }

    const subject = isCartTarget ? `Entire sale (${eligibleLines.length} item${eligibleLines.length === 1 ? '' : 's'})` : target.line.product.name;

    setSubmitting(true);
    setError(null);
    try {
      if (!needsSupervisor) {
        await api.post('/sales/log-item-discount', {
          discount_type: def.code,
          product_name: subject,
          amount: totalDiscount,
          reason: resolvedReason,
        });
        onApply(applied);
        return;
      }

      // suppressUnauthorizedHandler: a 401 here means "that's not a valid
      // SUPERVISOR password", not "the cashier's own session died" —
      // without it the global 401 handler logs the cashier out mid-sale
      // over a mistyped supervisor password. See VoidApprovalDialog.
      await api.post<{ approved_by: string }>(
        '/sales/authorize-item-discount',
        {
          identifier: identifier.trim(),
          password,
          discount_type: def.code,
          product_name: subject,
          amount: totalDiscount,
          reason: resolvedReason,
          store_id: storeId ?? undefined,
        },
        { suppressUnauthorizedHandler: true }
      );
      onApply(applied);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not apply this discount');
      setPassword('');
    } finally {
      setSubmitting(false);
    }
  }

  const scopeLabel = isCartTarget
    ? `${targetLines.length} item${targetLines.length === 1 ? '' : 's'} · ${formatMoney(
        round2(targetLines.reduce((sum, l) => sum + lineSubtotal(l), 0))
      )}`
    : `${target.line.product.name} · ${formatQuantity(
        target.line.quantity,
        target.line.unit?.abbreviation ?? null,
        target.line.unit?.decimal_places ?? 0
      )} × ${formatMoney(target.line.unitPrice)}`;

  const notes = typeNotes(def);

  return (
    <Dialog
      open
      onClose={submitting ? undefined : onClose}
      // Wide enough to lay the picker (and the keypad step) out in two
      // columns rather than one tall scrolling stack — on a short screen
      // a single column put the keypad's bottom row below the fold, which
      // is the one row a cashier reaches for constantly. Narrow again for
      // the steps that are genuinely short, so a two-field screen isn't
      // stretched across 900px of nothing.
      maxWidth={step === 'select' || needsAmountEntry ? 'md' : 'sm'}
      fullWidth
      transitionDuration={{ enter: 195, exit: 0 }}
      sx={{ ...(IS_TOUCH && { '& .MuiDialog-container': { alignItems: 'flex-start', pt: { xs: 2, sm: 4 } } }) }}
      slotProps={{
        paper: {
          sx: {
            // Divided by --pos-zoom, not a bare dvh. The POS scales itself
            // with CSS `zoom` (usePosZoom), and viewport units resolve
            // BEFORE that scaling — so a plain 94dvh here rendered at
            // 94% × zoom of the actual screen, capping the dialog around
            // two thirds of the display at the 0.75 zoom floor and
            // clipping the list while leaving visible dead space beneath
            // it. PosScreen's own root and Cart's scroll maths already
            // compensate the same way; this dialog was simply missed.
            maxHeight: 'calc(94dvh / var(--pos-zoom, 1))',
            // Default paper margin is 32px a side; halving it hands ~32px
            // back to the content on a short screen.
            m: 2,
          },
        },
      }}
    >
      {step === 'select' ? (
        <>
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, py: 1.5 }}>
            <Box sx={{ minWidth: 0 }}>
              <Typography component="span" sx={{ fontWeight: 700, fontSize: 18 }}>
                Select Discount
              </Typography>
              <Typography variant="body2" color="text.secondary" noWrap title={scopeLabel}>
                {scopeLabel}
              </Typography>
            </Box>
            <IconButton onClick={onClose} aria-label="Close" sx={{ flexShrink: 0 }}>
              <CloseIcon />
            </IconButton>
          </DialogTitle>

          <DialogContent dividers sx={{ p: 1.5 }}>
            {/* Two columns on anything wider than a phone: nine rows plus
                their headers is taller than a short till screen, and the
                whole point of this step is seeing every option at once
                rather than scrolling to discover them. See
                CATEGORY_COLUMNS for why the split falls where it does. */}
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={{ xs: 1.5, md: 2 }} sx={{ alignItems: 'flex-start' }}>
              {CATEGORY_COLUMNS.map((columnCategories, columnIndex) => (
                <Stack key={columnIndex} spacing={1.5} sx={{ flex: 1, minWidth: 0, width: '100%' }}>
                  {columnCategories.map((category) => (
                <Box key={category}>
                  <Typography
                    variant="caption"
                    sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 0.75, px: 0.5 }}
                  >
                    {CATEGORY_LABELS[category]}
                  </Typography>

                  <Stack spacing={1}>
                    {DISCOUNT_TYPES.filter((d) => d.category === category).map((d) => {
                      const face = TYPE_FACE[d.code];
                      return (
                        <ButtonBase
                          key={d.code}
                          onClick={() => {
                            setSelected(d.code);
                            setStep('details');
                          }}
                          sx={{
                            width: '100%',
                            justifyContent: 'flex-start',
                            textAlign: 'left',
                            gap: 1.5,
                            px: 1.5,
                            py: 1.25,
                            borderRadius: 2,
                            border: '1px solid',
                            borderColor: 'divider',
                            transition: 'border-color 0.12s ease, background-color 0.12s ease',
                            '&:hover': { borderColor: POS_ACCENT, bgcolor: `${POS_ACCENT}0a` },
                          }}
                        >
                          <Avatar sx={{ width: 40, height: 40, bgcolor: `${face.color}1f`, color: face.color, flexShrink: 0 }}>
                            {face.icon}
                          </Avatar>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
                              {d.label}
                              {d.fixedRatePercent !== null && (
                                <Typography component="span" variant="caption" sx={{ color: face.color, fontWeight: 700, ml: 0.75 }}>
                                  {d.fixedRatePercent}%
                                </Typography>
                              )}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.35 }}>
                              {d.helperText}
                            </Typography>
                          </Box>
                          <ChevronRightIcon fontSize="small" sx={{ color: 'text.disabled', flexShrink: 0 }} />
                        </ButtonBase>
                      );
                    })}
                  </Stack>
                </Box>
                  ))}
                </Stack>
              ))}
            </Stack>
          </DialogContent>

          <DialogActions sx={{ px: 2, py: 1.5, justifyContent: 'space-between' }}>
            {isCartTarget && cartHasDiscount ? (
              <Button onClick={onRemoveAll} color="inherit" sx={{ minHeight: 44 }}>
                Remove discounts
              </Button>
            ) : (
              <Box />
            )}
            <Button onClick={onClose} variant="outlined" color="inherit" sx={{ minHeight: 44, px: 3, borderColor: 'divider' }}>
              Cancel
            </Button>
          </DialogActions>
        </>
      ) : (
        <>
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1.5 }}>
            <IconButton onClick={() => setStep('select')} disabled={submitting} aria-label="Back to discount list" sx={{ flexShrink: 0 }}>
              <ArrowBackIosNewIcon fontSize="small" />
            </IconButton>
            <Avatar sx={{ width: 40, height: 40, bgcolor: `${TYPE_FACE[def.code].color}1f`, color: TYPE_FACE[def.code].color, flexShrink: 0 }}>
              {TYPE_FACE[def.code].icon}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography component="span" sx={{ fontWeight: 700, fontSize: 17 }}>
                {def.label}
              </Typography>
              <Typography variant="body2" color="text.secondary" noWrap>
                {def.requiresId ? 'Enter customer information' : needsAmountEntry ? 'Enter discount amount' : 'Confirm discount'}
              </Typography>
            </Box>
            <IconButton onClick={onClose} disabled={submitting} aria-label="Close" sx={{ flexShrink: 0 }}>
              <CloseIcon />
            </IconButton>
          </DialogTitle>

          <DialogContent dividers sx={{ p: 2 }}>
            {/* Side by side once a keypad is on screen: stacked, the
                amount field, quick percents, four keypad rows and the
                notes ran past the bottom of a short till screen and put
                the keypad's own last row behind a scroll. The keypad
                column keeps its natural height; everything else the type
                needs sits beside it. */}
            <Stack
              component="form"
              id="discount-form"
              onSubmit={submit}
              direction={{ xs: 'column', md: needsAmountEntry ? 'row' : 'column' }}
              spacing={{ xs: 1.75, md: needsAmountEntry ? 2 : 1.75 }}
              sx={{ alignItems: 'stretch' }}
            >
              <Stack spacing={1.75} sx={{ flex: 1, minWidth: 0 }}>
              {def.requiresId && (
                <>
                  <TextField
                    label="Customer name"
                    size="small"
                    fullWidth
                    required
                    autoFocus={!IS_TOUCH}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <PersonOutlineIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                          </InputAdornment>
                        ),
                      },
                    }}
                  />
                  <TextField
                    label={def.code === 'pwd' ? 'PWD ID No.' : 'SC ID No.'}
                    size="small"
                    fullWidth
                    required
                    value={idNumber}
                    onChange={(e) => setIdNumber(e.target.value)}
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <BadgeOutlinedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                          </InputAdornment>
                        ),
                      },
                    }}
                  />
                </>
              )}

              {needsAmountEntry && (
                <>
                  <Stack direction="row" spacing={1.25} sx={{ alignItems: 'stretch' }}>
                    <ToggleButtonGroup
                      value={mode}
                      exclusive
                      onChange={(_e, v) => v && setMode(v)}
                      sx={{ flexShrink: 0, '& .MuiToggleButton-root': { minWidth: 52, fontSize: 18, fontWeight: 700 } }}
                    >
                      <ToggleButton value="percent" aria-label="Discount by percentage">
                        %
                      </ToggleButton>
                      <ToggleButton value="fixed" aria-label="Discount by peso amount">
                        ₱
                      </ToggleButton>
                    </ToggleButtonGroup>

                    {/* On touch deliberately not typable — the keypad below
                        is the input method, so no OS keyboard slides up
                        over the dialog. Desktop keeps a normal field. */}
                    <Box
                      component="input"
                      type="number"
                      min="0"
                      step="any"
                      inputMode={IS_TOUCH ? 'none' : 'decimal'}
                      readOnly={IS_TOUCH}
                      autoFocus={!IS_TOUCH}
                      aria-label={mode === 'percent' ? 'Percent off' : 'Amount off'}
                      value={valueText}
                      onChange={(e) => {
                        autoFilledRef.current = false;
                        setValueText(e.target.value);
                      }}
                      placeholder="0"
                      sx={(t) => ({
                        flex: 1,
                        minWidth: 0,
                        px: 1.5,
                        textAlign: 'right',
                        fontSize: 30,
                        fontWeight: 700,
                        fontVariantNumeric: 'tabular-nums',
                        fontFamily: 'inherit',
                        color: 'inherit',
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: !amountValid && valueText.trim() !== '' ? t.palette.error.main : t.palette.divider,
                        outline: 'none',
                        background: 'transparent',
                        '&:focus': { borderColor: POS_ACCENT },
                        MozAppearance: 'textfield',
                        '&::-webkit-inner-spin-button, &::-webkit-outer-spin-button': { WebkitAppearance: 'none', margin: 0 },
                      })}
                    />
                  </Stack>

                  {mode === 'fixed' && isCartTarget && eligibleLines.length > 1 && (
                    <Typography variant="caption" color="text.secondary">
                      Split across the {eligibleLines.length} qualifying items in proportion to each one's amount.
                    </Typography>
                  )}

                  {mode === 'percent' && !needsSupervisor && (
                    <Stack direction="row" spacing={0.75}>
                      {QUICK_PERCENTS.map((p) => (
                        <Button
                          key={p}
                          onClick={() => {
                            autoFilledRef.current = false;
                            setValueText(String(p));
                          }}
                          variant={parseFloat(valueText) === p ? 'contained' : 'outlined'}
                          disableElevation
                          sx={{
                            flex: 1,
                            minHeight: 38,
                            fontWeight: 700,
                            ...(parseFloat(valueText) === p
                              ? { bgcolor: POS_ACCENT, '&:hover': { bgcolor: POS_ACCENT } }
                              : { borderColor: 'divider', color: 'text.primary' }),
                          }}
                        >
                          {p}%
                        </Button>
                      ))}
                    </Stack>
                  )}

                  <Stack spacing={0.75}>
                    {KEYPAD_ROWS.map((row) => (
                      <Stack key={row.join('')} direction="row" spacing={0.75}>
                        {row.map((key) => (
                          <Button
                            key={key}
                            onClick={() => pressKey(key)}
                            variant="outlined"
                            color="inherit"
                            aria-label={key === BACKSPACE ? 'Backspace' : key}
                            sx={{
                              flex: 1,
                              minHeight: needsSupervisor ? 44 : 50,
                              fontSize: 19,
                              fontWeight: 700,
                              borderColor: 'divider',
                              color: 'text.primary',
                            }}
                          >
                            {key}
                          </Button>
                        ))}
                      </Stack>
                    ))}
                  </Stack>
                </>
              )}
              </Stack>

              {/* Second column beside the keypad, or simply the rest of
                  the stack on the types that don't have one. */}
              <Stack spacing={1.75} sx={{ width: { xs: '100%', md: needsAmountEntry ? 340 : '100%' }, flexShrink: 0 }}>
              {def.code === 'manual' && (
                <>
                  <TextField select label="Reason" size="small" value={reason} onChange={(e) => setReason(e.target.value)} fullWidth required>
                    {MANUAL_REASONS.map((r) => (
                      <MenuItem key={r} value={r}>
                        {r}
                      </MenuItem>
                    ))}
                  </TextField>

                  {reason === 'Other' && (
                    <TextField
                      label="Specify reason"
                      size="small"
                      value={otherReason}
                      onChange={(e) => setOtherReason(e.target.value)}
                      fullWidth
                      required
                      slotProps={{ htmlInput: { maxLength: 255 } }}
                    />
                  )}

                  {needsSupervisor && (
                    <>
                      <TextField
                        label="Supervisor username"
                        size="small"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        fullWidth
                        required
                        autoComplete="off"
                        slotProps={{
                          input: {
                            startAdornment: (
                              <InputAdornment position="start">
                                <PersonOutlineIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                              </InputAdornment>
                            ),
                          },
                        }}
                      />
                      <TextField
                        label="Supervisor password"
                        type="password"
                        size="small"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        fullWidth
                        required
                        autoComplete="new-password"
                        slotProps={{
                          input: {
                            startAdornment: (
                              <InputAdornment position="start">
                                <LockOutlinedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                              </InputAdornment>
                            ),
                          },
                        }}
                      />
                    </>
                  )}
                </>
              )}

              {/* What this type means, and — the part only the POS can
                  answer — which of the items in front of the cashier it
                  actually reaches. */}
              <Alert severity={hasEligibleLines ? 'info' : 'warning'} icon={false} sx={{ py: 1 }}>
                <Stack spacing={0.5}>
                  {notes.map((note) => (
                    <Typography key={note} variant="caption" sx={{ display: 'block' }}>
                      • {note}
                    </Typography>
                  ))}
                  <Typography variant="caption" sx={{ display: 'block', fontWeight: 700 }}>
                    •{' '}
                    {hasEligibleLines
                      ? `Applies to ${eligibleLines.length} of ${targetLines.length} item${targetLines.length === 1 ? '' : 's'}`
                      : 'No items in this sale qualify'}
                    {skippedLines.length > 0 &&
                      ` — not eligible: ${skippedLines
                        .slice(0, 3)
                        .map((l) => l.product.name)
                        .join(', ')}${skippedLines.length > 3 ? ` +${skippedLines.length - 3} more` : ''}`}
                  </Typography>
                </Stack>
              </Alert>

              {!amountValid && valueText.trim() !== '' && (
                <Alert severity="error" sx={{ py: 0 }}>
                  Discount must be between 0 and {formatMoney(eligibleSubtotal)}
                </Alert>
              )}

              {error && <Alert severity="error">{error}</Alert>}
              </Stack>
            </Stack>
          </DialogContent>

          <DialogActions sx={{ px: 2, py: 1.5, gap: 1, justifyContent: 'space-between' }}>
            <Chip
              label={`Total −${formatMoney(totalDiscount)}`}
              sx={{ fontWeight: 700, fontSize: 14, height: 34, bgcolor: `${POS_ACCENT}14`, color: POS_ACCENT }}
            />
            <Stack direction="row" spacing={1}>
              <Button onClick={onClose} disabled={submitting} variant="outlined" color="inherit" sx={{ minHeight: 44, borderColor: 'divider' }}>
                Cancel
              </Button>
              <Button
                type="submit"
                form="discount-form"
                variant="contained"
                disableElevation
                disabled={submitting || !canSubmit}
                sx={{ minHeight: 44, px: 3, bgcolor: POS_ACCENT, '&:hover': { bgcolor: POS_ACCENT } }}
              >
                {submitting ? <CircularProgress size={20} color="inherit" /> : 'Apply Discount'}
              </Button>
            </Stack>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}
