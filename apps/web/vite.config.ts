import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  base: process.env.SUNO_BASE_PATH ?? '/',
  resolve: {
    alias: {
      '@suno/shared': fileURLToPath(new URL('../../packages/shared/src/index.ts', import.meta.url))
    }
  },
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:8787'
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/scheduler/')) return 'vendor-react';
          if (id.includes('/@codemirror/') || id.includes('/codemirror/') || id.includes('/@lezer/')) return 'vendor-editor';
          if (id.includes('/lucide-react/')) return 'vendor-icons';
          if (id.includes('/fuse.js/')) return 'vendor-search';
          return 'vendor';
        }
      }
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx']
  }
});
