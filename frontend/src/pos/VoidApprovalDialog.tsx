import { useEffect, useState, type FormEvent } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutlineOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { api, ApiError } from '../api/client';
import type { CartLine } from './posTypes';
import { calculateLine } from './posTypes';
import { formatMoney, formatQuantity } from './format';

/** Which action is awaiting sign-off — one cart line, or the whole cart via Cancel Sale. Each hits its own backend endpoint (see submit()) so the audit trail records them as distinct event kinds. */
export type VoidSubject = { kind: 'item'; line: CartLine } | { kind: 'cart'; itemCount: number; amount: number };

interface Props {
  subject: VoidSubject | null;
  /** Whether this action needs a supervisor's credentials. When false the dialog collects only a reason and posts to the un-gated logging endpoint — the void still reaches the audit trail, just without an approver against it. */
  requireApproval: boolean;
  storeId: number | null;
  onClose: () => void;
  /** Called only after the backend has approved — the caller (PosScreen) decides what to actually remove, based on which `subject` was open. */
  onApproved: (approvedBy: string) => void;
}

/** Preset rather than free text: typing a sentence on a POS mid-queue is slow, and a fixed set keeps the audit trail groupable instead of every cashier phrasing the same thing differently. */
const REASONS = [
  'Customer changed mind',
  'Scanned in error',
  'Wrong item picked',
  'Damaged / expired stock',
  'Price dispute',
  'Other',
];

interface AuthResponse {
  approved_by: string;
  approved_by_id: number;
}

/**
 * Confirms dropping a cart line (item void) or clearing the whole cart
 * (Cancel Sale), in one of two modes decided by `requireApproval` — which
 * PosScreen reads per-action from the company's settings:
 *
 *  - approval required: a supervisor's credentials plus a reason, posted
 *    to the authorize-* endpoints.
 *  - approval off: reason only, posted to log-void. Still one tap more
 *    than deleting silently, deliberately — an unattributed, unexplained
 *    void is worth very little when someone reviews the trail.
 *
 * Either way nothing is removed locally until the backend returns 200.
 * The server is what decides whether an approver is real, active,
 * carries sales.void, and is assigned to this store, and it writes the
 * audit row. Approving in the browser and merely telling the server
 * afterwards would make the whole control decorative, since the
 * cashier's own client is exactly what's being guarded against.
 */
export function VoidApprovalDialog({ subject, requireApproval, storeId, onClose, onApproved }: Props) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [reason, setReason] = useState(REASONS[0]);
  const [otherReason, setOtherReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Credentials must never outlive one approval — without this, the
  // supervisor's password would still be sitting in state (and in the
  // field) the next time any cashier opened this dialog.
  useEffect(() => {
    if (subject) {
      setIdentifier('');
      setPassword('');
      setReason(REASONS[0]);
      setOtherReason('');
      setError(null);
    }
  }, [subject]);

  if (!subject) return null;

  const lineTotals = subject.kind === 'item' ? calculateLine(subject.line) : null;
  const resolvedReason = reason === 'Other' ? otherReason.trim() : reason;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!subject || resolvedReason === '') return;

    setSubmitting(true);
    setError(null);
    try {
      // Approval off: record it and move on. Same audit action either way
      // — what differs is whether an approver is named against it, which
      // is itself the signal when reviewing the trail later.
      if (!requireApproval) {
        await api.post('/sales/log-void', {
          kind: subject.kind,
          reason: resolvedReason,
          ...(subject.kind === 'item'
            ? { product_name: subject.line.product.name, quantity: subject.line.quantity, amount: lineTotals!.gross }
            : { item_count: subject.itemCount, amount: subject.amount }),
        });
        onApproved('');
        return;
      }

      const result =
        subject.kind === 'item'
          ? await api.post<AuthResponse>('/sales/authorize-item-void', {
              identifier: identifier.trim(),
              password,
              reason: resolvedReason,
              product_name: subject.line.product.name,
              quantity: subject.line.quantity,
              amount: lineTotals!.gross,
              store_id: storeId ?? undefined,
            })
          : await api.post<AuthResponse>('/sales/authorize-cart-void', {
              identifier: identifier.trim(),
              password,
              reason: resolvedReason,
              item_count: subject.itemCount,
              amount: subject.amount,
              store_id: storeId ?? undefined,
            });
      onApproved(result.approved_by);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not complete this');
      setPassword('');
    } finally {
      setSubmitting(false);
    }
  }

  const submitLabel = subject.kind === 'item' ? 'Void Item' : 'Cancel Sale';
  const blurb = requireApproval
    ? `A supervisor must approve ${subject.kind === 'item' ? 'removing this item from the sale' : 'cancelling this sale'}.`
    : 'This will be recorded in the audit trail against your name.';

  return (
    <Dialog open onClose={submitting ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <ShieldOutlinedIcon fontSize="small" color="error" />
          <span>{requireApproval ? 'Supervisor approval' : submitLabel}</span>
        </Stack>
        <IconButton size="small" onClick={onClose} disabled={submitting} aria-label="Close">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            {blurb}
          </Typography>

          {/* The subject restated inside the dialog, not just named in a
              sentence — the cashier is about to have someone else type a
              password on their behalf, and the approver should be able to
              see exactly what they're signing off on. */}
          <Stack
            direction="row"
            spacing={1.5}
            sx={{ alignItems: 'center', justifyContent: 'space-between', p: 1.5, borderRadius: 2, bgcolor: 'action.hover' }}
          >
            {subject.kind === 'item' ? (
              <>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap title={subject.line.product.name}>
                    {subject.line.product.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatQuantity(subject.line.quantity, subject.line.unit?.abbreviation ?? null, subject.line.unit?.decimal_places ?? 0)}{' '}
                    × {formatMoney(subject.line.unitPrice)}
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                  {formatMoney(lineTotals!.gross)}
                </Typography>
              </>
            ) : (
              <>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    Entire cart
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {subject.itemCount} item{subject.itemCount === 1 ? '' : 's'}
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                  {formatMoney(subject.amount)}
                </Typography>
              </>
            )}
          </Stack>

          <Stack component="form" spacing={2} onSubmit={submit}>
            <TextField
              select
              label="Reason"
              size="small"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              fullWidth
              required
            >
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
                slotProps={{ htmlInput: { maxLength: 255 } }}
              />
            )}

            {requireApproval && (
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

            {error && <Alert severity="error">{error}</Alert>}

            <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
              <Button onClick={onClose} disabled={submitting} color="inherit">
                Back
              </Button>
              <Button
                type="submit"
                variant="contained"
                color="error"
                disableElevation
                disabled={submitting || resolvedReason === '' || (requireApproval && (identifier.trim() === '' || password === ''))}
              >
                {submitting ? <CircularProgress size={20} color="inherit" /> : submitLabel}
              </Button>
            </Stack>
          </Stack>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
