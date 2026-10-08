import { createTheme } from '@mui/material/styles';
import { statusTokens } from './tokens';

export const theme = createTheme({
  colorSchemes: {
    light: {
      palette: {
        primary: { main: '#2fa4cc', light: '#7fd0ea', dark: '#1d7f9e' },
        secondary: { main: '#5fc6de', light: '#a8e3f2', dark: '#3a9ab2' },
        background: { default: '#eaf5fb', paper: '#ffffff' },
        divider: 'rgba(23, 68, 92, 0.10)',
        success: { main: statusTokens.success.light },
        warning: { main: statusTokens.warning.light },
        error: { main: statusTokens.error.light },
        info: { main: '#2f8fc4' },
      },
    },
    dark: {
      palette: {
        primary: { main: '#62a7ff' },
        secondary: { main: '#45d8c4' },
        background: { default: '#0f171d', paper: '#17252c' },
        divider: 'rgba(230, 244, 240, 0.14)',
        success: { main: statusTokens.success.dark },
        warning: { main: statusTokens.warning.dark },
        error: { main: statusTokens.error.dark },
        info: { main: statusTokens.info.dark },
      },
    },
  },
  shape: {
    borderRadius: 12,
  },
  transitions: {
    duration: { enteringScreen: 280, leavingScreen: 220 },
    easing: { easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  },
  typography: {
    fontFamily: '"Geist Sans", "Helvetica Neue", Arial, sans-serif',
    h1: { fontWeight: 800, letterSpacing: '-0.03em' },
    h2: { fontWeight: 800, letterSpacing: '-0.025em' },
    h3: { fontWeight: 800, letterSpacing: '-0.02em' },
    button: { fontWeight: 600 },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 12,
          minHeight: 40,
          transition: 'transform 160ms ease, box-shadow 160ms ease, background-color 160ms ease',
          '&:hover': { transform: 'translateY(-1px)' },
          '&:active': { transform: 'translateY(0px) scale(0.98)' },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          transition: 'box-shadow 200ms ease, transform 200ms ease',
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          transition: 'border-color 160ms ease, box-shadow 160ms ease',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          transition: 'transform 220ms ease, box-shadow 220ms ease',
          '&:hover': { transform: 'translateY(-3px)' },
        },
      },
    },
  },
});
