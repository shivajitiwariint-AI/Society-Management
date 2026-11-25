import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)));

export default defineConfig({
  resolve: {
    alias: {
      '@society/shared': resolve(root, 'packages/shared/src/index.ts'),
      '@society/validation': resolve(root, 'packages/validation/src/index.ts'),
      '@society/authorization': resolve(root, 'packages/authorization/src/index.ts'),
      '@society/database': resolve(root, 'packages/database/src/index.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['packages/**/*.test.ts', 'apps/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/.next/**'],
  },
});
