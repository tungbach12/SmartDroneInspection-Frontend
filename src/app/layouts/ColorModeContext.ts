import { createContext, useContext } from 'react';

export interface ColorModeContextValue {
  toggle: () => void;
}

export const ColorModeContext = createContext<ColorModeContextValue>({
  toggle: () => {},
});

export const useColorMode = () => useContext(ColorModeContext);
