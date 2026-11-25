import { expect, test } from '@playwright/test';

const email = process.env.SEED_SUPERADMIN_EMAIL ?? 'superadmin@example.com';
const password = process.env.SEED_SUPERADMIN_PASSWORD ?? 'ChangeMe123!';

test('sign in, create a company, and enforce a module dependency', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Sign in to your account' })).toBeVisible();

  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText('Dashboard', { exact: true }).first()).toBeVisible();

  await page.goto('/companies');
  await expect(page.getByRole('heading', { name: 'Companies', exact: true })).toBeVisible();

  const code = `e2e-${Date.now().toString().slice(-6)}`;
  await page.getByLabel('Company name').fill('E2E Housing');
  await page.getByLabel('Code (lowercase, hyphens)').fill(code);
  await page.getByLabel('Reason for audit log').fill('Playwright playground smoke test');
  await page.getByRole('button', { name: 'Create company' }).click();
  await expect(page.getByText('Company created with deny-by-default business modules.')).toBeVisible();

  // Wait for the refreshed table, then open this exact company's entitlements.
  const newCompanyRow = page.locator('tr').filter({ hasText: code });
  await expect(newCompanyRow).toBeVisible();
  await newCompanyRow.getByRole('link', { name: /configure/ }).click();
  await expect(page.getByRole('heading', { name: 'Module entitlements' })).toBeVisible();
  await expect(page.locator('#mode-visitors')).toHaveValue('DISABLED');

  // Visitors depends on residents; the server must reject the enable attempt.
  await page.locator('#mode-visitors').selectOption('FULL');
  await page.getByLabel('Reason for visitors change').fill('Try without dependency');
  await page
    .locator('li')
    .filter({ hasText: 'visitors' })
    .getByRole('button', { name: 'Save' })
    .click();
  await expect(page.getByText('Enable required modules first: residents')).toBeVisible();
});
