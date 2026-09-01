import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

const SHORTCUTS: Array<[string, string]> = [
  ['F2', 'Search Product'],
  ['F3', 'Add Customer'],
  ['F4', 'Hold Sale'],
  ['F5', 'Pay'],
  ['F6', 'Bagger'],
  ['F7', 'Refund'],
  ['F8', 'Return'],
  ['F9', 'Cancellation'],
  // Handled on the search field itself rather than in
  // useKeyboardShortcuts — see ProductSearch's handleSearchKeyDown.
  ['Esc', 'Clear Search'],
];

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
      {/* F-key hints are meaningless on a touchscreen with no physical
          keyboard, so this row is dropped below md rather than left to
          wrap awkwardly in the cramped stacked mobile layout — the status
          items beside it stay visible at every width. */}
      <Stack
        direction="row"
        spacing={1.5}
        useFlexGap
        sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', flexWrap: 'wrap', rowGap: 0.5, flex: 1 }}
      >
        {SHORTCUTS.map(([key, label]) => (
          <Stack key={key} direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
            <Box
              component="kbd"
              sx={{
                fontSize: 10,
                fontWeight: 700,
                px: 0.6,
                py: 0.1,
                borderRadius: 0.5,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'action.hover',
                color: 'text.secondary',
              }}
            >
              {key}
            </Box>
            <Typography variant="caption" color="text.secondary">
              {label}
            </Typography>
          </Stack>
        ))}
      </Stack>

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
