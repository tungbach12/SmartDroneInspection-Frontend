import { createContext, useContext } from 'react';
import {
  DEFAULT_USER_THEME_PREFERENCES,
  getThemePreset,
  type BackgroundTarget,
  type CursorEffectId,
  type CursorStyleId,
  type PetCompanionId,
  type ThemePresetDefinition,
  type ThemePresetId,
  type UserThemePreferences,
} from './customTheme';

export interface CustomThemeContextValue {
  preferences: UserThemePreferences;
  activePreset: ThemePresetDefinition;
  activeBackgroundUrl: string | null;
  storageError: string | null;
  clearStorageError: () => void;
  setPresetId: (presetId: ThemePresetId) => void;
  selectDefaultBackground: () => void;
  selectBackgroundPreset: (backgroundPresetId: string) => void;
  selectCustomBackground: () => void;
  uploadCustomBackground: (file: File) => Promise<void>;
  removeCustomBackground: () => void;
  setBackgroundTarget: (target: BackgroundTarget) => void;
  setSurfaceOpacity: (opacity: number) => void;
  setCursorStyle: (style: CursorStyleId) => void;
  setCursorColor: (color: string) => void;
  setCursorEffect: (effect: CursorEffectId) => void;
  setPetCompanionId: (petId: PetCompanionId) => void;
  resetToDefault: () => void;
}

const noop = () => undefined;

export const CustomThemeContext = createContext<CustomThemeContextValue>({
  preferences: DEFAULT_USER_THEME_PREFERENCES,
  activePreset: getThemePreset('default'),
  activeBackgroundUrl: null,
  storageError: null,
  clearStorageError: noop,
  setPresetId: noop,
  selectDefaultBackground: noop,
  selectBackgroundPreset: noop,
  selectCustomBackground: noop,
  uploadCustomBackground: async () => undefined,
  removeCustomBackground: noop,
  setBackgroundTarget: noop,
  setSurfaceOpacity: noop,
  setCursorStyle: noop,
  setCursorColor: noop,
  setCursorEffect: noop,
  setPetCompanionId: noop,
  resetToDefault: noop,
});

export function useCustomTheme(): CustomThemeContextValue {
  return useContext(CustomThemeContext);
}
