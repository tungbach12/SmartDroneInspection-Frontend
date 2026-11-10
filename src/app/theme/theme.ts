import { createTheme } from '@mui/material/styles';
import { fontStack, layoutTokens, paletteTokens, statusTokens } from './tokens';

export const theme = createTheme({
  cssVariables: {
    colorSchemeSelector: 'data',
  },
  colorSchemes: {
    light: {
      palette: {
        primary: {
          main: paletteTokens.teal,
          light: paletteTokens.tealLight,
          dark: paletteTokens.tealDark,
          contrastText: '#FFFFFF',
        },
        secondary: {
          main: paletteTokens.harbor,
          light: paletteTokens.harborLight,
          dark: '#09090B',
          contrastText: '#FFFFFF',
        },
        background: {
          default: paletteTokens.paper,
          paper: paletteTokens.white,
        },
        text: {
          primary: paletteTokens.ink,
          secondary: paletteTokens.textSecondary,
        },
        divider: paletteTokens.steel,
        success: { main: statusTokens.success.light },
        warning: { main: statusTokens.warning.light },
        error: { main: statusTokens.error.light },
        info: { main: statusTokens.info.light },
      },
    },
    dark: {
      palette: {
        primary: {
          main: paletteTokens.teal,
          light: paletteTokens.tealLight,
          dark: paletteTokens.tealDark,
          contrastText: '#FFFFFF',
        },
        secondary: {
          main: paletteTokens.darkMuted,
          light: '#D4D4D8',
          dark: '#71717A',
          contrastText: '#09090B',
        },
        background: {
          default: paletteTokens.darkCanvas,
          paper: paletteTokens.darkSurface,
        },
        text: {
          primary: paletteTokens.darkText,
          secondary: paletteTokens.darkMuted,
        },
        divider: paletteTokens.darkRaised,
        success: { main: statusTokens.success.dark },
        warning: { main: statusTokens.warning.dark },
        error: { main: statusTokens.error.dark },
        info: { main: statusTokens.info.dark },
        action: {
          active: '#E4E4E7',
          hover: 'rgba(255, 255, 255, 0.04)',
          selected: 'rgba(255, 255, 255, 0.08)',
          disabled: 'rgba(161, 161, 170, 0.35)',
          disabledBackground: 'rgba(161, 161, 170, 0.12)',
          focus: 'rgba(87, 80, 241, 0.24)',
        },
      },
    },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: fontStack,
    h1: { fontSize: '2.5rem', lineHeight: 1.1, fontWeight: 700, letterSpacing: '-0.03em' },
    h2: { fontSize: '2rem', lineHeight: 1.15, fontWeight: 700, letterSpacing: '-0.025em' },
    h3: { fontSize: '1.625rem', lineHeight: 1.2, fontWeight: 700, letterSpacing: '-0.02em' },
    h4: { fontSize: '1.375rem', lineHeight: 1.25, fontWeight: 600, letterSpacing: '-0.015em' },
    h5: { fontSize: '1.125rem', lineHeight: 1.35, fontWeight: 600 },
    h6: { fontSize: '1rem', lineHeight: 1.4, fontWeight: 600 },
    subtitle1: { fontSize: '0.95rem', lineHeight: 1.45, fontWeight: 500 },
    subtitle2: { fontSize: '0.875rem', lineHeight: 1.4, fontWeight: 600 },
    body1: { fontSize: '0.9375rem', lineHeight: 1.55 },
    body2: { fontSize: '0.875rem', lineHeight: 1.55 },
    caption: { fontSize: '0.75rem', lineHeight: 1.5 },
    button: { fontSize: '0.875rem', fontWeight: 500, letterSpacing: 0, textTransform: 'none' },
  },
  transitions: {
    duration: { enteringScreen: 180, leavingScreen: 120 },
    easing: { easeInOut: 'cubic-bezier(0.2, 0, 0, 1)' },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        '::selection': {
          backgroundColor: 'color-mix(in srgb, var(--mui-palette-primary-main) 20%, transparent)',
        },
        '*::-webkit-scrollbar': {
          width: 7,
          height: 7,
        },
        '*::-webkit-scrollbar-track': {
          background: 'transparent',
        },
        '*::-webkit-scrollbar-thumb': {
          backgroundColor: 'rgba(113, 113, 122, 0.3)',
          borderRadius: 4,
        },
        '*::-webkit-scrollbar-thumb:hover': {
          backgroundColor: 'rgba(113, 113, 122, 0.55)',
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          minHeight: 40,
          borderRadius: 8,
          transition: 'background-color 140ms ease, border-color 140ms ease, color 140ms ease',
          '&:focus-visible': {
            outline: '3px solid color-mix(in srgb, var(--mui-palette-primary-main) 38%, transparent)',
            outlineOffset: 2,
          },
        },
        contained: { boxShadow: 'none' },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
        outlined: {
          borderColor: 'var(--mui-palette-divider)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          borderRadius: 12,
          borderColor: 'var(--mui-palette-divider)',
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderWidth: 2,
          },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: { fontSize: '0.9rem' },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          color: 'var(--mui-palette-text-secondary)',
          fontSize: '0.75rem',
          fontWeight: 600,
          backgroundColor: 'var(--mui-palette-background-default)',
          borderBottomColor: 'var(--mui-palette-divider)',
          whiteSpace: 'nowrap',
        },
        body: {
          borderBottomColor: 'var(--mui-palette-divider)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 6, fontWeight: 600 },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: { backgroundImage: 'none' },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          border: '1px solid',
          boxShadow: 'none',
          fontSize: '0.875rem',
          '&.MuiAlert-colorError': {
            backgroundColor: 'color-mix(in srgb, var(--mui-palette-error-main) 10%, var(--mui-palette-background-paper))',
            borderColor: 'color-mix(in srgb, var(--mui-palette-error-main) 30%, transparent)',
            color: 'var(--mui-palette-text-primary)',
          },
          '&.MuiAlert-colorWarning': {
            backgroundColor: 'color-mix(in srgb, var(--mui-palette-warning-main) 10%, var(--mui-palette-background-paper))',
            borderColor: 'color-mix(in srgb, var(--mui-palette-warning-main) 30%, transparent)',
            color: 'var(--mui-palette-text-primary)',
          },
          '&.MuiAlert-colorSuccess': {
            backgroundColor: 'color-mix(in srgb, var(--mui-palette-success-main) 10%, var(--mui-palette-background-paper))',
            borderColor: 'color-mix(in srgb, var(--mui-palette-success-main) 30%, transparent)',
            color: 'var(--mui-palette-text-primary)',
          },
          '&.MuiAlert-colorInfo': {
            backgroundColor: 'color-mix(in srgb, var(--mui-palette-primary-main) 8%, var(--mui-palette-background-paper))',
            borderColor: 'color-mix(in srgb, var(--mui-palette-primary-main) 25%, transparent)',
            color: 'var(--mui-palette-text-primary)',
          },
        },
      },
    },
    MuiAccordion: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: '1px solid var(--mui-palette-divider)',
          boxShadow: 'none',
          backgroundImage: 'none',
          backgroundColor: 'var(--mui-palette-background-paper)',
          '&:before': { display: 'none' },
          '&.Mui-expanded': {
            margin: 0,
          },
        },
      },
    },
    MuiAccordionSummary: {
      styleOverrides: {
        root: {
          padding: '12px 16px',
          fontWeight: 600,
          fontSize: '0.9375rem',
          minHeight: 48,
          '&.Mui-expanded': { minHeight: 48 },
        },
        content: {
          margin: 0,
          '&.Mui-expanded': { margin: 0 },
        },
      },
    },
    MuiAccordionDetails: {
      styleOverrides: {
        root: {
          padding: '16px',
          borderTop: '1px solid var(--mui-palette-divider)',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 16,
          border: '1px solid var(--mui-palette-divider)',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
          backgroundImage: 'none',
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontSize: '1.125rem',
          fontWeight: 700,
          padding: '20px 24px 12px 24px',
        },
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          padding: '12px 24px 20px 24px',
          gap: 8,
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          borderRadius: 12,
          border: '1px solid var(--mui-palette-divider)',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
          backgroundImage: 'none',
          padding: '4px',
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          fontSize: '0.875rem',
          fontWeight: 500,
          padding: '8px 12px',
          gap: 10,
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          borderRadius: 6,
          backgroundColor: '#18181B',
          color: '#FFFFFF',
          fontSize: '0.75rem',
          fontWeight: 500,
          padding: '6px 10px',
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          height: 2.5,
          borderRadius: '3px 3px 0 0',
          backgroundColor: 'var(--mui-palette-primary-main)',
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontSize: '0.875rem',
          fontWeight: 600,
          minHeight: 44,
          padding: '8px 16px',
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          height: 6,
          backgroundColor: 'color-mix(in srgb, var(--mui-palette-primary-main) 12%, transparent)',
        },
        bar: {
          borderRadius: 999,
          backgroundColor: 'var(--mui-palette-primary-main)',
        },
      },
    },
  },
});

export { layoutTokens };
