import { config as loadDotenv } from 'dotenv';
import { defineConfig, devices } from '@playwright/test';

// Use the same playground credentials as the database seed.
loadDotenv();

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  // The self-hosted dev server compiles routes on demand and the tests share one
  // local database, so a retry absorbs cold-compile/Database-lock races.
  retries: 2,
  reporter: 'list',
  // Next dev compiles routes on first navigation, which can exceed Playwright's
  // 5s default assertion timeout on a cold cache.
  timeout: 90_000,
  expect: { timeout: 20_000 },
  use: {
    baseURL: process.env.APP_URL ?? 'http://localhost:3000',
    ...devices['Desktop Chrome'],
  },
});
