import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

const tint = (css: string, pct: number) => `color-mix(in srgb, ${css} ${pct}%, transparent)`;

/** A figure at the top of a list page — same look as Inventory's and Purchase Orders' cards. */
export function MetricCard({ icon, label, value, caption }: { icon: ReactNode; label: string; value: string; caption?: string }) {
  return (
    <Box sx={{ p: 1.75, borderRadius: '14px', border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', minWidth: 0 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', color: 'text.secondary' }}>
        {icon}
        <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
          {label}
        </Typography>
      </Stack>
      <Typography sx={{ mt: 0.75, fontWeight: 800, fontSize: 24, lineHeight: 1.15, fontVariantNumeric: 'tabular-nums' }} noWrap>
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
        {caption ?? ' '}
      </Typography>
    </Box>
  );
}

/**
 * A card that is also a filter: click to show only those rows, click again
 * to clear. `css` is the accent (a CSS colour or var), so each card can
 * carry its own meaning — green active, amber lapsed, and so on.
 */
export function FilterCard({
  label,
  hint,
  count,
  unit,
  css,
  icon,
  selected,
  onClick,
}: {
  label: string;
  hint: string;
  count: number | null;
  /** What's being counted, under the number ("customers"). */
  unit: string;
  css: string;
  icon: ReactNode;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <ButtonBase
      onClick={onClick}
      aria-pressed={selected}
      sx={{
        display: 'block',
        textAlign: 'left',
        p: 1.75,
        minWidth: 0,
        borderRadius: '14px',
        border: '1.5px solid',
        borderColor: selected ? css : 'divider',
        bgcolor: selected ? tint(css, 8) : 'background.paper',
        transition: 'border-color .15s ease, background-color .15s ease, transform .15s ease',
        '&:hover': { borderColor: tint(css, 55), transform: 'translateY(-1px)' },
        '&.Mui-focusVisible': { borderColor: css },
      }}
    >
      <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
            {label}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.35 }}>
            {hint}
          </Typography>
        </Box>
        <Box sx={{ width: 32, height: 32, flexShrink: 0, borderRadius: '10px', display: 'grid', placeItems: 'center', bgcolor: tint(css, 14), color: css }}>{icon}</Box>
      </Stack>
      <Typography sx={{ mt: 0.75, fontWeight: 800, fontSize: 24, lineHeight: 1.15, fontVariantNumeric: 'tabular-nums' }}>{count ?? '–'}</Typography>
      <Typography variant="caption" color="text.secondary">
        {selected ? 'Showing only these · click to clear' : unit}
      </Typography>
    </ButtonBase>
  );
}
