import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import PersonAddAlt1OutlinedIcon from '@mui/icons-material/PersonAddAlt1Outlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import AssignmentReturnOutlinedIcon from '@mui/icons-material/AssignmentReturnOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import SellOutlinedIcon from '@mui/icons-material/SellOutlined';
import type { Bagger, Customer } from '../api/types';
import { KeyHint } from './KeyHint';
import { POS_ACCENT } from './format';

interface Props {
  customer: Customer | null;
  onOpenCustomer: () => void;
  bagger: Bagger | null;
  onOpenBagger: () => void;
  cartHasItems: boolean;
  onOpenDiscount: () => void;
  onCancel: () => void;
  onReturn: () => void;
  onReprintReceipt: () => void;
}

/**
 * Customer and Bagger are always here — they attach to whatever sale is
 * about to happen, empty cart or not. The third slot swaps with the sale:
 *
 *   - Empty cart: Return and Reprint Receipt. Both deal with a sale that
 *     already happened, which is exactly the situation between customers
 *     — and Cancel Sale would have nothing to do here anyway.
 *   - Cart has items: Cancel Sale, on its own, in red, pushed to the far
 *     end away from Customer/Bagger. It's the one destructive action in
 *     this row, and it's now the only thing every alternative would
 *     compete with, rather than being one of five similar-looking buttons.
 *
 * Nothing here is ever hidden behind a menu — every control a cashier
 * might reach for at a given moment is a single click, just never more
 * than what's actually relevant right now. F7/F8 (Reprint/Return) and F9
 * (Cancel) are guarded the same way in PosScreen, so the keyboard
 * shortcuts can't fire a control that isn't currently on screen.
 *
 * No hover tooltips on any of these — deliberately removed, not an
 * oversight. Each button's KeyHint badge (the "F9" pill below) already
 * shows its shortcut permanently, as plain visible text in the button
 * itself, so a "Shortcut: F9" tooltip added no information a screen
 * reader or a glance didn't already have; it just gave Popper.js another
 * chance to misplace itself against this row's real neighbours (three
 * separate bugs — blocking its own click target, overlapping StatusBar's
 * text, and finally overlapping the button's own label — none of which a
 * genuinely empty tooltip is worth carrying).
 *
 * (Refund used to sit here too, but it pointed at the exact same
 * /admin/customers/returns screen as Return — same backend flow, no
 * distinct refund-only path exists — so it was removed as a duplicate
 * rather than kept as a second button to the same place.)
 *
 * Customer, Bagger, Return and Reprint Receipt keep stable `id`s that
 * useKeyboardShortcuts triggers via a DOM click, since none of their
 * dialog/navigation state lives here — Customer/Bagger's dialogs are up in
 * ProductBrowser; Return navigates away and Reprint opens PosScreen's own
 * search dialog. Cancel doesn't need that (PosScreen wires F9 straight to
 * the same onCancel this calls) but keeps one for parity and as a stable
 * hook for tests.
 */
export function CartActionsRow({
  customer,
  onOpenCustomer,
  bagger,
  onOpenBagger,
  cartHasItems,
  onOpenDiscount,
  onCancel,
  onReturn,
  onReprintReceipt,
}: Props) {
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
    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
      <Button
        id="pos-action-add-customer"
        variant="outlined"
        startIcon={<PersonAddAlt1OutlinedIcon fontSize="small" />}
        onClick={onOpenCustomer}
        sx={{ ...actionSx, ...(customer ? attachedSx : null) }}
      >
        Customer
        <KeyHint label="F3" />
      </Button>

      <Button
        id="pos-action-bagger"
        variant="outlined"
        startIcon={<Inventory2OutlinedIcon fontSize="small" />}
        onClick={onOpenBagger}
        sx={{ ...actionSx, ...(bagger ? attachedSx : null) }}
      >
        Bagger
        <KeyHint label="F4" />
      </Button>

      {cartHasItems ? (
        <>
          {/* The normal discount workflow: one discount for the whole
              sale, the POS working out which lines qualify. Sits with
              Customer/Bagger because it's the same kind of thing — a
              property of the sale being rung up, decided once — rather
              than with the destructive action pushed to the far end.
              Only while there's a cart: there is nothing to discount
              otherwise. Per-item overriding still exists on each cart
              row's own tag, for correcting a single line after the fact. */}
          <Button
            id="pos-action-discount"
            variant="outlined"
            startIcon={<SellOutlinedIcon fontSize="small" />}
            onClick={onOpenDiscount}
            sx={actionSx}
          >
            Discount
            <KeyHint label="F5" />
          </Button>

          {/* Pushes Cancel away from Customer/Bagger rather than letting it
              sit flush against them — it's the one action here that
              destroys work, and flush against two routine buttons it read
              as just another peer, a mis-tap risk on a touch screen. */}
          <Box sx={{ flex: 1, minWidth: 8 }} />

          <Button
            id="pos-action-cancel"
            variant="outlined"
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
            <KeyHint label="F9" />
          </Button>
        </>
      ) : (
        <>
          <Button
            id="pos-action-return"
            variant="outlined"
            startIcon={<AssignmentReturnOutlinedIcon fontSize="small" />}
            onClick={onReturn}
            sx={actionSx}
          >
            Return
            <KeyHint label="F8" />
          </Button>

          <Button
            id="pos-action-reprint"
            variant="outlined"
            startIcon={<ReceiptLongOutlinedIcon fontSize="small" />}
            onClick={onReprintReceipt}
            sx={actionSx}
          >
            Reprint Receipt
            <KeyHint label="F7" />
          </Button>
        </>
      )}
    </Stack>
  );
}
