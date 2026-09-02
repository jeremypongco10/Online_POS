import Box from '@mui/material/Box';

/**
 * The keyboard shortcut for a control, shown on the control itself rather
 * than in a legend along the bottom of the screen. A cashier learning
 * "F9 cancels" reads it where the cancelling happens, and the row of hints
 * that used to restate all of them can go.
 *
 * Styled as an actual keycap — a small raised pill with its own
 * background and a hairline "pressed edge" shadow along the bottom — not
 * bare inline text with nothing to separate it from the button's own
 * label. Deliberately a fixed light/dark neutral rather than tinted to
 * match each button's own colour: a solid badge in the button's own hue
 * (tried first) read as loud and slightly alarming on the red Cancel Sale
 * button, and inconsistent from one button to the next since every
 * button here carries a different colour.
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
        display: { xs: 'none', md: 'inline-flex' },
        alignItems: 'center',
        justifyContent: 'center',
        ml: 0.75,
        minWidth: 20,
        height: 18,
        px: 0.6,
        borderRadius: 0.75,
        fontFamily: 'inherit',
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: '0.02em',
        lineHeight: 1,
        // Two palettes: a theme-aware neutral keycap for the outlined
        // buttons (Customer/Bagger/Return/Cancel/Hold) — 'action.selected'
        // + 'divider' rather than a hard-coded rgba(0,0,0,…), so it stays
        // visible in dark mode instead of nearly vanishing against an
        // already-dark button — and a white-on-accent one for Pay, whose
        // background is always the solid brand blue regardless of theme.
        ...(onAccent
          ? {
              bgcolor: 'rgba(255,255,255,0.22)',
              color: '#fff',
              boxShadow: 'inset 0 -1.5px 0 rgba(0,0,0,0.18), inset 0 0 0 1px rgba(255,255,255,0.3)',
            }
          : {
              bgcolor: 'action.selected',
              color: 'text.secondary',
              border: '1px solid',
              borderColor: 'divider',
            }),
      }}
    >
      {label}
    </Box>
  );
}
