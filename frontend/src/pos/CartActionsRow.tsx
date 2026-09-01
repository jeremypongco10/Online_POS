import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import PersonAddAlt1OutlinedIcon from '@mui/icons-material/PersonAddAlt1Outlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
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
  onReturn: () => void;
}

/**
 * All four actions shown directly — Customer, Bagger, Return, and
 * Cancellation — rather than tucking any behind a "More" menu, so a
 * cashier can see and reach every action in one click. Wraps to a second
 * row on a narrow panel rather than clipping.
 *
 * (Refund used to sit here too, but it pointed at the exact same
 * /admin/customers/returns screen as Return — same backend flow, no
 * distinct refund-only path exists — so it was removed as a duplicate
 * rather than kept as a second button to the same place.)
 *
 * Customer and Bagger keep stable `id`s that useKeyboardShortcuts
 * triggers via a DOM click, since their dialog state lives up in
 * ProductBrowser rather than here. Return/Cancel don't need that —
 * PosScreen already wires F8/F9 straight to the same onReturn/onCancel
 * callbacks these buttons call — but they keep `id`s too, for the same
 * reason: parity with the other two, and a stable hook for tests.
 */
export function CartActionsRow({ customer, onOpenCustomer, bagger, onOpenBagger, cartHasItems, onCancel, onReturn }: Props) {
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

  // The buttons keep their fixed "Customer"/"Bagger" labels rather than
  // swapping in the attached person's name — the receipt header beside
  // them already spells out who's attached, so repeating it here was
  // redundant and made the two buttons jump around in width mid-sale.
  // That leaves this tint as the only at-a-glance signal that something
  // is attached, so it's pitched stronger than a hover state.
  const attachedSx = {
    borderColor: POS_ACCENT,
    color: POS_ACCENT,
    bgcolor: `${POS_ACCENT}1f`,
    '&:hover': { borderColor: POS_ACCENT, color: POS_ACCENT, bgcolor: `${POS_ACCENT}2e` },
  };

  return (
    // Packed from the left at each button's own natural width, rather
    // than a grid stretching every button to share the row evenly — that
    // made "Bagger" as wide as "Customer" with a lot of dead padding
    // inside it. Wraps to a second row once it actually runs out of space.
    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
      <Tooltip title="Shortcut: F3">
        <Button
          id="pos-action-add-customer"
          variant="outlined"
          startIcon={<PersonAddAlt1OutlinedIcon fontSize="small" />}
          onClick={onOpenCustomer}
          sx={{ ...actionSx, ...(customer ? attachedSx : null) }}
        >
          Customer
        </Button>
      </Tooltip>

      <Tooltip title="Shortcut: F4">
        <Button
          id="pos-action-bagger"
          variant="outlined"
          startIcon={<Inventory2OutlinedIcon fontSize="small" />}
          onClick={onOpenBagger}
          sx={{ ...actionSx, ...(bagger ? attachedSx : null) }}
        >
          Bagger
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
    </Stack>
  );
}
