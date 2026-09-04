import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import PersonOutlineIcon from '@mui/icons-material/PersonOutlineOutlined';
import { POS_HEADER_BG } from './format';

interface Props {
  cashierName: string;
  storeName: string | null;
  registerName: string | null;
}

/**
 * Ambient state — which store/terminal this session is ringing up on,
 * whether we're connected, and the time — plus the keyboard-hint strip.
 * All of it is glanceable rather than actionable, which is why it lives
 * down here instead of in PosHeader competing with the product grid.
 *
 * Scoped to the product column only, not the full width of the screen —
 * PosScreen renders this as the last child of that column rather than as
 * a sibling below the whole two-column row, so the cart column beside it
 * runs the full height of the screen instead of being cut short by a
 * full-width bar underneath it.
 *
 * Same fixed dark navy as PosHeader, for the same reason: this is the
 * other bar bookending the product column, and the two should read as a
 * matched pair rather than one dark and one following the app's own
 * light/dark theme toggle.
 *
 * No backend heartbeat exists — Online reflects only navigator.onLine.
 */
export function StatusBar({ cashierName, storeName, registerName }: Props) {
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

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <Stack
      direction="row"
      sx={{
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        px: { xs: 2, md: 3 },
        py: 0.75,
        bgcolor: POS_HEADER_BG,
        columnGap: 2,
        // PosHeader's counterpart at the other end of this column — same
        // navy-bar-against-white-grid seam, so the same treatment, just
        // cast upward onto the grid above instead of down onto it.
        boxShadow: '0 -6px 16px -10px rgba(16, 24, 40, 0.35)',
        position: 'relative',
        zIndex: 1,
      }}
    >
      {/* Pinned to the far-left edge, on its own — connectivity is the one
          thing here worth a glance from across the room, so it doesn't sit
          buried at the end of the store/time cluster on the right. */}
      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', flexShrink: 0 }}>
        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: online ? 'success.main' : 'error.main' }} />
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
          {online ? 'Online' : 'Offline'}
        </Typography>
      </Stack>

      {/* The shortcut legend that used to fill this side is gone: every key
          is now shown on the control it triggers (see KeyHint), so listing
          them again down here was duplication taking up the row. */}
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center', flexShrink: 0 }}>
        {/* Moved here from ReceiptPanel's own header — this is the app's
            actual footer, so cashier identity sits with the rest of the
            ambient session state (store, terminal, connectivity) rather
            than leading a separate card of its own. */}
        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', minWidth: 0 }}>
          <PersonOutlineIcon sx={{ fontSize: 14, color: 'rgba(255,255,255,0.7)' }} />
          <Typography variant="caption" sx={{ fontWeight: 600, color: '#fff' }} noWrap>
            {cashierName}
          </Typography>
        </Stack>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.35)' }}>
          ·
        </Typography>
        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', minWidth: 0 }}>
          <Typography variant="caption" sx={{ fontWeight: 600, color: '#fff' }} noWrap>
            {storeName ?? '—'}
          </Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.35)' }}>
            ·
          </Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }} noWrap>
            {registerName ?? '—'}
          </Typography>
        </Stack>

        {/* tabular-nums keeps every digit glyph the same width — without it, e.g. "1" vs "8" render at different
            widths in a proportional font, so this box's width (and the shortcut row beside it) shifts every
            second as the clock ticks. */}
        <Typography variant="caption" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: 'rgba(255,255,255,0.7)' }}>
          {now.toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'medium' })}
        </Typography>
      </Stack>
    </Stack>
  );
}
