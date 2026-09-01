import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';
import PersonAddAlt1OutlinedIcon from '@mui/icons-material/PersonAddAlt1Outlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import UndoOutlinedIcon from '@mui/icons-material/UndoOutlined';
import AssignmentReturnOutlinedIcon from '@mui/icons-material/AssignmentReturnOutlined';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import type { Bagger, Customer } from '../api/types';
import { POS_ACCENT } from './format';

interface Props {
  customer: Customer | null;
  onOpenCustomer: () => void;
  bagger: Bagger | null;
  onOpenBagger: () => void;
  cartHasItems: boolean;
  onCancel: () => void;
  onRefund: () => void;
  onReturn: () => void;
}

/**
 * All five actions shown directly — Add Customer, Bagger, Refund, Return,
 * and Cancellation — rather than tucking the latter three behind a "More"
 * menu, so a cashier can see and reach every action in one click. Wraps
 * to a second row on a narrow panel rather than clipping.
 *
 * Add Customer and Bagger keep stable `id`s that useKeyboardShortcuts
 * triggers via a DOM click, since their dialog state lives up in
 * ProductBrowser rather than here. Refund/Return/Cancel don't need that —
 * PosScreen already wires F7/F8/F9 straight to the same onRefund/
 * onReturn/onCancel callbacks these buttons call — but they keep `id`s
 * too, for the same reason: parity with the other two, and a stable hook
 * for tests.
 */
export function CartActionsRow({ customer, onOpenCustomer, bagger, onOpenBagger, cartHasItems, onCancel, onRefund, onReturn }: Props) {
  const actionSx = {
    justifyContent: 'flex-start',
    minWidth: 0,
    px: 1.5,
    py: 0.85,
    borderRadius: 2,
    borderColor: 'divider',
    color: 'text.primary',
    fontWeight: 600,
    fontSize: 13,
    textTransform: 'none' as const,
    '&:hover': { borderColor: POS_ACCENT, color: POS_ACCENT, bgcolor: `${POS_ACCENT}0a` },
  };

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 1 }}>
      <Tooltip title="Shortcut: F3">
        <Button
          id="pos-action-add-customer"
          variant="outlined"
          startIcon={<PersonAddAlt1OutlinedIcon fontSize="small" />}
          onClick={onOpenCustomer}
          sx={{
            ...actionSx,
            // An attached customer/bagger is state worth seeing at a
            // glance mid-sale, so a filled selection reads differently
            // from the empty prompt without adding a separate badge.
            ...(customer && { borderColor: POS_ACCENT, color: POS_ACCENT, bgcolor: `${POS_ACCENT}0f` }),
          }}
        >
          <Typography component="span" noWrap sx={{ fontWeight: 600, fontSize: 13, minWidth: 0 }}>
            {customer ? customer.name : 'Add Customer'}
          </Typography>
        </Button>
      </Tooltip>

      <Tooltip title="Shortcut: F6">
        <Button
          id="pos-action-bagger"
          variant="outlined"
          startIcon={<Inventory2OutlinedIcon fontSize="small" />}
          onClick={onOpenBagger}
          sx={{
            ...actionSx,
            ...(bagger && { borderColor: POS_ACCENT, color: POS_ACCENT, bgcolor: `${POS_ACCENT}0f` }),
          }}
        >
          <Typography component="span" noWrap sx={{ fontWeight: 600, fontSize: 13, minWidth: 0 }}>
            {bagger ? bagger.name : 'Bagger'}
          </Typography>
        </Button>
      </Tooltip>

      <Tooltip title="Shortcut: F7">
        <Button
          id="pos-action-refund"
          variant="outlined"
          startIcon={<UndoOutlinedIcon fontSize="small" />}
          onClick={onRefund}
          sx={actionSx}
        >
          Refund
        </Button>
      </Tooltip>

      <Tooltip title="Shortcut: F8">
        <Button
          id="pos-action-return"
          variant="outlined"
          startIcon={<AssignmentReturnOutlinedIcon fontSize="small" />}
          onClick={onReturn}
          sx={actionSx}
        >
          Return
        </Button>
      </Tooltip>

      <Tooltip title="Shortcut: F9">
        <span>
          <Button
            id="pos-action-cancel"
            variant="outlined"
            disabled={!cartHasItems}
            startIcon={<CancelOutlinedIcon fontSize="small" />}
            onClick={onCancel}
            sx={{
              ...actionSx,
              width: '100%',
              color: 'error.main',
              borderColor: 'error.main',
              '&:hover': {
                borderColor: 'error.dark',
                color: 'error.dark',
                backgroundColor: (t) => `color-mix(in srgb, ${t.palette.error.main} 8%, transparent)`,
              },
            }}
          >
            Cancel Sale
          </Button>
        </span>
      </Tooltip>
    </Box>
  );
}
