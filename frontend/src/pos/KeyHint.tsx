import Box from '@mui/material/Box';

/**
 * The keyboard shortcut for a control, shown on the control itself rather
 * than in a legend along the bottom of the screen. A cashier learning
 * "F9 cancels" reads it where the cancelling happens, and the row of hints
 * that used to restate all of them can go.
 *
 * Hidden below md for the same reason StatusBar's strip was: a touchscreen
 * has no F-keys, so on a phone or tablet these badges are dead pixels on
 * buttons that are already tight for room.
 */
export function KeyHint({ label, onAccent = false }: { label: string; onAccent?: boolean }) {
  return (
    <Box
      component="kbd"
      sx={{
        display: { xs: 'none', md: 'inline' },
        ml: 0.75,
        // No border, no background, no chip. These sit inside buttons that
        // already carry an outline (or a solid fill), and a bordered badge
        // in there read as a box inside a box — the busiest thing in the
        // row, for its least important content. Weight and opacity carry
        // it instead: present when looked for, ignorable when not.
        color: 'inherit',
        opacity: onAccent ? 0.75 : 0.5,
        fontFamily: 'inherit',
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '0.02em',
      }}
    >
      {label}
    </Box>
  );
}
