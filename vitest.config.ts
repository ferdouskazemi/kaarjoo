import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { configDefaults, defineConfig } from 'vitest/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@kaarjoo/shared': path.resolve(__dirname, 'packages/shared/src/index.ts'),
      '@kaarjoo/adapters': path.resolve(__dirname, 'packages/adapters/src/index.ts'),
      '@kaarjoo/ats': path.resolve(__dirname, 'packages/ats/src/index.ts'),
      '@kaarjoo/engine': path.resolve(__dirname, 'packages/engine/src/index.ts'),
    },
  },
  test: {
    exclude: [
      ...configDefaults.exclude,
      '**/target/**',
      'apps/desktop/src-tauri/resources/**',
    ],
  },
});
