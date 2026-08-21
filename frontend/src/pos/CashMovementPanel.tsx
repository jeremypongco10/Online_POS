import { useState } from 'react';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import { api, ApiError } from '../api/client';
import type { CashSession } from '../api/types';
import { formatMoney } from './format';

interface Props {
  session: CashSession;
}

/** Phase 17, step 4: Cash movements — paid-ins/paid-outs against the open drawer. */
export function CashMovementPanel({ session }: Props) {
  const [type, setType] = useState<'cash_in' | 'cash_out'>('cash_out');
  const [amountText, setAmountText] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [lastAdded, setLastAdded] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    const amount = parseFloat(amountText) || 0;
    if (amount <= 0) return;

    setSubmitting(true);
    setError(null);
    try {
      await api.post(`/cash-sessions/${session.id}/movements`, { type, amount, reason: reason || undefined });
      setLastAdded(`${type === 'cash_in' ? 'Cash in' : 'Cash out'}: ${formatMoney(amount)}`);
      setAmountText('');
      setReason('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not record movement');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Paper variant="outlined" sx={{ p: 2.25, borderRadius: 1.5 }}>
      <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: '0.06em' }}>
        Cash Movements
      </Typography>
      <Stack spacing={1.5} sx={{ mt: 1.25 }}>
        <TextField
          select
          label="Type"
          value={type}
          onChange={(e) => setType(e.target.value as 'cash_in' | 'cash_out')}
          fullWidth
        >
          <MenuItem value="cash_out">Cash Out (paid out)</MenuItem>
          <MenuItem value="cash_in">Cash In (paid in)</MenuItem>
        </TextField>
        <TextField
          label="Amount"
          type="number"
          slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
          value={amountText}
          onChange={(e) => setAmountText(e.target.value)}
          fullWidth
        />
        <TextField
          label="Reason"
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. petty cash"
          fullWidth
        />
        {error && <Alert severity="error">{error}</Alert>}
        {lastAdded && (
          <Typography variant="body2" color="text.secondary">
            {lastAdded}
          </Typography>
        )}
        <Button variant="outlined" onClick={submit} disabled={submitting || !amountText} fullWidth sx={{ borderStyle: 'dashed' }}>
          Record Movement
        </Button>
      </Stack>
    </Paper>
  );
}
