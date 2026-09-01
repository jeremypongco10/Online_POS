import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import MuiSnackbar from '@mui/material/Snackbar';
import Slide, { type SlideProps } from '@mui/material/Slide';
import Alert from '@mui/material/Alert';

type Severity = 'success' | 'error' | 'info' | 'warning';

interface SnackbarState {
  message: string;
  severity: Severity;
}

type NotifyFn = (message: string, severity?: Severity) => void;

const SnackbarContext = createContext<NotifyFn | null>(null);

/** Shows a brief toast confirming an action succeeded — call after a save/update completes. Defaults to severity "success". */
export function useSnackbar(): NotifyFn {
  const ctx = useContext(SnackbarContext);
  if (!ctx) throw new Error('useSnackbar must be used within SnackbarProvider');
  return ctx;
}

function SlideUp(props: SlideProps) {
  return <Slide {...props} direction="up" />;
}

export function SnackbarProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SnackbarState>({ message: '', severity: 'success' });
  const [open, setOpen] = useState(false);

  const notify = useCallback<NotifyFn>((message, severity = 'success') => {
    setState({ message, severity });
    setOpen(true);
  }, []);

  function handleClose(_event: unknown, reason?: string) {
    if (reason === 'clickaway') return;
    setOpen(false);
  }

  return (
    <SnackbarContext.Provider value={notify}>
      {children}
      {/* Bottom-LEFT, not bottom-right: on the POS the right corner is the
          Pay button, and this fires on every single scan — it was landing
          on top of the primary action at exactly the moment a cashier
          reaches for it. Not anchored to the top either, since the header's
          height isn't constant (it wraps on narrow screens, and differs
          between the admin shell and the POS), so a fixed top offset drifts
          out of place.

          pointerEvents:'none' on the container is the belt-and-braces part:
          wherever this lands, it can never swallow a click meant for the UI
          underneath it. That also makes a close button unworkable — which
          is fine, it doesn't have one any more (see below). */}
      <MuiSnackbar
        open={open}
        autoHideDuration={3000}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        slots={{ transition: SlideUp }}
        sx={{ mb: { xs: 2, sm: 3 }, ml: { xs: 2, sm: 3 }, pointerEvents: 'none' }}
      >
        <Alert
          severity={state.severity}
          variant="standard"
          // No dismiss button: this auto-hides in 3s and fires constantly
          // while ringing up, so an X was a permanent piece of furniture
          // nobody clicks — and one that padded the pill out sideways.
          // Sized to its text rather than a 300px floor, so "Added aa"
          // is a small pill instead of a banner.
          sx={{
            maxWidth: 360,
            alignItems: 'center',
            py: 0.5,
            pl: 1.25,
            pr: 2,
            border: 0,
            borderRadius: 2.5,
            bgcolor: `color-mix(in srgb, var(--mui-palette-${state.severity}-main) 10%, var(--mui-palette-background-paper))`,
            boxShadow: '0 10px 24px -12px rgba(16, 24, 40, 0.3), 0 2px 6px rgba(16, 24, 40, 0.08)',
            fontSize: 13.5,
            fontWeight: 600,
            color: 'text.primary',
            '& .MuiAlert-icon': {
              // Bare glyph — the tinted disc behind it was doing the work
              // of a status badge for what is only ever a passing
              // confirmation, and it made the pill noticeably taller.
              color: `${state.severity}.main`,
              mr: 1,
              py: 0,
              fontSize: 20,
            },
            '& .MuiAlert-message': { py: 0.25 },
          }}
        >
          {state.message}
        </Alert>
      </MuiSnackbar>
    </SnackbarContext.Provider>
  );
}
