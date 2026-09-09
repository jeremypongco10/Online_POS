import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { POS_HEADER_BG } from './format';

interface Props {
  /** The account avatar/menu — composed by PosScreen, which owns the ~13 props AccountMenu needs. */
  actions?: ReactNode;
  /**
   * The store this terminal is ringing up on — same name the receipt
   * letterhead and StatusBar's account menu already show. Optional only
   * for the instant before the stores list has loaded; every POS user
   * resolves to one by then (see PosScreen's assignedStore/selectedStore).
   */
  storeName?: string | null;
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
 * The dark top bar — the search field (mounted here via portal; see
 * searchSlotRef) and the account menu.
 * Deliberately a fixed dark navy rather than following the app's own
 * light/dark theme toggle, so the icon colours and the search pill's own
 * background are forced to match it instead of to theme.palette — the
 * same reasoning ReceiptPanel forces its own light scheme regardless of
 * the app-wide setting.
 *
 * Connectivity used to sit here too, as a bare dot beside the account
 * menu. Moved into ReceiptPanel's own footer instead, alongside the
 * cashier/terminal/time line it already carries — connectivity, like
 * those, is session/receipt-footer information the cashier glances at
 * rather than something this bar's own controls (search, account) need
 * to compete with.
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
export function PosHeader({ actions, storeName, searchSlotRef }: Props) {
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
      {/* Two-line identity where the logo used to sit: a fixed "POS System"
          title over the store this terminal is actually ringing up on.
          Hidden below sm — on a phone-width till this and the search field
          can't both fit, and the search field is what the cashier's hands
          are actually on all shift. */}
      <Stack sx={{ minWidth: 0, flexShrink: 0, display: { xs: 'none', sm: 'block' } }}>
        <Typography sx={{ fontWeight: 700, fontSize: 15, lineHeight: 1.25, color: '#fff' }} noWrap>
          POS System
        </Typography>
        {storeName && (
          <Typography variant="caption" sx={{ lineHeight: 1.25, color: 'rgba(255,255,255,.62)' }} noWrap>
            {storeName}
          </Typography>
        )}
      </Stack>

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
        {actions}
      </Stack>
    </Stack>
  );
}
