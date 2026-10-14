import { configDefaults, defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    // The heavier component tests need more than the 5s default when the suite runs at once.
    testTimeout: 15000,
    // Keep Vitest defaults; agent worktrees and built bundles are not product tests.
    exclude: [...configDefaults.exclude, '**/.claude/**', '**/dist/**'],
  },
});
