import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: [
      ...configDefaults.exclude,
      '**/target/**',
      'apps/desktop/src-tauri/resources/**',
    ],
  },
});
