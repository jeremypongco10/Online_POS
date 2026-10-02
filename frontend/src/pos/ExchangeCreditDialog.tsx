import { useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import { api, ApiError } from '../api/client';
import { formatMoney } from './format';
import type { ExchangeCredit } from './ReturnDialog';

interface Props {
  /** The credit on the current sale; null keeps the dialog closed. */
  credit: ExchangeCredit | null;
  cashSessionId: number | null;
  onClose: () => void;
  /** The credit has left this sale — refunded in cash, or set aside for later. */
  onReleased: () => void;
}

/**
 * Taking an exchange credit off the sale. It is the customer's money, so it
 * is never simply dropped: either it is paid out in cash now, or it is set
 * aside and stays listed under Return → Unused exchange credits.
 */
export function ExchangeCreditDialog({ credit, cashSessionId, onClose, onReleased }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refundCash() {
    if (!credit || !cashSessionId) return;
    setBusy(true);
    setError(null);
    try {
      await api.post(`/returns/${credit.id}/refund-credit`, { cash_session_id: cashSessionId, refund_method: 'cash' });
      onReleased();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not refund the credit');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={credit !== null} onClose={busy ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Exchange credit</DialogTitle>
      <DialogContent>
        {credit && (
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              {credit.return_number} · <b>{formatMoney(credit.amount)}</b> toward this sale. What should happen to it?
            </Typography>
            {error && <Alert severity="error">{error}</Alert>}
            <Button variant="contained" disabled={busy || !cashSessionId} onClick={refundCash}>
              {busy ? 'Refunding…' : `Refund ${formatMoney(credit.amount)} in cash`}
            </Button>
            <Button variant="outlined" disabled={busy} onClick={onReleased}>
              Keep it for later
            </Button>
            <Typography variant="caption" color="text.secondary">
              A credit kept for later stays under Return (F8) → Unused exchange credits, to use on another sale or refund.
            </Typography>
            <Button color="inherit" disabled={busy} onClick={onClose}>
              Leave it on this sale
            </Button>
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  );
}
