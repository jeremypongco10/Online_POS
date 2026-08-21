import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import { Modal } from './admin/Modal';
import { useRetained } from './admin/useRetained';

interface ConfirmOptions {
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

type ConfirmFn = (message: string, options?: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/** Drop-in replacement for `window.confirm` that shows the app's own modal instead of the browser's native dialog. Resolves true/false. */
export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx;
}

interface PendingConfirm {
  message: string;
  options: ConfirmOptions;
  resolve: (value: boolean) => void;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const pendingR = useRetained(pending);

  const confirm = useCallback<ConfirmFn>(
    (message, options = {}) => new Promise<boolean>((resolve) => setPending({ message, options, resolve })),
    []
  );

  function settle(result: boolean) {
    pending?.resolve(result);
    setPending(null);
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal open={pending !== null} title={pendingR?.options.title ?? 'Please confirm'} onClose={() => settle(false)}>
        <Typography sx={{ mb: 3 }}>{pendingR?.message}</Typography>
        <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'flex-end' }}>
          <Button variant="text" onClick={() => settle(false)}>
            {pendingR?.options.cancelLabel ?? 'Cancel'}
          </Button>
          <Button variant="contained" color="error" onClick={() => settle(true)} autoFocus>
            {pendingR?.options.confirmLabel ?? 'Confirm'}
          </Button>
        </Stack>
      </Modal>
    </ConfirmContext.Provider>
  );
}
