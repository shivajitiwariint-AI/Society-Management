import { expect, test } from '@playwright/test';

const email = process.env.SEED_SUPERADMIN_EMAIL ?? 'superadmin@example.com';
const password = process.env.SEED_SUPERADMIN_PASSWORD ?? 'ChangeMe123!';
const companyCode = process.env.PLAYGROUND_COMPANY_CODE ?? 'playground-6246';

test('create a society and property hierarchy inside a tenant workspace', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  const companiesResponse = await page.request.get('/api/v1/companies');
  expect(companiesResponse.ok()).toBeTruthy();
  const companies = (await companiesResponse.json()) as { items: Array<{ id: string; code: string }> };
  const company = companies.items.find((item) => item.code === companyCode);
  expect(company).toBeDefined();

  await page.locator('#workspace-switcher').selectOption(`${company!.id}|`);
  await expect(page.locator('#workspace-switcher')).toHaveValue(`${company!.id}|`);

  await page.goto('/societies');
  await expect(page.getByRole('heading', { name: 'Societies', exact: true })).toBeVisible();

  const societyName = `E2E Society ${Date.now().toString().slice(-6)}`;
  await page.getByLabel('Society name').fill(societyName);
  await page.getByLabel('City').fill('Pune');
  await page.getByRole('button', { name: 'Create society' }).click();
  await expect(page.getByText('Society created.')).toBeVisible();

  const societyRow = page.locator('li').filter({ hasText: societyName });
  await societyRow.getByRole('link', { name: /Manage property/ }).click();
  await expect(page.getByRole('heading', { name: societyName })).toBeVisible();

  await page.getByLabel('Building name').fill('Block A');
  await page.getByLabel('Code', { exact: true }).fill('A');
  await page.getByRole('button', { name: 'Add building' }).click();
  await expect(page.getByRole('heading', { name: 'Block A' })).toBeVisible();

  await page.locator('summary').filter({ hasText: 'Add floor' }).click();
  await page.getByLabel('Floor name').fill('Ground');
  await page.getByLabel('Floor number').fill('0');
  await page.getByRole('button', { name: 'Add floor' }).click();
  await expect(page.locator('p').filter({ hasText: /^Ground/ })).toBeVisible();

  await page.locator('summary').filter({ hasText: 'Add flat' }).click();
  await page.getByLabel('Flat number').fill('A-101');
  await page.getByLabel('Area (sq. m.)').fill('850.5');
  await page.getByRole('button', { name: 'Add flat' }).click();
  await expect(page.getByText('A-101', { exact: false })).toBeVisible();
});
