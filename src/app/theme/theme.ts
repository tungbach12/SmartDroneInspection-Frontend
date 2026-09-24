import { createTheme } from '@mui/material/styles';
import { statusTokens } from './tokens';

export const theme = createTheme({
  colorSchemes: {
    light: {
      palette: {
        primary: { main: '#087c92' },
        secondary: { main: '#109c91' },
        background: { default: '#f3f8fb', paper: '#ffffff' },
        divider: 'rgba(21, 36, 44, 0.12)',
        success: { main: statusTokens.success.light },
        warning: { main: statusTokens.warning.light },
        error: { main: statusTokens.error.light },
        info: { main: statusTokens.info.light },
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
    borderRadius: 8,
  },
  typography: {
    fontFamily: 'Roboto, "Helvetica Neue", Arial, sans-serif',
    h1: { fontWeight: 800 },
    h2: { fontWeight: 800 },
    h3: { fontWeight: 800 },
    button: { fontWeight: 700 },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 10,
          minHeight: 40,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: { borderRadius: 10 },
      },
    },
  },
});
