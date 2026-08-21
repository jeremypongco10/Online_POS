import { useEffect, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import CloseIcon from '@mui/icons-material/Close';
import { api, ApiError } from '../api/client';
import type { CashSession, CashSessionSummary } from '../api/types';
import { formatMoney } from './format';
import { PopTransition } from '../PopTransition';

interface Props {
  session: CashSession;
  onClosed: () => void;
  onCancel: () => void;
}

/** Phase 17, step 5-7: Close Register -> Expected Cash -> Actual Cash -> Difference. */
export function CloseRegisterModal({ session, onClosed, onCancel }: Props) {
  const [summary, setSummary] = useState<CashSessionSummary | null>(null);
  const [actualCash, setActualCash] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get<CashSessionSummary>(`/cash-sessions/${session.id}/summary`).then(setSummary);
  }, [session.id]);

  const actual = parseFloat(actualCash) || 0;
  const difference = summary ? Math.round((actual - summary.expected_balance) * 100) / 100 : 0;

  async function handleClose() {
    setSubmitting(true);
    setError(null);
    try {
      await api.post(`/cash-sessions/${session.id}/close`, { closing_balance: actual });
      onClosed();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not close register');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open onClose={onCancel} maxWidth="sm" fullWidth slots={{ transition: PopTransition }}>
      <Stack
        direction="row"
        sx={{ alignItems: 'center', justifyContent: 'space-between', px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider' }}
      >
        <DialogTitle sx={{ p: 0, fontSize: 17, fontWeight: 700 }}>Close Register</DialogTitle>
        <IconButton
          onClick={onCancel}
          aria-label="Close"
          size="small"
          sx={{ color: 'text.secondary', bgcolor: 'action.hover', '&:hover': { bgcolor: 'action.selected' } }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Stack>
      <DialogContent sx={{ px: 3, py: 2.5 }}>
        {!summary ? (
          <Stack sx={{ alignItems: 'center', py: 3 }}>
            <CircularProgress size={22} />
          </Stack>
        ) : (
          <Stack spacing={1}>
            <Stack direction="row" sx={{ justifyContent: 'space-between', py: 0.5 }}>
              <Typography variant="body2">Opening Cash</Typography>
              <Typography variant="body2">{formatMoney(summary.opening_balance)}</Typography>
            </Stack>
            <Stack direction="row" sx={{ justifyContent: 'space-between', py: 0.5 }}>
              <Typography variant="body2">Cash Sales</Typography>
              <Typography variant="body2">{formatMoney(summary.cash_sales_total)}</Typography>
            </Stack>
            <Stack direction="row" sx={{ justifyContent: 'space-between', py: 0.5 }}>
              <Typography variant="body2">Cash In</Typography>
              <Typography variant="body2">{formatMoney(summary.cash_in_total)}</Typography>
            </Stack>
            <Stack direction="row" sx={{ justifyContent: 'space-between', py: 0.5 }}>
              <Typography variant="body2">Cash Out</Typography>
              <Typography variant="body2">-{formatMoney(summary.cash_out_total)}</Typography>
            </Stack>
            <Divider sx={{ my: 0.5 }} />
            <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Expected Cash
              </Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {formatMoney(summary.expected_balance)}
              </Typography>
            </Stack>

            <TextField
              label="Actual Cash (count the drawer)"
              type="number"
              slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
              value={actualCash}
              onChange={(e) => setActualCash(e.target.value)}
              autoFocus
              fullWidth
              sx={{ mt: 1.5 }}
            />

            <Divider sx={{ my: 0.5 }} />
            <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Difference
              </Typography>
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 700 }}
                color={difference < 0 ? 'error.main' : difference > 0 ? 'success.main' : 'text.primary'}
              >
                {difference > 0 ? '+' : ''}
                {formatMoney(difference)}
              </Typography>
            </Stack>

            {error && <Alert severity="error">{error}</Alert>}
          </Stack>
        )}
      </DialogContent>
      {summary && (
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleClose} disabled={submitting || actualCash === ''}>
            {submitting ? 'Closing…' : 'Close Register'}
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
}
