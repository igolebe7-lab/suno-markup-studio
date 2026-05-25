import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@suno/shared': new URL('../../packages/shared/src', import.meta.url).pathname
    }
  },
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:8787'
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx']
  }
});
