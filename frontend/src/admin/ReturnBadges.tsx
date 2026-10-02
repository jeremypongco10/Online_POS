import Box from '@mui/material/Box';
import type { SalesReturn } from '../api/types';

const META: Record<SalesReturn['status'], { label: string; css: string }> = {
  completed: { label: 'Refunded', css: 'var(--mui-palette-success-main)' },
  pending: { label: 'Pending', css: 'var(--mui-palette-warning-main)' },
  cancelled: { label: 'Rejected', css: 'var(--mui-palette-text-secondary)' },
};

/** Dot + label, the same quiet badge Inventory uses for stock status. */
export function ReturnStatusBadge({ status }: { status: SalesReturn['status'] }) {
  const meta = META[status] ?? META.pending;
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
        color: meta.css,
        bgcolor: `color-mix(in srgb, ${meta.css} 12%, transparent)`,
      }}
    >
      <Box component="span" sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: meta.css }} />
      {meta.label}
    </Box>
  );
}
