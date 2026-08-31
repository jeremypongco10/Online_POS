import Popover from '@mui/material/Popover';
import Stack from '@mui/material/Stack';
import type { CashSession } from '../api/types';
import { CashMovementPanel } from './CashMovementPanel';

interface Props {
  anchorEl: HTMLElement | null;
  onClose: () => void;
  cashSession: CashSession | null;
}

/** Houses Cash Movements behind the header's "more" button instead of always taking up space — Bagger and Add Customer live in the Actions row instead. */
export function OverflowMenu({ anchorEl, onClose, cashSession }: Props) {
  return (
    <Popover
      open={Boolean(anchorEl)}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
    >
      <Stack spacing={1.5} sx={{ p: 1.5, width: 340 }}>
        {cashSession ? <CashMovementPanel session={cashSession} /> : null}
      </Stack>
    </Popover>
  );
}
