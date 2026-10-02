import Box from '@mui/material/Box';
import type { CustomerDirectoryRow } from '../api/types';
import { customerActivity } from './customerUtils';

const AVATAR_HUES = [210, 160, 28, 280, 340, 190, 100, 45];

/** Initials on a colour picked from the name, so the same customer always looks the same. */
export function CustomerAvatar({ name, size = 34 }: { name: string; size?: number }) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials = ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase() || '?';
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  const hue = AVATAR_HUES[hash % AVATAR_HUES.length];
  return (
    <Box
      aria-hidden
      sx={(theme) => ({
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: '50%',
        display: 'grid',
        placeItems: 'center',
        fontSize: size * 0.38,
        fontWeight: 800,
        color: `hsl(${hue} 60% 38%)`,
        backgroundColor: `hsl(${hue} 70% 92%)`,
        ...theme.applyStyles('dark', { color: `hsl(${hue} 70% 78%)`, backgroundColor: `hsl(${hue} 35% 22%)` }),
      })}
    >
      {initials}
    </Box>
  );
}

export function CustomerActivityBadge({ customer, lapsedDays }: { customer: CustomerDirectoryRow; lapsedDays: number }) {
  const a = customerActivity(customer, lapsedDays);
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
        px: 1,
        py: 0.25,
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        whiteSpace: 'nowrap',
        color: a.css,
        bgcolor: `color-mix(in srgb, ${a.css} 12%, transparent)`,
      }}
    >
      <Box component="span" sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: a.css }} />
      {a.label}
    </Box>
  );
}
