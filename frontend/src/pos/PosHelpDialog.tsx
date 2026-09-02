import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import CloseIcon from '@mui/icons-material/Close';
import { POS_SHORTCUTS } from './posShortcuts';
import { POS_ACCENT } from './format';

/**
 * What each control does and the key that reaches it. Rendered from the
 * same POS_SHORTCUTS list the handler binds, so this can't quietly fall out
 * of date the way the old hand-written legend did.
 *
 * The keys are shown here even on a touch device, where the on-screen
 * badges are hidden: a tablet may well have a keyboard attached, and unlike
 * a badge crowding a button, a line in a dialog someone deliberately opened
 * costs nothing.
 */
export function PosHelpDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pr: 6, fontWeight: 700 }}>
        Controls &amp; shortcuts
        <IconButton onClick={onClose} aria-label="Close" sx={{ position: 'absolute', right: 8, top: 8, color: 'text.secondary' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Stack divider={<Divider flexItem />}>
          {POS_SHORTCUTS.map((s) => (
            <Stack key={`${s.key}-${s.label}`} direction="row" spacing={2} sx={{ py: 1.25, alignItems: 'flex-start' }}>
              {/* Fixed-width key column so every description starts on the
                  same line, rather than stepping in and out with the width
                  of "F2" versus "Esc". */}
              <Box
                component="kbd"
                sx={{
                  flexShrink: 0,
                  // Wide enough for the "↑ ↓ ← →" row; every other key is
                  // shorter, and the fixed width is what keeps the
                  // descriptions on one left edge.
                  width: 72,
                  whiteSpace: 'nowrap',
                  textAlign: 'center',
                  fontFamily: 'inherit',
                  fontSize: 11,
                  fontWeight: 700,
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
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {s.label}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {s.detail}
                </Typography>
              </Box>
            </Stack>
          ))}
        </Stack>

        <Box sx={{ mt: 2, p: 1.5, borderRadius: 1.5, bgcolor: `${POS_ACCENT}0f` }}>
          <Typography variant="body2" color="text.secondary">
            <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>
              Scanning:
            </Box>{' '}
            a barcode scanner types into the search box and presses Enter — an exact barcode or SKU match is added to the cart straight
            away. Prefix a quantity to add several at once, e.g. <Box component="span" sx={{ fontWeight: 700 }}>5*4800000000011</Box>.
          </Typography>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
