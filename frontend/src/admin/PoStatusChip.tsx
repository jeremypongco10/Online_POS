import Box from '@mui/material/Box';
import { PO_STATUS_META, type PoStatus } from './purchaseOrderUtils';

const COLOR: Record<PoStatus, string> = {
  draft: 'var(--mui-palette-warning-main)',
  approved: 'var(--mui-palette-info-main)',
  received: 'var(--mui-palette-success-main)',
  cancelled: 'var(--mui-palette-text-secondary)',
};

/**
 * A soft dot-and-label badge rather than a filled MUI Chip with an icon:
 * in a table column of them, icons and saturated fills turned every row
 * into noise. Fixed min-width so a column of badges lines up.
 */
export function PoStatusChip({ status, size = 'small' }: { status: PoStatus; size?: 'small' | 'medium' }) {
  const color = COLOR[status];
  const large = size === 'medium';
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
        minWidth: large ? 104 : 92,
        px: large ? 1.5 : 1.25,
        py: large ? 0.5 : 0.375,
        borderRadius: 999,
        fontSize: large ? 13.5 : 12.5,
        fontWeight: 600,
        lineHeight: 1.4,
        whiteSpace: 'nowrap',
        color,
        bgcolor: `color-mix(in srgb, ${color} 12%, transparent)`,
        border: '1px solid',
        borderColor: `color-mix(in srgb, ${color} 28%, transparent)`,
      }}
    >
      <Box component="span" sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: color, flexShrink: 0 }} />
      {PO_STATUS_META[status].label}
    </Box>
  );
}
