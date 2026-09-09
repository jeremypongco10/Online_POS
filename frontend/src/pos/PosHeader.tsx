import { useEffect, useState, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { POS_HEADER_BG } from './format';

interface Props {
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
 * Connectivity, kept from the StatusBar footer this bar absorbed — the
 * one thing in that footer that wasn't receipt content (cashier, terminal
 * and the clock all moved to ReceiptPanel's letterhead instead), and the
 * one thing there worth a glance from across the room.
 *
 * Deliberately lopsided: online is the boring, expected state, so it's a
 * bare dot with the wording left to a tooltip; offline is the state a
 * cashier has to act on, so it spells itself out in red. Reflects
 * navigator.onLine only — there is no backend heartbeat, and inventing
 * one here would claim more than the browser actually knows.
 */
function ConnectionStatus() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  return (
    <Tooltip title={online ? 'Online' : 'No connection — sales cannot be completed'}>
      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', flexShrink: 0, px: 0.5 }}>
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            bgcolor: online ? 'success.main' : 'error.main',
            flexShrink: 0,
          }}
        />
        {!online && (
          <Typography variant="caption" sx={{ fontWeight: 700, color: 'error.light' }}>
            Offline
          </Typography>
        )}
      </Stack>
    </Tooltip>
  );
}

/**
 * The dark top bar — the search field (mounted here via portal; see
 * searchSlotRef), connectivity, and the account menu.
 * Deliberately a fixed dark navy rather than following the app's own
 * light/dark theme toggle, so the icon colours and the search pill's own
 * background are forced to match it instead of to theme.palette — the
 * same reasoning ReceiptPanel forces its own light scheme regardless of
 * the app-wide setting.
 *
 * Display zoom used to sit here too. It moved into AccountMenu's
 * preferences: it's set once when a terminal is installed and then
 * essentially never touched (usePosZoom fits the screen on its own), so
 * it had no claim on the bar a cashier looks at hundreds of times a
 * shift.
 *
 * So did cash movements, which used to hang off a "more" button here.
 * They moved to the Back Office's Cash Drawers screen — paying cash out
 * of a drawer is the one drawer operation with no product trail behind
 * it, so it belongs in front of whoever is watching the money rather
 * than one tap from the person holding the drawer.
 */
export function PosHeader({ actions, searchSlotRef }: Props) {
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
        // Same reasoning as ReceiptPanel's own edge shadow: a flat navy
        // bar butting straight against the white grid below it read as a
        // hard cutoff rather than a bar sitting in front of the page.
        // Cast only downward, onto the grid — this bar has no sibling
        // above it to shadow onto.
        boxShadow: '0 6px 16px -10px rgba(16, 24, 40, 0.35)',
        // Shadows don't stack in DOM order by default, so without this the
        // product grid content scrolling underneath would paint over the
        // shadow instead of under it.
        position: 'relative',
        zIndex: 1,
      }}
    >
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
        <ConnectionStatus />
        {actions}
      </Stack>
    </Stack>
  );
}
