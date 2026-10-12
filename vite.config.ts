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
    // `.claude/` holds agent scratch and nested worktree checkouts, not product source; without
    // this a focused run also executes stale copies of tests from those directories. Spread
    // configDefaults.exclude rather than replacing it — Vitest merges arrays by replacement, so a
    // literal list here would silently drop the default `**/.git/**` glob.
    exclude: [...configDefaults.exclude, '**/.claude/**', '**/dist/**'],
  },
});
