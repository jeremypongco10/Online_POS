import Box from '@mui/material/Box';
import { MOVEMENT_META, STOCK_STATUS_META, tint, type MovementType, type StockStatus } from './inventoryUtils';

export function DotBadge({ css, label, minWidth = 92 }: { css: string; label: string; minWidth?: number }) {
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
        minWidth,
        px: 1.25,
        py: 0.375,
        borderRadius: 999,
        fontSize: 12.5,
        fontWeight: 600,
        lineHeight: 1.4,
        whiteSpace: 'nowrap',
        color: css,
        bgcolor: tint(css, 12),
        border: '1px solid',
        borderColor: tint(css, 28),
      }}
    >
      <Box component="span" sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: css, flexShrink: 0 }} />
      {label}
    </Box>
  );
}

/** Same dot-and-label style as the purchase order status badge, so the two sections read alike. */
export function StockStatusBadge({ status }: { status: StockStatus }) {
  const meta = STOCK_STATUS_META[status];
  return <DotBadge css={meta.css} label={meta.label} minWidth={104} />;
}

export function MovementTypeBadge({ type }: { type: MovementType }) {
  const meta = MOVEMENT_META[type] ?? { label: type, css: 'var(--mui-palette-text-secondary)' };
  return <DotBadge css={meta.css} label={meta.label} minWidth={106} />;
}
