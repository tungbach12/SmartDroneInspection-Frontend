import { StrictMode } from 'react';
import type { PropsWithChildren } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { useColorScheme } from '@mui/material/styles';
import { ColorModeContext } from './app/layouts/ColorModeContext';
import { theme } from './app/theme/theme';
import { RouterWithToast } from './app/router/router';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, refetchOnWindowFocus: false },
  },
});

function ColorModeBridge({ children }: PropsWithChildren) {
  const { mode, setMode } = useColorScheme();

  const toggle = () => {
    setMode(mode === 'dark' ? 'light' : 'dark');
  };

  return (
    <ColorModeContext.Provider value={{ toggle }}>
      {children}
    </ColorModeContext.Provider>
  );
}

function ThemedApp() {
  return (
    <ThemeProvider
      theme={theme}
      defaultMode="light"
      modeStorageKey="sdi-mode"
    >
      <ColorModeBridge>
        <CssBaseline />
        <QueryClientProvider client={queryClient}>
          <RouterWithToast />
        </QueryClientProvider>
      </ColorModeBridge>
    </ThemeProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemedApp />
  </StrictMode>,
);
