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
    // The heavier component tests needed more than the 5s default when the whole suite ran at once.
    // vmThreads was tried and reverted: each thread builds its own jsdom, and across this many test
    // files the workers ran the process out of memory.
    testTimeout: 15000,
    // Keep Vitest defaults while excluding nested agent worktrees and build output.
    exclude: [...configDefaults.exclude, '**/.claude/**', '**/dist/**'],
  },
});
