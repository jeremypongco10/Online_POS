import { useEffect, useState, type FormEvent } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AssignmentReturnOutlinedIcon from '@mui/icons-material/AssignmentReturnOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutlineOutlined';
import SearchOffOutlinedIcon from '@mui/icons-material/SearchOffOutlined';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import { api, ApiError } from '../api/client';
import type { PaymentMethodOption, Receipt, ReturnableItem, SaleResponse, SalesReturn } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { formatDateTime } from '../regional';
import { formatMoney, posRaisedButtonSx } from './format';

interface FoundSale extends SaleResponse {
  sale_date: string;
  store_id: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  /** The cashier's open drawer — a cash refund comes out of it. */
  cashSessionId: number | null;
  /** This register's branch; a sale from another branch is returned there. */
  storeId: number | null;
  paymentMethods: PaymentMethodOption[];
  /** A return settled as a replacement: its credit goes onto the current sale. */
  onExchangeCredit: (credit: ExchangeCredit) => void;
  /** The credit already on the current sale, if any — only one per sale. */
  activeCredit: ExchangeCredit | null;
}

/** An unspent exchange credit, as the POS carries it on a sale. */
export interface ExchangeCredit {
  id: number;
  return_number: string;
  amount: number;
}

interface OpenCredit {
  id: number;
  return_number: string;
  total_refund: string;
  return_date: string;
  invoice_number: string | null;
}

type Step = 'find' | 'items' | 'done';

/** Preset so the Returns history groups cleanly, same idea as VoidApprovalDialog's reasons. */
const REASONS = ['Damaged / defective', 'Expired', 'Wrong item', 'Customer changed mind', 'Overcharged', 'Other'];

const num = (v: string | number | null | undefined) => {
  const n = typeof v === 'number' ? v : parseFloat(v ?? '');
  return Number.isFinite(n) ? n : 0;
};
const qtyText = (n: number) => (Number.isInteger(n) ? String(n) : String(Math.round(n * 1000) / 1000));

/**
 * The register's Return (F8): find the sale by invoice number, pick what's
 * coming back, and have a supervisor sign off on the spot with their own
 * credentials. The backend (POST /returns/pos) re-checks everything — the
 * approver's returns.approve, their branch, the quantities still
 * returnable — then refunds and restocks in one go, so there's no pending
 * return left for anyone to approve later. A cash refund is taken out of
 * this cashier's drawer, so their count at closing still balances.
 */
export function ReturnDialog({ open, onClose, cashSessionId, storeId, paymentMethods, onExchangeCredit, activeCredit }: Props) {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('find');

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoundSale[]>([]);
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [loadingId, setLoadingId] = useState<number | null>(null);

  const [sale, setSale] = useState<FoundSale | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [items, setItems] = useState<ReturnableItem[]>([]);
  const [qty, setQty] = useState<Record<number, string>>({});
  const [reason, setReason] = useState(REASONS[0]);
  const [otherReason, setOtherReason] = useState('');
  const [refundMethod, setRefundMethod] = useState('cash');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState<SalesReturn | null>(null);
  /** Refund the money, or replace the items (an exchange credit for the next sale). */
  const [settle, setSettle] = useState<'refund' | 'replace'>('refund');
  // Settings → Security: whether a supervisor must sign off. Assume yes until known.
  const [approvalRequired, setApprovalRequired] = useState(true);
  const [credits, setCredits] = useState<OpenCredit[]>([]);
  const [creditBusy, setCreditBusy] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    api
      .get<{ require_return_approval?: boolean }>('/sales/void-policy')
      .then((p) => setApprovalRequired(p.require_return_approval !== false))
      .catch(() => setApprovalRequired(true));
    if (storeId) {
      api
        .get<OpenCredit[]>(`/returns/open-credits?store_id=${storeId}`)
        .then(setCredits)
        .catch(() => setCredits([]));
    }
  }, [open, storeId]);

  async function refundCredit(c: OpenCredit) {
    if (!cashSessionId) return;
    setCreditBusy(c.id);
    setError(null);
    try {
      await api.post(`/returns/${c.id}/refund-credit`, { cash_session_id: cashSessionId, refund_method: 'cash' });
      setCredits((list) => list.filter((x) => x.id !== c.id));
      setCompleted({ ...(c as unknown as SalesReturn), total_refund: c.total_refund, refund_method: 'cash', approved_by_name: null });
      setStep('done');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not refund that credit');
    } finally {
      setCreditBusy(null);
    }
  }

  function applyCredit(c: OpenCredit) {
    onExchangeCredit({ id: c.id, return_number: c.return_number, amount: num(c.total_refund) });
    close();
  }

  function reset() {
    setStep('find');
    setQuery('');
    setResults([]);
    setSearched(false);
    setSale(null);
    setReceipt(null);
    setItems([]);
    setQty({});
    setReason(REASONS[0]);
    setOtherReason('');
    setRefundMethod('cash');
    setIdentifier('');
    setPassword('');
    setError(null);
    setCompleted(null);
    setSettle('refund');
  }

  function close() {
    if (submitting) return;
    reset();
    onClose();
  }

  async function search() {
    const trimmed = query.trim();
    if (!trimmed || searching) return;
    setSearching(true);
    setError(null);
    try {
      setResults(await api.get<FoundSale[]>(`/sales?q=${encodeURIComponent(trimmed)}&status=completed&per_page=15`));
      setSearched(true);
    } catch {
      setError('Sale lookup failed');
    } finally {
      setSearching(false);
    }
  }

  async function pick(found: FoundSale) {
    if (loadingId !== null) return;
    if (storeId !== null && Number(found.store_id) !== storeId) {
      setError(`${found.invoice_number} was sold at another branch. Return it at that branch.`);
      return;
    }
    setLoadingId(found.id);
    setError(null);
    try {
      const [eligible, rec] = await Promise.all([
        api.get<ReturnableItem[]>(`/returns/eligible-items?sale_id=${found.id}`),
        api.get<Receipt>(`/sales/${found.id}/receipt`),
      ]);
      setSale(found);
      setReceipt(rec);
      setItems(eligible);
      setQty({});
      // Default the refund to how the customer paid when that was one
      // method only — cash otherwise, the one every drawer can hand out.
      const methods = [...new Set(rec.payments.map((p) => p.method.toLowerCase()))];
      setRefundMethod(methods.length === 1 ? methods[0] : 'cash');
      setStep('items');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load that sale');
    } finally {
      setLoadingId(null);
    }
  }

  const lines = items
    .map((item) => ({ item, qty: Math.min(num(qty[item.id]), item.remaining_quantity) }))
    .filter((l) => l.qty > 0);
  const refundTotal = lines.reduce((sum, l) => sum + Math.round(l.qty * num(l.item.unit_price) * 100) / 100, 0);
  const overLimit = items.some((item) => num(qty[item.id]) > item.remaining_quantity + 0.0001);
  const resolvedReason = reason === 'Other' ? otherReason.trim() : reason;
  const returnable = items.filter((i) => i.remaining_quantity > 0);

  const paidMethods = receipt ? [...new Set(receipt.payments.map((p) => p.method.toLowerCase()))] : [];
  const refundOptions = ['cash', ...paidMethods.filter((m) => m !== 'cash')];
  const methodName = (code: string) => paymentMethods.find((m) => m.code.toLowerCase() === code)?.name ?? (code === 'cash' ? 'Cash' : code === 'exchange' ? 'Exchange credit' : code.toUpperCase());

  const needsSupervisor = approvalRequired;
  const canSubmit =
    lines.length > 0 &&
    !overLimit &&
    resolvedReason !== '' &&
    (!needsSupervisor || (identifier.trim() !== '' && password !== '')) &&
    cashSessionId !== null &&
    !(settle === 'replace' && activeCredit !== null) &&
    !submitting;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!sale || !canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      // suppressUnauthorizedHandler: a 401 here means the SUPERVISOR's
      // password was wrong, not that the cashier's session expired — see
      // VoidApprovalDialog for the same guard.
      const result = await api.post<SalesReturn>(
        '/returns/pos',
        {
          sale_id: sale.id,
          cash_session_id: cashSessionId,
          refund_method: settle === 'replace' ? 'exchange' : refundMethod,
          reason: resolvedReason,
          items: lines.map((l) => ({ sale_item_id: l.item.id, quantity: l.qty })),
          ...(identifier.trim() && password ? { supervisor_identifier: identifier.trim(), supervisor_password: password } : {}),
        },
        { suppressUnauthorizedHandler: true }
      );
      setCompleted(result);
      setPassword('');
      setIdentifier('');
      setStep('done');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not complete the return');
      setPassword('');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={close}
      maxWidth="sm"
      fullWidth
      slotProps={{ transition: { onEntered: () => document.getElementById('return-invoice-input')?.focus() } }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          {step === 'items' && (
            <IconButton size="small" onClick={() => { setStep('find'); setError(null); }} disabled={submitting} aria-label="Back to search">
              <ArrowBackIcon fontSize="small" />
            </IconButton>
          )}
          <AssignmentReturnOutlinedIcon fontSize="small" color="primary" />
          <span>{step === 'items' && sale ? `Return from ${sale.invoice_number}` : 'Return / Refund'}</span>
        </Stack>
        <IconButton size="small" onClick={close} disabled={submitting} aria-label="Close">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        {cashSessionId === null && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Open your POS terminal before doing a return.
          </Alert>
        )}

        {/* ── 1. Find the sale ─────────────────────────────────────── */}
        {step === 'find' && (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              Look up the sale by the invoice number on the customer's receipt.
            </Typography>
            <Stack direction="row" spacing={1}>
              <TextField
                id="return-invoice-input"
                label="Invoice number"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && search()}
                fullWidth
                size="small"
              />
              <Button
                variant="contained"
                onClick={search}
                disabled={searching || !query.trim()}
                sx={(theme) => posRaisedButtonSx(theme.palette.primary.main)}
              >
                {searching ? <CircularProgress size={18} thickness={5} sx={{ color: 'inherit' }} /> : 'Search'}
              </Button>
            </Stack>

            {error && <Alert severity="error" sx={{ mt: 1.5 }}>{error}</Alert>}

            {/* Credits from replacements that never went through — so one is never lost. */}
            {credits.length > 0 && (
              <Box sx={{ mt: 2, p: 1.5, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.25 }}>
                  Unused exchange credits
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                  Replacements that were never rung up. Use one on this sale, or refund it in cash.
                </Typography>
                <Stack spacing={0.75}>
                  {credits.map((c) => (
                    <Stack key={c.id} direction="row" spacing={1} sx={{ alignItems: 'center', p: 1, borderRadius: 1.5, bgcolor: 'action.hover' }}>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {formatMoney(num(c.total_refund))} · {c.return_number}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          From {c.invoice_number ?? 'a sale'} · {formatDateTime(c.return_date, user?.currency)}
                        </Typography>
                      </Box>
                      <Button size="small" disabled={!!activeCredit || creditBusy !== null} onClick={() => applyCredit(c)}>
                        Use on this sale
                      </Button>
                      <Button size="small" color="inherit" disabled={creditBusy !== null || cashSessionId === null} onClick={() => refundCredit(c)}>
                        {creditBusy === c.id ? 'Refunding…' : 'Refund cash'}
                      </Button>
                    </Stack>
                  ))}
                </Stack>
              </Box>
            )}

            {searched &&
              (results.length === 0 ? (
                <Stack sx={{ alignItems: 'center', textAlign: 'center', py: 4, color: 'text.secondary' }}>
                  <SearchOffOutlinedIcon sx={{ fontSize: 36, opacity: 0.4, mb: 1 }} />
                  <Typography variant="body2">No completed sale matches "{query.trim()}"</Typography>
                </Stack>
              ) : (
                <List disablePadding sx={{ mt: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
                  {results.map((found, i) => (
                    <ListItemButton key={found.id} divider={i < results.length - 1} disabled={loadingId !== null} onClick={() => pick(found)} sx={{ py: 1 }}>
                      <ListItemText
                        primary={found.invoice_number}
                        secondary={formatDateTime(found.sale_date, user?.currency)}
                        slotProps={{ primary: { sx: { fontWeight: 600 } }, secondary: { variant: 'caption' } }}
                      />
                      {loadingId === found.id ? (
                        <CircularProgress size={16} thickness={5} />
                      ) : (
                        <Typography variant="body2" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                          {formatMoney(num(found.total))}
                        </Typography>
                      )}
                    </ListItemButton>
                  ))}
                </List>
              ))}
          </>
        )}

        {/* ── 2. Items, reason, refund, supervisor ─────────────────── */}
        {step === 'items' && sale && receipt && (
          <Stack component="form" spacing={2} onSubmit={submit}>
            <Typography variant="body2" color="text.secondary">
              {formatDateTime(receipt.date, user?.currency)}
              {receipt.cashier ? ` · Sold by ${receipt.cashier}` : ''}
              {receipt.customer ? ` · ${receipt.customer}` : ''} · Total {formatMoney(num(sale.total))}
            </Typography>

            {returnable.length === 0 ? (
              <Alert severity="info">Everything on this sale has already been returned.</Alert>
            ) : (
              <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
                {items.map((item, i) => {
                  const left = item.remaining_quantity;
                  const value = qty[item.id] ?? '';
                  const tooMany = num(value) > left + 0.0001;
                  return (
                    <Stack
                      key={item.id}
                      direction="row"
                      spacing={1.5}
                      sx={{
                        alignItems: 'center',
                        px: 1.5,
                        py: 1.25,
                        borderTop: i === 0 ? 0 : '1px solid',
                        borderColor: 'divider',
                        opacity: left > 0 ? 1 : 0.5,
                      }}
                    >
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap title={item.product_name}>
                          {item.product_name ?? `Item #${item.product_id}`}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatMoney(num(item.unit_price))} each · bought {qtyText(num(item.quantity))}
                          {item.returned_quantity > 0 ? ` · ${qtyText(item.returned_quantity)} already returned` : ''}
                        </Typography>
                      </Box>
                      {left > 0 ? (
                        <>
                          <Button size="small" onClick={() => setQty({ ...qty, [item.id]: qtyText(left) })} sx={{ minWidth: 0 }}>
                            All {qtyText(left)}
                          </Button>
                          <TextField
                            size="small"
                            type="number"
                            placeholder="0"
                            value={value}
                            onChange={(e) => setQty({ ...qty, [item.id]: e.target.value })}
                            error={tooMany}
                            slotProps={{ htmlInput: { min: 0, max: left, step: 'any', 'aria-label': `Quantity of ${item.product_name ?? 'item'} to return` } }}
                            sx={{ width: 84 }}
                          />
                        </>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          Returned
                        </Typography>
                      )}
                    </Stack>
                  );
                })}
              </Box>
            )}

            {overLimit && <Alert severity="warning">A quantity is more than what's left to return on that line.</Alert>}

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField select label="Reason" size="small" value={reason} onChange={(e) => setReason(e.target.value)} fullWidth required>
                {REASONS.map((r) => (
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
                  autoFocus
                  slotProps={{ htmlInput: { maxLength: 200 } }}
                />
              )}
            </Stack>

            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.75 }}>
                What does the customer want?
              </Typography>
              <ToggleButtonGroup
                exclusive
                fullWidth
                size="small"
                value={settle}
                onChange={(_, v: 'refund' | 'replace' | null) => v && setSettle(v)}
                sx={{ '& .MuiToggleButton-root': { textTransform: 'none', fontWeight: 600, gap: 0.75, py: 1 } }}
              >
                <ToggleButton value="refund">
                  <PaymentsOutlinedIcon fontSize="small" /> Refund the money
                </ToggleButton>
                <ToggleButton value="replace">
                  <SwapHorizIcon fontSize="small" /> Replace with other items
                </ToggleButton>
              </ToggleButtonGroup>
              {settle === 'replace' && (
                <Alert severity={activeCredit ? 'warning' : 'info'} sx={{ mt: 1 }}>
                  {activeCredit
                    ? `This sale already has an exchange credit (${activeCredit.return_number}). Finish that sale first.`
                    : 'The amount becomes a credit on the current sale. Scan the replacement items — the customer pays any difference, or gets the rest back as change.'}
                </Alert>
              )}
            </Box>

            {settle === 'refund' && (
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.75 }}>
                Refund by
              </Typography>
              <ToggleButtonGroup
                exclusive
                size="small"
                value={refundMethod}
                onChange={(_, v: string | null) => v && setRefundMethod(v)}
                sx={{ flexWrap: 'wrap', '& .MuiToggleButton-root': { textTransform: 'none', fontWeight: 600, px: 2 } }}
              >
                {refundOptions.map((code) => (
                  <ToggleButton key={code} value={code}>
                    {methodName(code)}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
                {refundMethod === 'cash'
                  ? 'Comes out of your drawer. Your expected cash at closing goes down by the same amount.'
                  : `Send it back by ${methodName(refundMethod)}. Your drawer isn't affected.`}
              </Typography>
            </Box>
            )}

            <Divider />

            <Stack direction="row" sx={{ alignItems: 'baseline', justifyContent: 'space-between' }}>
              <Typography sx={{ fontWeight: 700 }}>{settle === 'replace' ? 'Exchange credit' : 'Refund'}</Typography>
              <Typography sx={{ fontWeight: 800, fontSize: 22, fontVariantNumeric: 'tabular-nums' }}>{formatMoney(refundTotal)}</Typography>
            </Stack>

            {!needsSupervisor ? (
              <Typography variant="caption" color="text.secondary">
                Supervisor approval is off for returns (Settings → Security). This is recorded under your name.
              </Typography>
            ) : (
            <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'action.hover' }}>
              <Typography variant="body2" sx={{ fontWeight: 700, mb: 1.25 }}>
                Supervisor approval
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
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
              </Stack>
            </Box>
            )}

            {error && <Alert severity="error">{error}</Alert>}

            <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
              <Button onClick={close} disabled={submitting} color="inherit">
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                disableElevation
                disabled={!canSubmit}
                sx={(theme) => ({ ...posRaisedButtonSx(theme.palette.primary.main), minWidth: 160 })}
              >
                {submitting ? <CircularProgress size={20} color="inherit" /> : settle === 'replace' ? `Give ${formatMoney(refundTotal)} credit` : `Refund ${formatMoney(refundTotal)}`}
              </Button>
            </Stack>
          </Stack>
        )}

        {/* ── 3. Done ───────────────────────────────────────────────── */}
        {step === 'done' && completed && (
          <Stack spacing={2} sx={{ alignItems: 'center', textAlign: 'center', py: 2 }}>
            <CheckCircleOutlinedIcon color="success" sx={{ fontSize: 56 }} />
            <Box>
              <Typography sx={{ fontWeight: 800, fontSize: 20 }}>{completed.refund_method === 'exchange' ? 'Exchange credit ready' : 'Return completed'}</Typography>
              <Typography variant="body2" color="text.secondary">
                {completed.return_number}
                {completed.approved_by_name ? ` · Approved by ${completed.approved_by_name}` : ''}
              </Typography>
            </Box>
            <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'action.hover', width: '100%' }}>
              <Typography variant="body2" color="text.secondary">
                {completed.refund_method === 'exchange'
                  ? 'Credit toward the replacement items'
                  : completed.refund_method === 'cash'
                    ? 'Give the customer'
                    : `Refund by ${methodName(completed.refund_method ?? 'cash')}`}
              </Typography>
              <Typography sx={{ fontWeight: 800, fontSize: 30, fontVariantNumeric: 'tabular-nums' }}>
                {formatMoney(num(completed.total_refund))}
              </Typography>
              {completed.refund_method === 'cash' && (
                <Typography variant="caption" color="text.secondary">
                  from your drawer
                </Typography>
              )}
            </Box>
            {completed.refund_method === 'exchange' && (
              <Typography variant="body2" color="text.secondary">
                It goes onto the current sale. Scan the replacement items, then Pay as usual.
              </Typography>
            )}
            <Button
              variant="contained"
              onClick={() => {
                if (completed.refund_method === 'exchange') {
                  onExchangeCredit({ id: completed.id, return_number: completed.return_number, amount: num(completed.total_refund) });
                }
                close();
              }}
              autoFocus
              sx={(theme) => ({ ...posRaisedButtonSx(theme.palette.primary.main), minWidth: 160 })}
            >
              {completed.refund_method === 'exchange' ? 'Add replacement items' : 'Done'}
            </Button>
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  );
}
