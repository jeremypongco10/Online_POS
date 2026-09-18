import { useEffect, useState, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import { POS_HEADER_BG } from './format';

interface Props {
  /** The account avatar/menu — composed by PosScreen, which owns the ~13 props AccountMenu needs. */
  actions?: ReactNode;
  /** The store this terminal rings up on. Optional only for the instant before the stores list has loaded. */
  storeName?: string | null;
  /**
   * Where ProductSearch's own search field mounts, via a portal. This bar
   * deliberately does NOT own that field's state — the query, the
   * debounce, scanner mode, the Enter/arrow-key handling and the focus
   * juggling all stay in ProductSearch, which is the only place they make
   * sense. A portal moves the DOM without moving any of that, so this bar
   * supplies an anchor and nothing more. Callback refs rather than plain
   * RefObjects because the parent has to know the moment the node exists,
   * to hand it on as a portal target in the same render pass.
   */
  searchSlotRef?: (node: HTMLDivElement | null) => void;
  /** Same arrangement for the Category button and the grid/list toggle, which also live in ProductSearch's state. */
  controlsSlotRef?: (node: HTMLDivElement | null) => void;
}

/**
 * The dark top bar: branding, the product search, the category and view
 * controls, and the store/session identity.
 *
 * A fixed navy rather than a theme surface, on purpose — the whole bar is
 * a constant dark band whatever the app's light/dark setting is, so the
 * controls sitting on it can be coloured against a known background. Same
 * reasoning ReceiptPanel already uses to force its own light scheme.
 *
 * Everything interactive here is portaled in from ProductSearch rather
 * than reimplemented: this component owns layout and nothing else, so
 * there is exactly one search field in the app, with one set of scanner
 * and focus rules, no matter which part of the screen it is painted on.
 */
export function PosHeader({ actions, storeName, searchSlotRef, controlsSlotRef }: Props) {
  // Tracked here rather than threaded down from PosScreen: navigator.onLine
  // is a browser fact, not session state, and nothing above this bar has
  // any use for it. Mirrors ReceiptPanel's own ConnectionStatus, which
  // reports the same fact in the same way for the receipt letterhead.
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
    <Stack
      direction="row"
      sx={{
        alignItems: 'center',
        flexShrink: 0,
        gap: { xs: 1.5, md: 2.5 },
        px: { xs: 1.5, md: 2.5 },
        py: 1.25,
        bgcolor: POS_HEADER_BG,
        // Cast downward only — nothing sits above this bar to receive a
        // shadow, and without the stacking context the grid scrolling
        // beneath would paint over it instead of under it.
        boxShadow: '0 6px 16px -10px rgba(16, 24, 40, 0.45)',
        position: 'relative',
        zIndex: 1,
      }}
    >
      {/* Branding. Hidden below md: on a phone the search field is the
          only thing on this bar worth the width, and a logo would take
          most of what's left. */}
      <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', flexShrink: 0, display: { xs: 'none', md: 'flex' } }}>
        <ShoppingCartIcon sx={{ color: '#fff', fontSize: 30 }} />
        <Box sx={{ lineHeight: 1 }}>
          <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: 19, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            Execute IT
          </Typography>
          <Typography sx={{ color: 'rgba(255,255,255,0.55)', fontWeight: 700, fontSize: 9.5, letterSpacing: '0.18em' }}>
            POS SYSTEM
          </Typography>
        </Box>
      </Stack>

      {/* The search field portals in here. minWidth:0 so it can give up
          width to the fixed-size items either side rather than pushing
          them off the bar. */}
      <Box ref={searchSlotRef} sx={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center' }} />

      {/* Category button + grid/list toggle portal in here. */}
      <Box ref={controlsSlotRef} sx={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 1.25 }} />

      {/* Store identity and connectivity. The one thing on this bar that
          isn't a control — a cashier confirms which branch and that the
          terminal is online, then stops looking at it. */}
      {storeName && (
        <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', flexShrink: 0, display: { xs: 'none', lg: 'flex' } }}>
          <StorefrontOutlinedIcon sx={{ color: 'rgba(255,255,255,0.7)', fontSize: 26 }} />
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 14.5, lineHeight: 1.2 }} noWrap>
              {storeName}
            </Typography>
            <Stack direction="row" spacing={0.6} sx={{ alignItems: 'center' }}>
              <Box
                sx={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  flexShrink: 0,
                  bgcolor: online ? '#22c55e' : '#ef4444',
                }}
              />
              <Typography sx={{ color: online ? 'rgba(255,255,255,0.65)' : '#fca5a5', fontSize: 11.5, fontWeight: 600 }}>
                {online ? 'Online' : 'Offline'}
              </Typography>
            </Stack>
          </Box>
        </Stack>
      )}

      {actions && <Box sx={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>{actions}</Box>}
    </Stack>
  );
}
