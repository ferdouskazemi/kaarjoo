import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // Vite options tailored for Tauri development
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      ignored: ['**/src-tauri/**'],
    },
    proxy: {
      '/api/greenhouse': {
        target: 'https://boards-api.greenhouse.io',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/greenhouse/, ''),
      },
      '/api/wwr': {
        target: 'https://weworkremotely.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/wwr/, ''),
      },
    },
  },
});
