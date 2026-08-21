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

function SlideLeft(props: SlideProps) {
  return <Slide {...props} direction="left" />;
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
      <MuiSnackbar
        open={open}
        autoHideDuration={3000}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        slots={{ transition: SlideLeft }}
        sx={{ mt: 7.5, mr: 0.5 }}
      >
        <Alert
          onClose={() => setOpen(false)}
          severity={state.severity}
          variant="outlined"
          sx={{
            minWidth: 280,
            maxWidth: 360,
            alignItems: 'center',
            bgcolor: 'background.paper',
            borderRadius: 1.25,
            borderColor: 'divider',
            borderLeft: '3px solid',
            borderLeftColor: `${state.severity}.main`,
            boxShadow: '0 12px 28px -8px rgba(16, 24, 40, 0.18), 0 2px 8px rgba(16, 24, 40, 0.08)',
            fontSize: 14,
            fontWeight: 600,
            color: 'text.primary',
            '& .MuiAlert-icon': { color: `${state.severity}.main` },
          }}
        >
          {state.message}
        </Alert>
      </MuiSnackbar>
    </SnackbarContext.Provider>
  );
}
