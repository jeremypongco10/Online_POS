import type { ReactNode } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import CloseIcon from '@mui/icons-material/Close';
import HelpOutlineIcon from '@mui/icons-material/HelpOutlineOutlined';
import SearchIcon from '@mui/icons-material/Search';
import PersonAddAlt1OutlinedIcon from '@mui/icons-material/PersonAddAlt1Outlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import SellOutlinedIcon from '@mui/icons-material/SellOutlined';
import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutlineOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import AssignmentReturnOutlinedIcon from '@mui/icons-material/AssignmentReturnOutlined';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import CreditCardOutlinedIcon from '@mui/icons-material/CreditCardOutlined';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import OpenWithOutlinedIcon from '@mui/icons-material/OpenWithOutlined';
import AddShoppingCartOutlinedIcon from '@mui/icons-material/AddShoppingCartOutlined';
import KeyboardReturnOutlinedIcon from '@mui/icons-material/KeyboardReturnOutlined';
import TouchAppOutlinedIcon from '@mui/icons-material/TouchAppOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined';
import { POS_SHORTCUTS, type PosShortcutGroup } from './posShortcuts';
import { POS_ACCENT, POS_ACTION_TINTS } from './format';
import { IS_TOUCH } from '../isTouch';

const GROUP_LABELS: Record<PosShortcutGroup, string> = {
  finding: 'Finding & adding products',
  sale: 'This sale',
  past: 'Past sales',
  terminal: 'Terminal',
};

/**
 * The two columns, split by row count rather than by meaning — Finding
 * (6 rows) takes the left along with Past sales (2), and This sale (9,
 * since Void Item joined it as its own row) takes the right along with
 * Terminal (1): 8 rows a side versus 10. Not perfectly even — This sale
 * genuinely has more in it than Finding does — but close enough that
 * neither column runs meaningfully longer than the other on a normal
 * till screen. Same reasoning, and the same shape, as DiscountDialog's
 * CATEGORY_COLUMNS.
 *
 * Getting this reasonably even is the whole point of the two columns:
 * a badly uneven split puts the last group past the bottom of the
 * dialog on a short screen, which is exactly the scrolling this layout
 * replaced.
 */
const GROUP_COLUMNS: PosShortcutGroup[][] = [
  ['finding', 'past'],
  ['sale', 'terminal'],
];

/**
 * The face each shortcut wears, keyed by its on-screen label rather than
 * its key or its action. Label, not key, because F7 now names two
 * entries in POS_SHORTCUTS — Reprint receipt and Void Item, filed under
 * different groups since they're genuinely different controls that
 * happen to share a key (see that key's own comment in posShortcuts.ts)
 * — and a plain `Record<string, Face>` keyed by "F7" could only ever
 * hold one face for both. Label, not action, because the arrows, Enter,
 * Esc and Hold have no action at all, and still want an icon.
 * Presentation only, so it lives here rather than in posShortcuts.ts,
 * which stays the data/behaviour source both this and
 * useKeyboardShortcuts read.
 *
 * Every entry that drives a real control borrows that control's own icon
 * and POS_ACTION_TINTS colour, so what a cashier reads here is literally
 * what they'll then look for on screen — which is exactly why Reprint
 * receipt and Void Item need their own faces despite sharing a key: one
 * button is teal with a receipt, the other is voidItem's own hue with a
 * block icon, and conflating them under one shared "F7" face would have
 * shown the wrong one half the time. The focus-dependent keys share the
 * neutral `keys` slate, since they aren't an action to go find.
 */
const KEY_FACE: Record<string, { icon: ReactNode; color: string }> = {
  Help: { icon: <HelpOutlineIcon />, color: POS_ACTION_TINTS.shortcuts },
  'Search products': { icon: <SearchIcon />, color: POS_ACTION_TINTS.search },
  Customer: { icon: <PersonAddAlt1OutlinedIcon />, color: POS_ACTION_TINTS.customer },
  Bagger: { icon: <Inventory2OutlinedIcon />, color: POS_ACTION_TINTS.bagger },
  Discount: { icon: <SellOutlinedIcon />, color: POS_ACTION_TINTS.discount },
  Hold: { icon: <PauseCircleOutlineIcon />, color: POS_ACTION_TINTS.hold },
  'Void Item': { icon: <BlockOutlinedIcon />, color: POS_ACTION_TINTS.voidItem },
  'Reprint receipt': { icon: <ReceiptLongOutlinedIcon />, color: POS_ACTION_TINTS.reprint },
  Return: { icon: <AssignmentReturnOutlinedIcon />, color: POS_ACTION_TINTS.return },
  'Cancel Sale': { icon: <CancelOutlinedIcon />, color: POS_ACTION_TINTS.cancel },
  'Select cart line': { icon: <ShoppingCartOutlinedIcon />, color: POS_ACTION_TINTS.cart },
  Pay: { icon: <CreditCardOutlinedIcon />, color: POS_ACTION_TINTS.pay },
  'Browse products': { icon: <KeyboardArrowDownIcon />, color: POS_ACTION_TINTS.keys },
  'Move between products': { icon: <OpenWithOutlinedIcon />, color: POS_ACTION_TINTS.keys },
  'Add to cart': { icon: <AddShoppingCartOutlinedIcon />, color: POS_ACTION_TINTS.keys },
  'Back to search': { icon: <KeyboardReturnOutlinedIcon />, color: POS_ACTION_TINTS.keys },
  'Add a quantity': { icon: <TouchAppOutlinedIcon />, color: POS_ACTION_TINTS.keys },
  'Void selected line': { icon: <DeleteOutlineOutlinedIcon />, color: POS_ACTION_TINTS.voidItem },
};

/**
 * What each control does and the key that reaches it. Rendered from the
 * same POS_SHORTCUTS list the handler binds, so this can't quietly fall out
 * of date the way the old hand-written legend did.
 *
 * Laid out the way DiscountDialog lays out its type picker, and for the
 * same reason: sixteen rows in one column ran well past the bottom of a
 * till screen, so the one thing a cashier opened this to do — find their
 * key — meant scrolling a list to hunt for it. Two columns of short,
 * headed groups, each row an icon-chipped card, puts the whole set on
 * screen at once.
 *
 * The keys are shown here even on a touch device, where the on-screen
 * badges are hidden: a tablet may well have a keyboard attached, and unlike
 * a badge crowding a button, a line in a dialog someone deliberately opened
 * costs nothing.
 */
export function PosHelpDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      sx={{ ...(IS_TOUCH && { '& .MuiDialog-container': { alignItems: 'flex-start', pt: { xs: 2, sm: 4 } } }) }}
      slotProps={{
        paper: {
          sx: {
            // Divided by --pos-zoom, not a bare dvh: the POS scales itself
            // with CSS `zoom` (usePosZoom) and viewport units resolve
            // BEFORE that scaling, so a plain 94dvh caps the dialog at
            // 94% × zoom of the real screen — clipping the list while
            // leaving visible dead space beneath it. Same fix as
            // DiscountDialog and AddQuantityDialog.
            maxHeight: 'calc(94dvh / var(--pos-zoom, 1))',
            m: 2,
          },
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, py: 1.5 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography component="span" sx={{ fontWeight: 700, fontSize: 18 }}>
            Controls &amp; shortcuts
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Every key is also printed on the button it triggers
          </Typography>
        </Box>
        <IconButton onClick={onClose} aria-label="Close" sx={{ flexShrink: 0 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 1.5 }}>
        {/* Full-width, ahead of the two columns rather than tucked under
            the shorter one at the bottom — scanning is how most items
            reach the cart at all, so a cashier who opened this dialog to
            check that behaviour shouldn't have to scroll past sixteen
            keyboard rows to find it. */}
        <Alert severity="info" icon={false} sx={{ py: 1, mb: 1.5, bgcolor: `${POS_ACCENT}0f` }}>
          <Typography variant="caption" sx={{ display: 'block' }}>
            <Box component="span" sx={{ fontWeight: 700 }}>
              Scanning:
            </Box>{' '}
            a barcode scanner types into the search box and presses Enter — an exact barcode or SKU match is added to the cart
            straight away. Prefix a quantity to add several at once, e.g.{' '}
            <Box component="span" sx={{ fontWeight: 700 }}>
              5*4800000000011
            </Box>
            .
          </Typography>
        </Alert>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={{ xs: 1.5, md: 2 }} sx={{ alignItems: 'flex-start' }}>
          {GROUP_COLUMNS.map((columnGroups, columnIndex) => (
            <Stack key={columnIndex} spacing={1.5} sx={{ flex: 1, minWidth: 0, width: '100%' }}>
              {columnGroups.map((group) => (
                <Box key={group}>
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 700,
                      color: 'text.secondary',
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                      display: 'block',
                      mb: 0.75,
                      px: 0.5,
                    }}
                  >
                    {GROUP_LABELS[group]}
                  </Typography>

                  <Stack spacing={1}>
                    {POS_SHORTCUTS.filter((s) => s.group === group).map((s) => {
                      const face = KEY_FACE[s.label];
                      return (
                        <Stack
                          key={`${s.key}-${s.label}`}
                          direction="row"
                          spacing={1.5}
                          sx={{
                            alignItems: 'flex-start',
                            px: 1.5,
                            // 8px rather than the 10px this started at: the
                            // last two rows of the taller column fell a
                            // dozen pixels past the fold at 10, and buying
                            // them back here costs less than shrinking the
                            // type or the chips would.
                            py: 1,
                            borderRadius: 2,
                            border: '1px solid',
                            borderColor: 'divider',
                          }}
                        >
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: 36,
                              height: 36,
                              borderRadius: 2,
                              flexShrink: 0,
                              bgcolor: `${face.color}1f`,
                              color: face.color,
                              '& .MuiSvgIcon-root': { fontSize: 20 },
                            }}
                          >
                            {face.icon}
                          </Box>

                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
                              {s.label}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.35 }}>
                              {s.detail}
                            </Typography>
                          </Box>

                          {/* The keycap trails the row where DiscountDialog
                              puts its chevron — it's the thing being looked
                              up, so it sits on the same right edge down the
                              whole column rather than in front of text of
                              varying length. */}
                          <Box
                            component="kbd"
                            sx={{
                              flexShrink: 0,
                              alignSelf: 'center',
                              whiteSpace: 'nowrap',
                              fontFamily: 'inherit',
                              fontSize: 11,
                              fontWeight: 700,
                              px: 0.75,
                              py: 0.4,
                              borderRadius: 1,
                              border: '1px solid',
                              borderColor: 'divider',
                              bgcolor: 'action.hover',
                              color: 'text.secondary',
                            }}
                          >
                            {s.key}
                          </Box>
                        </Stack>
                      );
                    })}
                  </Stack>
                </Box>
              ))}

            </Stack>
          ))}
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
