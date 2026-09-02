import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

interface Props {
  storeName: string | null;
  registerName: string | null;
}

/**
 * Ambient state — which store/terminal this session is ringing up on,
 * whether we're connected, and the time — plus the keyboard-hint strip.
 * All of it is glanceable rather than actionable, which is why it lives
 * down here instead of in PosHeader competing with the product grid.
 *
 * No backend heartbeat exists — Online reflects only navigator.onLine.
 */
export function StatusBar({ storeName, registerName }: Props) {
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
        borderTop: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        columnGap: 2,
      }}
    >
      {/* The shortcut legend that used to fill this side is gone: every key
          is now shown on the control it triggers (see KeyHint), so listing
          them again down here was duplication taking up the row. */}
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center', flexShrink: 0, ml: 'auto' }}>
        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', minWidth: 0 }}>
          <Typography variant="caption" sx={{ fontWeight: 600 }} noWrap>
            {storeName ?? '—'}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.disabled' }}>
            ·
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            {registerName ?? '—'}
          </Typography>
        </Stack>

        {/* tabular-nums keeps every digit glyph the same width — without it, e.g. "1" vs "8" render at different
            widths in a proportional font, so this box's width (and the shortcut row beside it) shifts every
            second as the clock ticks. */}
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
          {now.toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'medium' })}
        </Typography>

        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: online ? 'success.main' : 'error.main' }} />
          <Typography variant="caption" color="text.secondary">
            {online ? 'Online' : 'Offline'}
          </Typography>
        </Stack>
      </Stack>
    </Stack>
  );
}
