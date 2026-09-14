import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import { api } from '../api/client';
import type { CashSession, OpeningFloatMode } from '../api/types';
import { useFormErrors } from '../admin/useFormErrors';
import { currencySymbol } from '../regional';
import { formatMoney, posRaisedButtonSx } from './format';

interface Props {
  registerId: number;
  registerName: string;
  /**
   * How this register starts a session — configured in the Back Office's
   * POS Terminals settings (see RegistersTab), not something this screen
   * decides on its own. Undefined/'manual' is today's original
   * behaviour: the cashier counts the drawer and types what they
   * counted. See CashSessionsController::open() on the backend, which is
   * the actual source of truth for what figure a 'fixed'/'fixed_confirm'
   * register opens at — this screen only decides how little or much the
   * cashier does to get there, never the number itself.
   */
  openingFloatMode?: OpeningFloatMode;
  /** Only meaningful when openingFloatMode isn't 'manual'. */
  defaultOpeningFloat?: string | null;
  currency?: string | null;
  onOpened: (session: CashSession) => void;
}

/** Phase 17, step 1-2: Open Register -> Opening Cash. Gates the POS until a session exists. */
export function OpenRegisterScreen({ registerId, registerName, openingFloatMode, defaultOpeningFloat, currency, onOpened }: Props) {
  const [openingBalance, setOpeningBalance] = useState('');
  const { fieldErrors, formError, clearErrors, clearField, reportError } = useFormErrors();
  const [submitting, setSubmitting] = useState(false);
  // Set when an auto-open (the 'fixed'/'fixed_confirm' path) fails,
  // which falls the screen through to the ordinary manual form below
  // rather than leaving it stuck on a spinner or a Start Shift button
  // that keeps failing with nothing the cashier can do about it.
  const [autoOpenFailed, setAutoOpenFailed] = useState(false);
  // A register whose mode isn't 'manual' but has no configured float is a
  // misconfiguration RegistersController's own validation should have
  // already ruled out at save time — but this screen checks again rather
  // than assuming that guard was never bypassed (a register created
  // before this feature existed, say), and falls back to the ordinary
  // typed-entry form instead of trying to auto-open at nothing.
  const mode = openingFloatMode && defaultOpeningFloat ? openingFloatMode : 'manual';
  const symbol = currencySymbol(currency);

  async function open(balance?: number) {
    setSubmitting(true);
    clearErrors();
    try {
      const session = await api.post<CashSession>('/cash-sessions/open', {
        register_id: registerId,
        // Omitted entirely for the two fixed modes rather than sent as
        // the configured figure — CashSessionsController::open() already
        // ignores whatever a client sends for those and resolves the
        // register's own configuration itself, so there's nothing
        // genuine to send; see that endpoint's own docblock.
        ...(balance !== undefined && { opening_balance: balance }),
      });
      onOpened(session);
    } catch (err) {
      reportError(err, 'Failed to open POS terminal');
      // A failed auto-open (network hiccup, the misconfiguration guard
      // above somehow still tripping server-side) has to land somewhere
      // a cashier can act on it — falling through to the manual form
      // below is that landing place, not a screen stuck on a spinner
      // forever with no way to actually get into the till.
      setAutoOpenFailed(true);
    } finally {
      setSubmitting(false);
    }
  }

  function handleManualSubmit(e: FormEvent) {
    e.preventDefault();
    void open(parseFloat(openingBalance) || 0);
  }

  // Fires the auto-open exactly once for 'fixed' mode — a ref rather than
  // relying on `submitting` to guard re-entry, since StrictMode's dev-only
  // double-invoke of effects would otherwise be able to race two opens
  // against the same register before the first one's state update lands.
  const firedRef = useRef(false);
  useEffect(() => {
    if (mode !== 'fixed' || firedRef.current) return;
    firedRef.current = true;
    void open(undefined);
    // open() is stable enough for this (it only closes over props/setters
    // that don't need to retrigger this), and including it would refire
    // on every render that redefines it — i.e. every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  if (mode === 'fixed' && !autoOpenFailed) {
    return (
      <CenteredCard>
        <Stack spacing={2} sx={{ alignItems: 'center', textAlign: 'center' }}>
          <CircularProgress size={28} />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Opening {registerName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Starting with {symbol}
              {formatMoney(parseFloat(defaultOpeningFloat ?? '0'))} — configured for this terminal, no entry needed.
            </Typography>
          </Box>
        </Stack>
      </CenteredCard>
    );
  }

  if (mode === 'fixed_confirm' && !autoOpenFailed) {
    return (
      <CenteredCard>
        <Typography variant="h5" sx={{ fontWeight: 700, letterSpacing: '-0.01em' }} gutterBottom>
          Open POS Terminal
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {registerName} has no open cash session.
        </Typography>
        <Stack spacing={2.5}>
          {/* Read-only by design, not a pre-filled TextField — this mode
              exists specifically so nothing here is typed or edited; a
              different opening figure is what 'manual' mode is for. */}
          <Box
            sx={{
              p: 2,
              borderRadius: 1.5,
              bgcolor: 'action.hover',
              textAlign: 'center',
            }}
          >
            <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
              Opening Cash
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5 }}>
              {symbol}
              {formatMoney(parseFloat(defaultOpeningFloat ?? '0'))}
            </Typography>
          </Box>
          {formError && <Alert severity="error">{formError}</Alert>}
          <Button
            variant="contained"
            size="large"
            disabled={submitting}
            fullWidth
            onClick={() => void open(undefined)}
            sx={(theme) => posRaisedButtonSx(theme.palette.primary.main)}
          >
            {submitting ? 'Opening…' : 'Start Shift'}
          </Button>
        </Stack>
      </CenteredCard>
    );
  }

  // 'manual' mode, and the fallback for a failed auto-open above.
  return (
    <CenteredCard formProps={{ onSubmit: handleManualSubmit }}>
      <Typography variant="h5" sx={{ fontWeight: 700, letterSpacing: '-0.01em' }} gutterBottom>
        Open POS Terminal
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {autoOpenFailed
          ? `${registerName} couldn't be opened automatically — count the drawer and enter the opening cash instead.`
          : `${registerName} has no open cash session. Count the drawer and enter the opening cash to start selling.`}
      </Typography>
      <Stack spacing={2.5}>
        <TextField
          label="Opening Cash"
          type="number"
          slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
          value={openingBalance}
          onChange={(e) => {
            setOpeningBalance(e.target.value);
            clearField('opening_balance');
          }}
          error={!!fieldErrors?.opening_balance}
          helperText={fieldErrors?.opening_balance}
          required
          autoFocus
          fullWidth
        />
        {formError && <Alert severity="error">{formError}</Alert>}
        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={submitting}
          fullWidth
          sx={(theme) => posRaisedButtonSx(theme.palette.primary.main)}
        >
          {submitting ? 'Opening…' : 'Open POS Terminal'}
        </Button>
      </Stack>
    </CenteredCard>
  );
}

/**
 * The shared full-screen card shell every state above renders inside —
 * pulled out once a third and fourth state (the spinner, the confirm
 * screen) joined the original form, rather than repeating this Box/Paper
 * pair four times. `formProps` only matters for the states that need
 * their content to actually be a <form> (Enter submits); the others pass
 * nothing and get a plain Box instead.
 */
function CenteredCard({ children, formProps }: { children: ReactNode; formProps?: { onSubmit: (e: FormEvent) => void } }) {
  return (
    <Box
      sx={{
        minHeight: '100svh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        backgroundImage:
          'radial-gradient(circle at 15% 15%, color-mix(in srgb, var(--mui-palette-primary-main) 16%, transparent), transparent 45%), radial-gradient(circle at 85% 85%, color-mix(in srgb, var(--mui-palette-primary-main) 10%, transparent), transparent 50%)',
      }}
    >
      <Paper
        component={formProps ? 'form' : 'div'}
        noValidate={!!formProps}
        onSubmit={formProps?.onSubmit}
        elevation={0}
        sx={{
          width: 360,
          p: 4.5,
          borderRadius: 1,
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: '0 12px 32px rgba(16, 24, 40, 0.14), 0 2px 6px rgba(16, 24, 40, 0.06)',
        }}
      >
        {children}
      </Paper>
    </Box>
  );
}
