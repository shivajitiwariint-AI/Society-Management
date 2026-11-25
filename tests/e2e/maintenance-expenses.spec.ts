import { expect, test } from '@playwright/test';

const email = process.env.SEED_SUPERADMIN_EMAIL ?? 'superadmin@example.com';
const password = process.env.SEED_SUPERADMIN_PASSWORD ?? 'ChangeMe123!';
const companyCode = process.env.PLAYGROUND_COMPANY_CODE ?? 'playground-6246';
const societyName = process.env.IMPORT_SOCIETY_NAME ?? 'Oasis Venetia Heights';

test('imported maintenance expenses are visible, filterable, and editable', async ({ page }) => {
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

  await page.goto(`/companies/${company!.id}/modules`);
  await page.locator('li').filter({ hasText: 'finance-billing' }).locator('#mode-finance-billing').selectOption('FULL');
  await page.getByLabel('Reason for finance-billing change').fill('Enable expenses for playground verification');
  await page
    .locator('li')
    .filter({ hasText: 'finance-billing' })
    .getByRole('button', { name: 'Save' })
    .click();
  await expect(page.locator('#mode-finance-billing')).toHaveValue('FULL');

  await page.goto('/maintenance-expenses');
  await expect(page.getByRole('heading', { name: 'Maintenance expenses', exact: true })).toBeVisible();
  await expect(page.getByText(/illustrative estimates only/i)).toBeVisible();
  await page.getByLabel('Society', { exact: true }).selectOption({ label: societyName });

  await expect(page.getByText('SAMPLE', { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/80,06,000\.00/).first()).toBeVisible();

  // A society ID outside the active company must not reveal any expense data.
  const outOfScope = await page.request.get(
    '/api/v1/societies/00000000-0000-4000-8000-000000000000/expenses',
  );
  expect(outOfScope.status()).toBe(404);
  expect((await outOfScope.json()).error.code).toBe('NOT_FOUND');

  const voucherRef = `E2E-${Date.now().toString().slice(-8)}`;
  await page.getByLabel('Month', { exact: true }).fill('2026-12');
  await page.getByLabel('Amount (INR)').fill('1234.56');
  await page.getByLabel('Voucher / bill ref').fill(voucherRef);
  await page.getByLabel('Vendor / payee').fill('E2E Vendor');
  await page.getByRole('button', { name: 'Add expense' }).click();
  await expect(page.getByText('Expense recorded.')).toBeVisible();

  await page.getByLabel('Search').fill(voucherRef);
  const row = page.locator('tr').filter({ hasText: voucherRef });
  await expect(row).toContainText('1,234.56');
  page.once('dialog', (dialog) => void dialog.accept());
  await row.getByRole('button', { name: 'Delete' }).click();
  await expect(row).toHaveCount(0);
});
