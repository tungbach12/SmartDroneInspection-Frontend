import { useCallback, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { useAuthStore } from '@/features/auth/store/authStore';
import { CustomThemeContext, type CustomThemeContextValue } from './CustomThemeContext';
import {
  clampSurfaceOpacity,
  DEFAULT_USER_THEME_PREFERENCES,
  getThemePreset,
  getUserThemeStorageKey,
  processBackgroundImageFile,
  readUserThemePreferences,
  resolveActiveBackgroundUrl,
  writeUserThemePreferences,
  type BackgroundTarget,
  type CursorEffectId,
  type CursorStyleId,
  type ThemePresetId,
  type UserThemePreferences,
} from './customTheme';

interface ScopedProviderProps extends PropsWithChildren {
  userId: string | null;
}

function CustomThemeScopedProvider({ userId, children }: ScopedProviderProps) {
  const [preferences, setPreferences] = useState<UserThemePreferences>(() =>
    readUserThemePreferences(userId),
  );
  const [storageError, setStorageError] = useState<string | null>(null);

  useEffect(() => {
    const key = getUserThemeStorageKey(userId);
    const handleStorage = (event: StorageEvent) => {
      if (event.key === key) {
        setPreferences(readUserThemePreferences(userId));
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [userId]);

  const activePreset = useMemo(
    () => getThemePreset(preferences.presetId),
    [preferences.presetId],
  );
  const activeBackgroundUrl = useMemo(
    () => resolveActiveBackgroundUrl(preferences),
    [preferences],
  );

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--nextadmin-primary', activePreset.primary);
    root.style.setProperty('--nextadmin-primary-dark', activePreset.primaryDark);
    root.style.setProperty('--nextadmin-primary-light', activePreset.primaryLight);
    root.style.setProperty('--nextadmin-primary-soft', activePreset.primarySoft);
    root.style.setProperty('--lytic-primary', activePreset.primary);
    root.style.setProperty('--lytic-primary-hover', activePreset.primaryDark);
    root.style.setProperty('--lytic-primary-light', activePreset.primarySoft);
  }, [activePreset]);

  const updatePreferences = useCallback(
    (updater: (prev: UserThemePreferences) => UserThemePreferences) => {
      setPreferences((prev) => {
        const next = updater(prev);
        const result = writeUserThemePreferences(userId, next);
        if (!result.ok) {
          setStorageError(
            result.error === 'quota_exceeded'
              ? 'IMAGE_STORAGE_QUOTA_EXCEEDED'
              : 'STORAGE_UNAVAILABLE',
          );
          if (result.error === 'quota_exceeded') {
            return prev;
          }
        } else {
          setStorageError(null);
        }
        return next;
      });
    },
    [userId],
  );

  const setPresetId = useCallback(
    (presetId: ThemePresetId) => {
      updatePreferences((prev) => ({ ...prev, presetId }));
    },
    [updatePreferences],
  );

  const selectDefaultBackground = useCallback(() => {
    updatePreferences((prev) => ({
      ...prev,
      backgroundSource: 'default',
    }));
  }, [updatePreferences]);

  const selectBackgroundPreset = useCallback(
    (backgroundPresetId: string) => {
      updatePreferences((prev) => ({
        ...prev,
        backgroundSource: 'preset',
        backgroundPresetId,
      }));
    },
    [updatePreferences],
  );

  const selectCustomBackground = useCallback(() => {
    updatePreferences((prev) =>
      prev.customBackgroundDataUrl
        ? { ...prev, backgroundSource: 'custom' }
        : prev,
    );
  }, [updatePreferences]);

  const uploadCustomBackground = useCallback(
    async (file: File) => {
      const dataUrl = await processBackgroundImageFile(file);
      updatePreferences((prev) => ({
        ...prev,
        backgroundSource: 'custom',
        customBackgroundDataUrl: dataUrl,
        customBackgroundName: file.name.slice(0, 120),
      }));
    },
    [updatePreferences],
  );

  const removeCustomBackground = useCallback(() => {
    updatePreferences((prev) => ({
      ...prev,
      backgroundSource: prev.backgroundPresetId ? 'preset' : 'default',
      customBackgroundDataUrl: null,
      customBackgroundName: null,
    }));
  }, [updatePreferences]);

  const setBackgroundTarget = useCallback(
    (backgroundTarget: BackgroundTarget) => {
      updatePreferences((prev) => ({ ...prev, backgroundTarget }));
    },
    [updatePreferences],
  );

  const setSurfaceOpacity = useCallback(
    (opacity: number) => {
      updatePreferences((prev) => ({
        ...prev,
        surfaceOpacity: clampSurfaceOpacity(opacity),
      }));
    },
    [updatePreferences],
  );

  const setCursorStyle = useCallback(
    (cursorStyle: CursorStyleId) => {
      updatePreferences((prev) => ({ ...prev, cursorStyle }));
    },
    [updatePreferences],
  );

  const setCursorEffect = useCallback(
    (cursorEffect: CursorEffectId) => {
      updatePreferences((prev) => ({ ...prev, cursorEffect }));
    },
    [updatePreferences],
  );

  const resetToDefault = useCallback(() => {
    updatePreferences(() => ({ ...DEFAULT_USER_THEME_PREFERENCES }));
  }, [updatePreferences]);

  const clearStorageError = useCallback(() => setStorageError(null), []);

  const value = useMemo<CustomThemeContextValue>(
    () => ({
      preferences,
      activePreset,
      activeBackgroundUrl,
      storageError,
      clearStorageError,
      setPresetId,
      selectDefaultBackground,
      selectBackgroundPreset,
      selectCustomBackground,
      uploadCustomBackground,
      removeCustomBackground,
      setBackgroundTarget,
      setSurfaceOpacity,
      setCursorStyle,
      setCursorEffect,
      resetToDefault,
    }),
    [
      preferences,
      activePreset,
      activeBackgroundUrl,
      storageError,
      clearStorageError,
      setPresetId,
      selectDefaultBackground,
      selectBackgroundPreset,
      selectCustomBackground,
      uploadCustomBackground,
      removeCustomBackground,
      setBackgroundTarget,
      setSurfaceOpacity,
      setCursorStyle,
      setCursorEffect,
      resetToDefault,
    ],
  );

  return (
    <CustomThemeContext.Provider value={value}>{children}</CustomThemeContext.Provider>
  );
}

export function CustomThemeProvider({ children }: PropsWithChildren) {
  const userId = useAuthStore((state) => state.userId);
  return (
    <CustomThemeScopedProvider key={userId ?? 'guest'} userId={userId}>
      {children}
    </CustomThemeScopedProvider>
  );
}
