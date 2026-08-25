import { useState } from 'react';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import CloseIcon from '@mui/icons-material/Close';
import { formatMoney } from './format';
import { SearchableSelect } from '../admin/SearchableSelect';

export type PaymentMethod = 'cash' | 'card' | 'gcash' | 'maya' | 'bank_transfer' | 'other';

export interface Payment {
  method: PaymentMethod;
  amount: number;
  reference?: string;
}

export const METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Cash',
  card: 'Card',
  gcash: 'GCash',
  maya: 'Maya',
  bank_transfer: 'Bank Transfer',
  other: 'Other',
};

interface Props {
  total: number;
  disabled: boolean;
  submitting: boolean;
  onCheckout: (payments: Payment[]) => void;
}

/**
 * Split-tender: a sale can be paid with more than one method at once
 * (e.g. Total ₱1,000 = Cash ₱500 + GCash ₱500). Each add appends a row;
 * checkout only enables once the rows sum to at least the total.
 */
export function PaymentPanel({ total, disabled, submitting, onCheckout }: Props) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [amountText, setAmountText] = useState('');
  const [reference, setReference] = useState('');

  const applied = payments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = Math.max(0, Math.round((total - applied) * 100) / 100);
  const changeDue = Math.max(0, Math.round((applied - total) * 100) / 100);
  const canSubmit = !disabled && !submitting && payments.length > 0 && applied >= total && total > 0;

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

  return (
    <Paper variant="outlined" sx={{ p: 2.25, borderRadius: 1.5 }}>
      <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: '0.06em' }}>
        Payment
      </Typography>

      {payments.length > 0 && (
        <Paper variant="outlined" sx={{ mt: 1.25, mb: 1.5, borderRadius: 1, overflow: 'hidden' }}>
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
                  <Typography variant="body2">{METHOD_LABELS[p.method]}</Typography>
                  <Typography variant="body2">{formatMoney(p.amount)}</Typography>
                </Stack>
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      <Stack spacing={1.5} sx={{ mt: payments.length > 0 ? 0 : 1.25 }}>
        <SearchableSelect
          label="Method"
          value={method}
          onChange={(v) => setMethod(v as PaymentMethod)}
          fullWidth
          options={(Object.keys(METHOD_LABELS) as PaymentMethod[]).map((m) => ({ value: m, label: METHOD_LABELS[m] }))}
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
      </Stack>

      <Stack sx={{ mt: 1 }}>
        <Stack direction="row" sx={{ justifyContent: 'space-between', py: 0.6 }}>
          <Typography variant="body2">Amount Applied</Typography>
          <Typography variant="body2">{formatMoney(applied)}</Typography>
        </Stack>
        <Stack direction="row" sx={{ justifyContent: 'space-between', py: 0.6 }}>
          <Typography variant="body2">Remaining</Typography>
          <Typography variant="body2">{formatMoney(remaining)}</Typography>
        </Stack>
        <Divider sx={{ mt: 1, mb: 1.5 }} />
        <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Change Due
          </Typography>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            {formatMoney(changeDue)}
          </Typography>
        </Stack>
      </Stack>

      <Button
        variant="contained"
        size="large"
        fullWidth
        disabled={!canSubmit}
        onClick={() => onCheckout(payments)}
        sx={{ mt: 1.5 }}
      >
        {submitting ? 'Processing…' : `Charge ${formatMoney(total)}`}
      </Button>
    </Paper>
  );
}
