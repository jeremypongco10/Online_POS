import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  cssVariables: { colorSchemeSelector: 'class' },
  colorSchemes: {
    light: {
      palette: {
        primary: { main: '#4f46e5', light: '#818cf8', dark: '#4338ca', contrastText: '#ffffff' },
        error: { main: '#dc2626' },
        success: { main: '#10b981' },
        warning: { main: '#b45309' },
        background: { default: '#f6f7fb', paper: '#ffffff' },
        text: { primary: '#171923', secondary: '#6b7280' },
        divider: '#e4e7ef',
      },
    },
    dark: {
      palette: {
        primary: { main: '#818cf8', light: '#9ca3f9', dark: '#4f46e5', contrastText: '#0b0c14' },
        error: { main: '#f87171' },
        success: { main: '#34d399' },
        warning: { main: '#fbbf24' },
        background: { default: '#101116', paper: '#1a1c24' },
        text: { primary: '#edeef2', secondary: '#9aa1b1' },
        divider: '#2a2d38',
      },
    },
  },
  shape: {
    borderRadius: 6,
  },
  typography: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    h4: { fontWeight: 700, letterSpacing: '-0.02em' },
    h5: { fontWeight: 700, letterSpacing: '-0.015em' },
    h6: { fontWeight: 700, letterSpacing: '-0.01em' },
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 6,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
        outlined: {
          // Hairline border stays the primary cue; a near-invisible shadow
          // underneath is just enough to lift a card off the page background
          // without reintroducing the heavier drop-shadow look this was
          // deliberately moved away from.
          boxShadow: '0 1px 2px rgba(16, 24, 40, 0.04)',
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        size: 'small',
      },
    },
    // Labels sit as a plain line above the field, not overlapping the
    // border — MUI's default puts the label inside the box at rest and
    // slides it onto the border line (with a notch cut for it) once
    // shrunk, which still reads as a fancier placeholder. Taking the
    // label out of that absolute-positioned overlay and back into normal
    // document flow (paired with removing the border's notch below)
    // gives a fully separate label-above-box layout instead.
    MuiInputLabel: {
      defaultProps: {
        shrink: true,
      },
      styleOverrides: {
        root: {
          position: 'relative',
          transform: 'none',
          marginBottom: 4,
          fontSize: '0.8125rem',
          fontWeight: 600,
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
        notchedOutline: {
          // No label ever sits on the border line anymore, so the notch
          // that would otherwise leave a gap for it is never needed.
          '& legend': {
            maxWidth: '0px !important',
          },
        },
      },
    },
    MuiBackdrop: {
      styleOverrides: {
        root: {
          backdropFilter: 'blur(2px)',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          padding: '8px 16px',
        },
        head: ({ theme }) => ({
          fontSize: 12.5,
          fontWeight: 600,
          color: theme.palette.text.secondary,
          backgroundColor: theme.palette.action.hover,
        }),
        sizeSmall: {
          padding: '6px 12px',
          '&:first-of-type': { paddingLeft: 16 },
          '&:last-of-type': { paddingRight: 16 },
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          transition: 'background-color 0.15s ease',
        },
      },
    },
    MuiTableSortLabel: {
      styleOverrides: {
        root: {
          '&:hover': { color: 'inherit' },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        // Soft tinted badge (bg = a light wash of the color, text = the
        // color itself) instead of MUI's default solid-fill chip — reads
        // calmer next to the rest of the app's muted-surface look, and
        // color-mix() keeps it correct in both schemes without any
        // mode-branching (see Login.tsx's background gradient for the
        // same pattern already used in this codebase).
        root: ({ ownerState }) => {
          const color = ownerState.color && ownerState.color !== 'default' ? ownerState.color : null;
          return {
            fontWeight: 700,
            fontSize: 11,
            border: 0,
            ...(color
              ? {
                  backgroundColor: `color-mix(in srgb, var(--mui-palette-${color}-main) 16%, transparent)`,
                  color: `var(--mui-palette-${color}-main)`,
                }
              : {
                  backgroundColor: 'var(--mui-palette-action-selected)',
                  color: 'var(--mui-palette-text-secondary)',
                }),
          };
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 14,
          boxShadow: '0 24px 48px -12px rgba(16, 24, 40, 0.25), 0 4px 16px rgba(16, 24, 40, 0.1)',
        },
      },
    },
  },
});
