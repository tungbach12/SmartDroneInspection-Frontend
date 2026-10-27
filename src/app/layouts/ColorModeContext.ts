import { createContext, useContext } from 'react';
import { useTheme } from '@mui/material';
import { useColorScheme } from '@mui/material/styles';

export interface ColorModeContextValue {
  mode?: 'light' | 'dark';
  toggle: () => void;
}

export const ColorModeContext = createContext<ColorModeContextValue>({
  mode: 'light',
  toggle: () => {},
});

export const useColorMode = () => useContext(ColorModeContext);

export function useIsDarkMode(): boolean {
  const ctx = useContext(ColorModeContext);
  const { mode: schemeMode } = useColorScheme();
  const theme = useTheme();
  if (schemeMode === 'dark' || schemeMode === 'light') {
    return schemeMode === 'dark';
  }
  if (ctx.mode === 'dark' || ctx.mode === 'light') {
    return ctx.mode === 'dark';
  }
  return theme.palette.mode === 'dark';
}
