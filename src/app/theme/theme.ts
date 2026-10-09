import { createTheme } from '@mui/material/styles';
import { layoutTokens, paletteTokens, statusTokens } from './tokens';

export const theme = createTheme({
  colorSchemes: {
    light: {
      palette: {
        primary: {
          main: paletteTokens.teal,
          light: '#36A2AA',
          dark: '#075B67',
          contrastText: '#FFFFFF',
        },
        secondary: {
          main: paletteTokens.harbor,
          light: '#42687C',
          dark: '#102B3A',
          contrastText: '#FFFFFF',
        },
        background: {
          default: paletteTokens.paper,
          paper: paletteTokens.white,
        },
        text: {
          primary: paletteTokens.ink,
          secondary: '#5D707B',
        },
        divider: '#D9E2E6',
        success: { main: statusTokens.success.light },
        warning: { main: statusTokens.warning.light },
        error: { main: statusTokens.error.light },
        info: { main: statusTokens.info.light },
      },
    },
    dark: {
      palette: {
        primary: {
          main: '#3758F9',
          light: '#5E84FC',
          dark: '#314ED9',
          contrastText: '#FFFFFF',
        },
        secondary: {
          main: '#5E84FC',
          light: '#BECDFF',
          dark: '#314ED9',
          contrastText: '#030712',
        },
        background: {
          default: paletteTokens.darkCanvas,
          paper: paletteTokens.darkSurface,
        },
        text: {
          primary: paletteTokens.darkText,
          secondary: paletteTokens.darkMuted,
        },
        divider: '#1F2937',
        success: { main: statusTokens.success.dark },
        warning: { main: statusTokens.warning.dark },
        error: { main: statusTokens.error.dark },
        info: { main: statusTokens.info.dark },
        action: {
          active: '#9CA3AF',
          hover: 'rgba(156, 163, 175, 0.08)',
          selected: 'rgba(55, 88, 249, 0.14)',
          disabled: 'rgba(205, 205, 208, 0.32)',
          disabledBackground: 'rgba(156, 163, 175, 0.12)',
          focus: 'rgba(55, 88, 249, 0.2)',
        },
      },
    },
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: '"Geist Sans", "Helvetica Neue", Arial, sans-serif',
    h1: { fontSize: '2.5rem', lineHeight: 1.1, fontWeight: 650, letterSpacing: '-0.045em' },
    h2: { fontSize: '2rem', lineHeight: 1.15, fontWeight: 650, letterSpacing: '-0.035em' },
    h3: { fontSize: '1.625rem', lineHeight: 1.2, fontWeight: 650, letterSpacing: '-0.025em' },
    h4: { fontSize: '1.375rem', lineHeight: 1.25, fontWeight: 650, letterSpacing: '-0.018em' },
    h5: { fontSize: '1.125rem', lineHeight: 1.35, fontWeight: 620 },
    h6: { fontSize: '1rem', lineHeight: 1.4, fontWeight: 620 },
    subtitle1: { fontSize: '0.95rem', lineHeight: 1.45, fontWeight: 580 },
    subtitle2: { fontSize: '0.875rem', lineHeight: 1.4, fontWeight: 600 },
    body1: { fontSize: '0.94rem', lineHeight: 1.55 },
    body2: { fontSize: '0.875rem', lineHeight: 1.55 },
    caption: { fontSize: '0.75rem', lineHeight: 1.5 },
    button: { fontSize: '0.875rem', fontWeight: 600, letterSpacing: 0, textTransform: 'none' },
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
          fontWeight: 650,
          backgroundColor: 'var(--mui-palette-background-default)',
          borderBottomColor: 'var(--mui-palette-divider)',
        },
        body: { borderBottomColor: 'var(--mui-palette-divider)' },
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
  },
});

export { layoutTokens };
