import Box from '@mui/material/Box';

/** Dot + label, matching the other list pages' status badges. */
export function SupplierStatusBadge({ active }: { active: boolean }) {
  const css = active ? 'var(--mui-palette-success-main)' : 'var(--mui-palette-text-secondary)';
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
        color: css,
        bgcolor: `color-mix(in srgb, ${css} 12%, transparent)`,
      }}
    >
      <Box component="span" sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: css }} />
      {active ? 'Active' : 'Inactive'}
    </Box>
  );
}
