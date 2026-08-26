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
      {/* Anchored bottom-right rather than under the header — the header's
          height isn't constant (it wraps on narrow screens, and differs
          between the admin shell and the POS AppBar), so a fixed top offset
          would drift out of place and overlap whatever sits just below it. */}
      <MuiSnackbar
        open={open}
        autoHideDuration={3000}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        slots={{ transition: SlideUp }}
        sx={{ mb: { xs: 2, sm: 3 }, mr: { xs: 2, sm: 3 } }}
      >
        <Alert
          onClose={() => setOpen(false)}
          severity={state.severity}
          variant="standard"
          sx={{
            minWidth: 300,
            maxWidth: 400,
            alignItems: 'center',
            border: 0,
            borderRadius: 3,
            bgcolor: `color-mix(in srgb, var(--mui-palette-${state.severity}-main) 10%, var(--mui-palette-background-paper))`,
            boxShadow: '0 16px 32px -12px rgba(16, 24, 40, 0.28), 0 4px 12px rgba(16, 24, 40, 0.1)',
            fontSize: 14,
            fontWeight: 600,
            color: 'text.primary',
            '& .MuiAlert-icon': {
              color: `${state.severity}.main`,
              bgcolor: `color-mix(in srgb, var(--mui-palette-${state.severity}-main) 18%, transparent)`,
              borderRadius: '50%',
              p: 0.75,
              mr: 1.5,
            },
            '& .MuiAlert-action': { pt: 0 },
          }}
        >
          {state.message}
        </Alert>
      </MuiSnackbar>
    </SnackbarContext.Provider>
  );
}
