import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';
import ErrorOutlineOutlinedIcon from '@mui/icons-material/ErrorOutlineOutlined';
import { posRaisedButtonSx, POS_ACCENT } from './format';

interface Props {
  open: boolean;
  itemCount: number;
  onHoldAndLogout: () => void;
  onDiscardAndLogout: () => void;
  onCancel: () => void;
}

/**
 * Logging out used to just... log out, cart or no cart — one click on
 * either the account menu's own button or the lock screen's "Log out
 * instead" link, no check on what was still in progress. That leaned
 * entirely on the draft-sale autosave (see holdSale.ts's saveDraftSale)
 * to not actually lose anything, but that mechanism was built for the
 * opposite kind of event: an accidental refresh or tab close, not a
 * deliberate sign-out. Worse, that draft is keyed per REGISTER, not per
 * cashier — it silently reappears for whoever next opens this same
 * terminal, cart contents and all, with nothing to say whose sale it
 * was or why it's sitting there. This dialog is what stands between
 * "log out" and that outcome whenever the cart isn't empty.
 *
 * Two real choices, not just a yes/no gate:
 *
 *   - Hold Sale & Log Out is the recommended default (it's the
 *     contained, `autoFocus`ed button) — the exact same holdSale() the
 *     Hold button already uses, so the sale becomes a real, labelled,
 *     resumable entry in the Held Sales list instead of an anonymous
 *     draft. Whoever opens this register next sees it named and dated,
 *     and chooses to resume it, rather than having it dropped in their
 *     cart for them.
 *   - Discard & Log Out is for the sale that genuinely shouldn't be
 *     resumed — a test scan, a customer who walked out — and calls the
 *     same resetSale() Cancel Sale uses, draft included, so there is
 *     nothing left for a later session to inherit either.
 *
 * PosScreen is what decides whether this dialog opens at all (only when
 * `lines.length > 0`) — an empty cart still logs out in one click, same
 * as before.
 */
export function LogoutWithSaleDialog({ open, itemCount, onHoldAndLogout, onDiscardAndLogout, onCancel }: Props) {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      maxWidth="xs"
      fullWidth
      // Above PosLockScreen's own 2000, not MUI's default 1300 every
      // other POS dialog is content with — this is the one dialog that
      // can genuinely be opened FROM there ("Log out instead" while
      // locked, with items still in the cart), and at the default
      // z-index it would render fully behind that opaque cover:
      // present, but invisible and unreachable. Every other POS dialog
      // stays at the default because none of them are ever opened while
      // the lock screen itself is showing.
      sx={{ zIndex: 2100 }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <ErrorOutlineOutlinedIcon fontSize="small" color="warning" />
          <span>Unfinished Sale</span>
        </Stack>
        <IconButton size="small" onClick={onCancel} aria-label="Close">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          This sale has {itemCount} item{itemCount === 1 ? '' : 's'} in it. Logging out now won't finish it —
          choose what happens to it first.
        </Typography>

        <Stack spacing={1.25}>
          <Button
            variant="contained"
            fullWidth
            autoFocus
            onClick={onHoldAndLogout}
            sx={{ justifyContent: 'flex-start', py: 1.25, ...posRaisedButtonSx(POS_ACCENT) }}
          >
            <Box sx={{ textAlign: 'left' }}>
              <Typography sx={{ fontWeight: 700, lineHeight: 1.3 }}>Hold Sale &amp; Log Out</Typography>
              <Typography variant="caption" sx={{ opacity: 0.85, display: 'block' }}>
                Recommended — the next cashier on this terminal can resume it from Held Sales.
              </Typography>
            </Box>
          </Button>

          <Button
            variant="outlined"
            color="error"
            fullWidth
            onClick={onDiscardAndLogout}
            sx={{ justifyContent: 'flex-start', py: 1.25 }}
          >
            <Box sx={{ textAlign: 'left' }}>
              <Typography sx={{ fontWeight: 700, lineHeight: 1.3 }}>Discard &amp; Log Out</Typography>
              <Typography variant="caption" sx={{ opacity: 0.85, display: 'block' }}>
                Clears the cart for good — use this only if the sale shouldn't be picked up again.
              </Typography>
            </Box>
          </Button>

          <Button variant="text" color="inherit" onClick={onCancel} sx={{ color: 'text.secondary' }}>
            Cancel — stay signed in
          </Button>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
