import { defineConfig } from 'eslint/config';
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';

export default defineConfig([
  ...nextCoreWebVitals,
  {
    rules: {
      // The root config also lints server/packages where a Pages directory
      // does not exist; App Router links are regular next/link usage.
      '@next/next/no-html-link-for-pages': 'off',
    },
  },
  {
    ignores: [
      '**/node_modules/**',
      '**/.next/**',
      '**/dist/**',
      '**/generated/**',
      'playwright-report/**',
      'test-results/**',
    ],
  },
]);
