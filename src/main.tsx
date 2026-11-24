import { StrictMode, useMemo, type PropsWithChildren } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { useColorScheme } from '@mui/material/styles';
import { ColorModeContext } from './app/layouts/ColorModeContext';
import { CustomThemeProvider } from './app/theme/CustomThemeProvider';
import { useCustomTheme } from './app/theme/CustomThemeContext';
import { CustomCursorPointer } from './app/theme/CustomCursorPointer';
import { CursorEffectOverlay } from './app/theme/CursorEffectOverlay';
import { createAppTheme } from './app/theme/theme';
import { GlassIconGradientDefs } from './shared/ui/GradientGlassIcons';
import { RouterWithToast } from './app/router/router';
import '@fontsource/geist-sans/400.css';
import '@fontsource/geist-sans/500.css';
import '@fontsource/geist-sans/600.css';
import '@fontsource/geist-sans/700.css';
import '@fontsource/geist-sans/800.css';
import './index.css';
import { useAuthStore } from './features/auth/store/authStore';
import { LocaleProvider } from './shared/i18n/LocaleProvider';

if (import.meta.env.DEV) {
  (window as unknown as { __authStore: typeof useAuthStore }).__authStore = useAuthStore;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, refetchOnWindowFocus: false },
  },
});

function ColorModeBridge({ children }: PropsWithChildren) {
  const { mode, setMode } = useColorScheme();
  const resolvedMode = mode === 'dark' ? 'dark' : 'light';

  const toggle = () => {
    setMode(resolvedMode === 'dark' ? 'light' : 'dark');
  };

  return (
    <ColorModeContext.Provider value={{ mode: resolvedMode, toggle }}>
      {children}
    </ColorModeContext.Provider>
  );
}

function ThemedApp() {
  const { preferences } = useCustomTheme();
  const activeTheme = useMemo(
    () => createAppTheme(preferences.presetId),
    [preferences.presetId],
  );

  return (
    <ThemeProvider
      theme={activeTheme}
      defaultMode="light"
      modeStorageKey="sdi-mode"
    >
      <ColorModeBridge>
        <CssBaseline />
        <GlassIconGradientDefs />
        <CursorEffectOverlay />
        <CustomCursorPointer />
        <QueryClientProvider client={queryClient}>
          <RouterWithToast />
        </QueryClientProvider>
      </ColorModeBridge>
    </ThemeProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LocaleProvider>
      <CustomThemeProvider>
        <ThemedApp />
      </CustomThemeProvider>
    </LocaleProvider>
  </StrictMode>,
);
