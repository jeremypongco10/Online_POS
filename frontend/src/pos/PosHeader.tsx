import { useState, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import HelpOutlineIcon from '@mui/icons-material/HelpOutlineOutlined';
import type { CashSession } from '../api/types';
import { OverflowMenu } from './OverflowMenu';
import { PosHelpDialog } from './PosHelpDialog';
import { POS_HEADER_BG } from './format';
import logoDark from '../assets/logo-dark.png';

interface Props {
  cashSession: CashSession | null;
  /** The account avatar/menu — composed by PosScreen, which owns the ~13 props AccountMenu needs. */
  actions?: ReactNode;
  /**
   * Where ProductSearch's search field actually mounts, via a portal —
   * this bar doesn't own the field's state (query, scanner mode, the
   * debounced lookup, all of it stays in ProductSearch), it only supplies
   * the DOM anchor for it to render into. A callback ref rather than a
   * plain RefObject because the parent needs to know the moment this Box
   * exists, to pass its node on as the portal target for the same render
   * pass ProductSearch reads it.
   */
  searchSlotRef?: (node: HTMLDivElement | null) => void;
}

/**
 * The dark top bar — brand, the search field (mounted here via portal;
 * see searchSlotRef), and the account/cash-movement controls. Deliberately
 * a fixed dark navy rather than following the app's own light/dark theme
 * toggle, so the logo, icon colours, and the search pill's own background
 * are all forced to match it instead of to theme.palette — the same
 * reasoning ReceiptPanel forces its own light scheme regardless of the
 * app-wide setting.
 */
export function PosHeader({ cashSession, actions, searchSlotRef }: Props) {
  const [overflowAnchor, setOverflowAnchor] = useState<HTMLElement | null>(null);
  // Owned here rather than in PosScreen so the header stays self-contained;
  // F1 reaches it by DOM-clicking the button below, the same way the other
  // shortcuts reach controls whose state isn't lifted.
  const [helpOpen, setHelpOpen] = useState(false);

  // Fixed light-on-dark rather than 'text.secondary'/'inherit' — this bar
  // no longer follows the app's theme, so a theme-token colour would
  // occasionally resolve to a dark grey that vanishes against navy.
  const iconSx = { color: 'rgba(255,255,255,0.85)', '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.08)' } };

  return (
    <Stack
      direction="row"
      spacing={2}
      sx={{
        alignItems: 'center',
        flexShrink: 0,
        px: { xs: 2, md: 3 },
        py: 1.25,
        bgcolor: POS_HEADER_BG,
      }}
    >
      {/* Always the light-on-dark logo mark — this bar doesn't switch with
          the app's own theme toggle (see the component doc above), so
          there's no "dark mode" variant of the logo to swap to here. */}
      <Box component="img" src={logoDark} alt="Execute IT POS System" sx={{ height: 24, width: 'auto', display: 'block', flexShrink: 0 }} />

      {/* Portal target for ProductSearch's search field — see searchSlotRef.
          Sized here rather than left to the portaled content's own width,
          so the header's layout (logo | search | icons) is stable even
          before that content exists on the very first paint.

          It grows into the run of the bar between the logo and the icons —
          the spacer that used to sit after it split the leftover space in
          half, capping the field well short of what was available. The
          maxWidth is the ceiling on a wide screen: at 1200 the field ran
          the entire bar, which left the header reading as one long input
          with a logo stuck on the front, so it stops a clear gap short of
          the icons instead.

          Deliberately a fixed width rather than one that expands on click.
          This field keeps focus almost permanently, so a scanner always
          has somewhere to type (see ProductSearch's blur handler), and an
          expand-on-focus field would therefore sit expanded all shift —
          collapsing and re-expanding on every click elsewhere, since each
          one blurs the field a frame before focus is pulled back. */}
      <Box ref={searchSlotRef} sx={{ flex: 1, maxWidth: 900, minWidth: 0 }} />

      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexShrink: 0 }}>
        <Tooltip title="Controls & shortcuts (F1)">
          <IconButton id="pos-help-button" size="small" onClick={() => setHelpOpen(true)} aria-label="Controls and shortcuts" sx={iconSx}>
            <HelpOutlineIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Tooltip title="Cash movements">
          <IconButton size="small" onClick={(e) => setOverflowAnchor(e.currentTarget)} aria-label="Cash movements" sx={iconSx}>
            <MoreVertIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        {actions}
      </Stack>

      <OverflowMenu anchorEl={overflowAnchor} onClose={() => setOverflowAnchor(null)} cashSession={cashSession} />
      <PosHelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} />
    </Stack>
  );
}
