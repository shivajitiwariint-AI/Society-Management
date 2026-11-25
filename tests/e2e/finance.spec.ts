import { expect, test, type Page } from '@playwright/test';

const companyCode = process.env.PLAYGROUND_COMPANY_CODE ?? 'playground-6246';
const societyName = process.env.IMPORT_SOCIETY_NAME ?? 'Oasis Venetia Heights';

async function signInAsCompany(page: Page) {
  await page.goto('/login');
  // shivajitiwari@gmail.com has playground-6246 company membership
  await page.getByLabel('Email address').fill('shivajitiwari@gmail.com');
  await page.getByLabel('Password').fill('Pueblo421#');
  await page.getByRole('button', { name: 'Sign in to company' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  // Switch to the playground company workspace
  await page.locator('#workspace-switcher').selectOption(`${companyCode}|`);
  await page.waitForSelector('text=/Oasis Venetia Heights/i', { timeout: 5000 });
}

async function enableModule(page: Page, moduleKey: string) {
  await page.goto(`/companies/${companyCode}/modules`);
  await page.locator('li').filter({ hasText: moduleKey }).locator(`#mode-${moduleKey}`).selectOption('FULL');
  await page.getByLabel(`Reason for ${moduleKey} change`).fill(`Enable ${moduleKey} for playground verification`);
  await page.locator('li').filter({ hasText: moduleKey }).getByRole('button', { name: 'Save' }).click();
  await expect(page.locator(`#mode-${moduleKey}`)).toHaveValue('FULL');
}

test('finance modules issue invoices, record payments and post balanced journals', async ({ page }) => {
  await signInAsCompany(page);

  await enableModule(page, 'finance-billing');
  await enableModule(page, 'payments-receipts');
  await enableModule(page, 'accounting');

  await page.goto('/finance');
  await page.getByLabel('Society', { exact: true }).selectOption({ label: societyName });
  const suffix = Date.now().toString().slice(-8);
  await page.getByLabel('Code', { exact: true }).fill(`E2E${suffix}`);
  await page.getByLabel('Name', { exact: true }).fill(`E2E Charge ${suffix}`);
  await page.getByLabel('Amount', { exact: true }).first().fill('1200');
  await page.getByRole('button', { name: 'Create charge' }).click();
  await expect(page.getByText('Saved successfully')).toBeVisible();

  await page.getByLabel('Description', { exact: true }).fill(`E2E invoice ${suffix}`);
  await page.getByLabel('Amount', { exact: true }).last().fill('1200');
  await page.getByRole('button', { name: 'Issue invoice' }).click();
  await expect(page.getByText('Saved successfully')).toBeVisible();

  await page.goto('/payments');
  await page.getByLabel('Society', { exact: true }).selectOption({ label: societyName });
  await page.getByLabel('Amount', { exact: true }).first().fill('1200');
  await page.getByLabel('Reference', { exact: true }).fill(`E2E-${suffix}`);
  await page.getByRole('button', { name: 'Record payment' }).click();
  await expect(page.getByText('Saved successfully')).toBeVisible();

  await page.goto('/accounting');
  await page.getByLabel('Society', { exact: true }).selectOption({ label: societyName });
  await page.getByLabel('Code', { exact: true }).fill(`CASH${suffix}`);
  await page.getByLabel('Name', { exact: true }).fill(`E2E Cash ${suffix}`);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText('Saved successfully')).toBeVisible();

  const outOfScope = await page.request.get('/api/v1/societies/00000000-0000-4000-8000-000000000000/finance/invoices');
  expect(outOfScope.status()).toBe(404);
});