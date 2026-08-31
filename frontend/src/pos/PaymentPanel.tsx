import { useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import CloseIcon from '@mui/icons-material/Close';
import { formatMoney, POS_ACCENT } from './format';
import { SearchableSelect } from '../admin/SearchableSelect';
import type { PaymentMethodOption } from '../api/types';

/** The value actually stored is a payment_methods.code (e.g. 'cash', or whatever an admin's custom method slugified to) — not a fixed set, see the Payment Methods settings tab. */
export type PaymentMethod = string;

export interface Payment {
  method: PaymentMethod;
  amount: number;
  reference?: string;
}

/** Quick-tender shortcuts for cash — the Philippine peso's common bill denominations at or above the total, so a cashier can tap instead of typing for the everyday case. Falls back to round ₱500 steps above the total for larger sales. */
function quickCashAmounts(total: number): number[] {
  const denominations = [20, 50, 100, 200, 500, 1000, 2000];
  const atOrAbove = denominations.filter((d) => d >= total);
  if (atOrAbove.length >= 2) return atOrAbove.slice(0, 4);

  const base = Math.ceil(total / 500) * 500;
  return [base, base + 500, base + 1000];
}

/**
 * Display-name fallback for the six codes this app ships with by default —
 * used only where a fetched PaymentMethodOption list isn't at hand (the
 * Dashboard's payment breakdown, the printed receipt). A company-defined
 * custom method has no entry here; both call sites already fall back to
 * showing the raw code in that case, which is an acceptable, honest gap
 * rather than every peripheral display needing its own live fetch.
 */
export const METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  card: 'Card',
  gcash: 'GCash',
  maya: 'Maya',
  bank_transfer: 'Bank Transfer',
  other: 'Other',
};

interface Props {
  open: boolean;
  onClose: () => void;
  total: number;
  disabled: boolean;
  submitting: boolean;
  checkoutError: string | null;
  methods: PaymentMethodOption[];
  onCheckout: (payments: Payment[]) => void;
}

/**
 * Method/Amount Tendered/Change only exist while actually processing a
 * payment — clicking "Pay" in ReceiptPanel opens this dialog rather than
 * those fields sitting permanently visible in the receipt card. Single
 * Method + Amount Tendered is the default, primary path — Confirm builds a
 * one-item payments[] straight from it, no intermediate "Add Payment" click
 * needed. "+ Add another payment method" switches into the real
 * split-tender flow: the primary row is committed into payments[], and the
 * original multi-row Applied/Remaining UI takes over from there so a sale
 * can still be paid with more than one method at once (e.g. Total ₱1,000 =
 * Cash ₱500 + GCash ₱500).
 */
export function PaymentPanel({ open, onClose, total, disabled, submitting, checkoutError, methods, onCheckout }: Props) {
  const [splitMode, setSplitMode] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  // 'cash' rather than the first fetched option: it's the one code every
  // company is guaranteed to have (see PaymentMethodsController — it can
  // be renamed but never deleted or deactivated), so it's always a safe
  // default even for the brief window before `methods` has loaded.
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [amountText, setAmountText] = useState('');
  const [reference, setReference] = useState('');

  const labelFor = (code: string) => methods.find((m) => m.code === code)?.name ?? METHOD_LABELS[code] ?? code;

  const applied = payments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = Math.max(0, Math.round((total - applied) * 100) / 100);

  // Single-payment path: an empty field means "tender exactly the total" (cash-drawer shorthand every cashier expects).
  const tendered = amountText === '' ? total : parseFloat(amountText) || 0;
  const singleChangeDue = Math.max(0, Math.round((tendered - total) * 100) / 100);
  const splitChangeDue = Math.max(0, Math.round((applied - total) * 100) / 100);

  const canSubmitSingle = !disabled && !submitting && tendered >= total && total > 0;
  const canSubmitSplit = !disabled && !submitting && payments.length > 0 && applied >= total && total > 0;
  const canSubmit = splitMode ? canSubmitSplit : canSubmitSingle;

  function submit() {
    if (!canSubmit) return;
    onCheckout(splitMode ? payments : [{ method, amount: tendered, reference: reference || undefined }]);
  }

  function addPayment() {
    const amount = parseFloat(amountText) || 0;
    if (amount <= 0) return;

    setPayments((prev) => [...prev, { method, amount, reference: reference || undefined }]);
    setAmountText('');
    setReference('');
  }

  function removePayment(index: number) {
    setPayments((prev) => prev.filter((_, i) => i !== index));
  }

  function enterSplitMode() {
    if (tendered > 0) {
      setPayments([{ method, amount: tendered, reference: reference || undefined }]);
    }
    setAmountText('');
    setReference('');
    setSplitMode(true);
  }

  function exitSplitMode() {
    setPayments([]);
    setAmountText('');
    setReference('');
    setSplitMode(false);
  }

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        Payment
        <IconButton size="small" onClick={onClose} disabled={submitting} aria-label="Close">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline', mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Total Due
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 700, color: POS_ACCENT }}>
            {formatMoney(total)}
          </Typography>
        </Stack>

        {checkoutError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {checkoutError}
          </Alert>
        )}

        {!splitMode ? (
          <Stack spacing={1.25}>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Payment Method
              </Typography>
              <SearchableSelect
                value={method}
                onChange={setMethod}
                sx={{ width: 168 }}
                options={methods.map((m) => ({ value: m.code, label: m.name }))}
              />
            </Stack>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Amount Tendered
              </Typography>
              <TextField
                type="number"
                autoFocus
                slotProps={{ htmlInput: { min: 0, step: 0.01, style: { textAlign: 'right' } } }}
                value={amountText}
                onChange={(e) => setAmountText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && canSubmit) submit();
                }}
                placeholder={total.toFixed(2)}
                sx={{ width: 140 }}
              />
            </Stack>
            {method === 'cash' && total > 0 && (
              <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', justifyContent: 'flex-end' }} useFlexGap>
                <Chip
                  label="Exact"
                  size="small"
                  clickable
                  onClick={() => setAmountText(total.toFixed(2))}
                  sx={{ fontWeight: 700, bgcolor: `${POS_ACCENT}1a`, color: POS_ACCENT }}
                />
                {quickCashAmounts(total).map((amt) => (
                  <Chip
                    key={amt}
                    label={formatMoney(amt)}
                    size="small"
                    clickable
                    variant="outlined"
                    onClick={() => setAmountText(String(amt))}
                    sx={{ fontWeight: 700 }}
                  />
                ))}
              </Stack>
            )}
            {method !== 'cash' && (
              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Reference
                </Typography>
                <TextField
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  sx={{ width: 168 }}
                />
              </Stack>
            )}
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Change
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 700, color: singleChangeDue > 0 ? 'success.main' : 'text.primary' }}>
                {formatMoney(singleChangeDue)}
              </Typography>
            </Stack>
            <Button size="small" onClick={enterSplitMode} sx={{ alignSelf: 'flex-start', color: POS_ACCENT, fontWeight: 600 }}>
              + Add another payment method
            </Button>
          </Stack>
        ) : (
          <Stack spacing={1.5}>
            {payments.length > 0 && (
              <Paper variant="outlined" sx={{ borderRadius: 1, overflow: 'hidden' }}>
                <List disablePadding>
                  {payments.map((p, i) => (
                    <ListItem
                      key={i}
                      divider={i < payments.length - 1}
                      secondaryAction={
                        <Tooltip title="Remove">
                          <IconButton size="small" color="error" onClick={() => removePayment(i)} aria-label="Remove">
                            <CloseIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      }
                    >
                      <Stack direction="row" sx={{ justifyContent: 'space-between', width: '100%', pr: 4 }}>
                        <Typography variant="body2">{labelFor(p.method)}</Typography>
                        <Typography variant="body2">{formatMoney(p.amount)}</Typography>
                      </Stack>
                    </ListItem>
                  ))}
                </List>
              </Paper>
            )}

            <SearchableSelect
              label="Method"
              value={method}
              onChange={setMethod}
              fullWidth
              options={methods.map((m) => ({ value: m.code, label: m.name }))}
            />
            <TextField
              label="Amount"
              type="number"
              slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
              value={amountText}
              onChange={(e) => setAmountText(e.target.value)}
              placeholder={remaining.toFixed(2)}
              fullWidth
            />
            {method !== 'cash' && (
              <TextField
                label="Reference"
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                fullWidth
              />
            )}
            <Button variant="outlined" onClick={addPayment} disabled={!amountText} fullWidth sx={{ borderStyle: 'dashed' }}>
              Add Payment
            </Button>

            <Stack>
              <Stack direction="row" sx={{ justifyContent: 'space-between', py: 0.4 }}>
                <Typography variant="body2">Amount Applied</Typography>
                <Typography variant="body2">{formatMoney(applied)}</Typography>
              </Stack>
              <Stack direction="row" sx={{ justifyContent: 'space-between', py: 0.4 }}>
                <Typography variant="body2">Remaining</Typography>
                <Typography variant="body2">{formatMoney(remaining)}</Typography>
              </Stack>
              <Divider sx={{ my: 1 }} />
              <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  Change Due
                </Typography>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {formatMoney(splitChangeDue)}
                </Typography>
              </Stack>
            </Stack>

            <Button size="small" onClick={exitSplitMode} sx={{ alignSelf: 'flex-start', color: POS_ACCENT, fontWeight: 600 }}>
              ← Use a single payment
            </Button>
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button
          variant="contained"
          disabled={!canSubmit}
          onClick={submit}
          sx={{ bgcolor: POS_ACCENT, '&:hover': { bgcolor: POS_ACCENT }, borderRadius: 999, px: 3 }}
        >
          {submitting ? 'Processing…' : 'Confirm Payment'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
