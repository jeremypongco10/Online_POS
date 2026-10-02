import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  cssVariables: { colorSchemeSelector: 'class' },
  colorSchemes: {
    light: {
      palette: {
        primary: { main: '#2563eb', light: '#60a5fa', dark: '#1d4ed8', contrastText: '#ffffff' },
        error: { main: '#dc2626' },
        success: { main: '#10b981' },
        warning: { main: '#b45309' },
        background: { default: '#f3f6fb', paper: '#ffffff' },
        text: { primary: '#142033', secondary: '#64748b' },
        divider: '#dfe6ef',
      },
    },
    dark: {
      palette: {
        primary: { main: '#60a5fa', light: '#93c5fd', dark: '#2563eb', contrastText: '#071426' },
        error: { main: '#f87171' },
        success: { main: '#34d399' },
        warning: { main: '#fbbf24' },
        background: { default: '#0b1220', paper: '#121c2d' },
        text: { primary: '#f1f5f9', secondary: '#94a3b8' },
        divider: '#25324a',
      },
    },
  },
  // Every unitless `borderRadius: N` used in an sx prop throughout the app
  // (cards, tables, chips-in-a-box, store cards, etc.) multiplies against
  // this one value — trimming it here scales all of them down together
  // instead of hunting down each component's own hardcoded radius.
  shape: {
    borderRadius: 10,
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
    // Every dropdown list (SearchableSelect, the supplier/product pickers,
    // filters). MuiPaper below drops MUI's dark-mode elevation overlay, so
    // without its own surface a dropdown opened over a dialog came out the
    // exact colour of that dialog, with nothing marking where it ended.
    // A bordered, slightly lifted panel, clear group headings, and rounded
    // option highlights fix that in both themes.
    MuiAutocomplete: {
      styleOverrides: {
        paper: ({ theme }) => ({
          marginTop: 6,
          borderRadius: 12,
          border: '1px solid',
          borderColor: theme.vars ? theme.vars.palette.divider : theme.palette.divider,
          backgroundColor: '#ffffff',
          boxShadow: '0 12px 32px rgba(15, 23, 42, 0.14), 0 2px 6px rgba(15, 23, 42, 0.06)',
          ...theme.applyStyles('dark', {
            backgroundColor: '#1a2538',
            borderColor: '#2c3a52',
            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.55), 0 2px 8px rgba(0, 0, 0, 0.35)',
          }),
        }),
        listbox: {
          padding: 6,
        },
        option: ({ theme }) => ({
          borderRadius: 8,
          minHeight: 40,
          '&.Mui-focused': {
            backgroundColor: theme.vars ? theme.vars.palette.action.hover : theme.palette.action.hover,
          },
          '&[aria-selected="true"], &[aria-selected="true"].Mui-focused': {
            backgroundColor: 'color-mix(in srgb, var(--mui-palette-primary-main) 14%, transparent)',
          },
        }),
        groupLabel: ({ theme }) => ({
          // Sticky, so it needs the panel's own colour behind it or rows
          // scroll visibly underneath the heading.
          backgroundColor: '#ffffff',
          ...theme.applyStyles('dark', { backgroundColor: '#1a2538' }),
          color: theme.vars ? theme.vars.palette.text.secondary : theme.palette.text.secondary,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.07em',
          textTransform: 'uppercase',
          lineHeight: '30px',
          paddingLeft: 12,
          top: -6,
        }),
        groupUl: {
          '& .MuiAutocomplete-option': { paddingLeft: 12 },
        },
        noOptions: { fontSize: 14 },
        loading: { fontSize: 14 },
      },
    },
    // Plain select menus (TextField select) and popup menus (account, Export,
    // Print) — the same surface as MuiAutocomplete above, so every list that
    // drops down looks like one family in both themes.
    MuiMenu: {
      styleOverrides: {
        paper: ({ theme }) => ({
          marginTop: 4,
          borderRadius: 12,
          border: '1px solid',
          borderColor: theme.vars ? theme.vars.palette.divider : theme.palette.divider,
          backgroundColor: '#ffffff',
          boxShadow: '0 12px 32px rgba(15, 23, 42, 0.14), 0 2px 6px rgba(15, 23, 42, 0.06)',
          '& .MuiListSubheader-root': {
            backgroundColor: '#ffffff',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.07em',
            textTransform: 'uppercase',
          },
          ...theme.applyStyles('dark', {
            backgroundColor: '#1a2538',
            borderColor: '#2c3a52',
            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.55), 0 2px 8px rgba(0, 0, 0, 0.35)',
            '& .MuiListSubheader-root': { backgroundColor: '#1a2538' },
          }),
        }),
        list: {
          padding: 6,
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          '&.Mui-selected': {
            backgroundColor: 'color-mix(in srgb, var(--mui-palette-primary-main) 14%, transparent)',
          },
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        // A tooltip is meant purely as a label, never a surface — but MUI's
        // popper accepts pointer events by default, so whenever one has
        // nowhere to render but overlapping the very element it describes
        // (a control sitting close to the edge of the viewport, which the
        // Actions row often does), a click landing on that overlap hits the
        // tooltip's own div instead of the button underneath and silently
        // does nothing. Reported against the Actions row's Cancel Sale
        // button specifically, but the same MUI default applies to every
        // tooltip in the app, so this is fixed once, here, rather than
        // patched per instance. `pointer-events: none` only affects clicks
        // passing through the popper to what's beneath it — MUI still
        // shows/hides the tooltip from hover on the wrapped element itself,
        // not the popper, so nothing about *when* a tooltip appears changes.
        popper: {
          pointerEvents: 'none',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
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
          boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
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
          borderRadius: 10,
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
    // Zebra striping on every table body, so the eye can follow a wide row
    // across. Mixed from text.primary rather than a fixed grey, so the same
    // rule gives a faint grey band on white and a faint lift on dark navy.
    // Hover and selected are restated here because this selector would
    // otherwise outrank MUI's own and hide them on the striped rows.
    MuiTableBody: {
      styleOverrides: {
        root: {
          '& > .MuiTableRow-root:nth-of-type(even):not(.Mui-selected)': {
            backgroundColor: 'color-mix(in srgb, var(--mui-palette-text-primary) 3.5%, transparent)',
          },
          '& > .MuiTableRow-hover:hover:not(.Mui-selected)': {
            backgroundColor: 'color-mix(in srgb, var(--mui-palette-primary-main) 7%, transparent)',
          },
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
          borderRadius: 16,
          boxShadow: '0 24px 48px -12px rgba(16, 24, 40, 0.25), 0 4px 16px rgba(16, 24, 40, 0.1)',
        },
      },
    },
    // MUI's default alert tint is computed against a "typical" dark
    // background (~#121212) — against this theme's much darker
    // background.default (#101116) it comes out nearly indistinguishable
    // from the page, reading as loose colored text rather than a card.
    // Same color-mix() approach as MuiChip above: mix the severity color
    // into background.paper (not the page background) for real contrast
    // in both schemes, plus a tinted border since the fill alone is still
    // fairly subtle by design.
    MuiAlert: {
      styleOverrides: {
        root: ({ ownerState }) => {
          const severity = ownerState.severity ?? 'info';
          return {
            backgroundColor: `color-mix(in srgb, var(--mui-palette-${severity}-main) 12%, var(--mui-palette-background-paper))`,
            border: '1px solid',
            borderColor: `color-mix(in srgb, var(--mui-palette-${severity}-main) 32%, transparent)`,
          };
        },
      },
    },
  },
});
