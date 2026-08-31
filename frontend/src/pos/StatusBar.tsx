import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useColorScheme } from '@mui/material/styles';
import logoLight from '../assets/logo.png';
import logoDark from '../assets/logo-dark.png';

const SHORTCUTS: Array<[string, string]> = [
  ['F2', 'Search Product'],
  ['F3', 'Add Customer'],
  ['F4', 'Hold Sale'],
  ['F5', 'Pay'],
  ['F6', 'Bagger'],
  ['F7', 'Refund'],
  ['F8', 'Return'],
  ['F9', 'Cancellation'],
];

/** No backend heartbeat exists — Online reflects only navigator.onLine. */
export function StatusBar() {
  const { mode, systemMode } = useColorScheme();
  const resolvedMode = mode === 'system' ? systemMode : mode;
  const logo = resolvedMode === 'dark' ? logoDark : logoLight;

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
        px: { xs: 2, md: 3 },
        py: 0.5,
        borderTop: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        flexWrap: 'wrap',
        rowGap: 0.5,
        columnGap: 2,
      }}
    >
      <Box component="img" src={logo} alt="Execute IT POS System" sx={{ height: 26, width: 'auto', display: 'block' }} />
      {/* F-key hints are meaningless on a touchscreen with no physical keyboard, so this whole row is dropped below md rather than left to wrap awkwardly in the cramped stacked mobile layout. */}
      <Stack
        direction="row"
        spacing={1.5}
        sx={{ display: { xs: 'none', md: 'flex' }, flexWrap: 'wrap', rowGap: 0.5, justifyContent: 'center', flex: 1 }}
        useFlexGap
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
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center', flexShrink: 0 }}>
        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: online ? 'success.main' : 'error.main' }} />
          <Typography variant="caption" color="text.secondary">
            {online ? 'Online' : 'Offline'}
          </Typography>
        </Stack>
        {/* tabular-nums keeps every digit glyph the same width — without it, e.g. "1" vs "8" render at different
            widths in a proportional font, so this box's width (and the centered shortcuts next to it) shifts
            every second as the clock ticks. */}
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
          {now.toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'medium' })}
        </Typography>
      </Stack>
    </Stack>
  );
}
