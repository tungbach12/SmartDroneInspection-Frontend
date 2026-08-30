import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { theme } from './app/theme/theme';
import { RouterWithToast } from './app/router/router';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, refetchOnWindowFocus: false },
  },
});

function ThemedApp() {
  return (
    <ThemeProvider
      theme={theme}
      defaultMode="light"
      modeStorageKey="sdi-mode"
    >
      <CssBaseline />
      <QueryClientProvider client={queryClient}>
        <RouterWithToast />
      </QueryClientProvider>
    </ThemeProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemedApp />
  </StrictMode>,
);
