import { expect, test, type Page } from '@playwright/test';

const email = process.env.SEED_SUPERADMIN_EMAIL ?? 'superadmin@example.com';
const password = process.env.SEED_SUPERADMIN_PASSWORD ?? 'ChangeMe123!';
const companyCode = process.env.PLAYGROUND_COMPANY_CODE ?? 'playground-6246';
const societyName = process.env.IMPORT_SOCIETY_NAME ?? 'Oasis Venetia Heights';

async function csrf(page: Page): Promise<string> {
  const token = await page.evaluate(() => {
    const entry = document.cookie.split('; ').find((item) => item.startsWith('society_csrf='));
    return entry ? decodeURIComponent(entry.split('=')[1] ?? '') : '';
  });
  expect(token).not.toBe('');
  return token;
}

test('workflow modules create, update and isolate records by society', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  const companiesResponse = await page.request.get('/api/v1/companies');
  const companies = (await companiesResponse.json()) as { items: Array<{ id: string; code: string }> };
  const company = companies.items.find((item) => item.code === companyCode);
  expect(company).toBeDefined();
  await page.locator('#workspace-switcher').selectOption(`${company!.id}|`);

  await page.goto(`/companies/${company!.id}/modules`);
  await page.locator('li').filter({ hasText: 'visitors' }).locator('#mode-visitors').selectOption('FULL');
  await page.getByLabel('Reason for visitors change').fill('Enable visitor management for playground verification');
  await page.locator('li').filter({ hasText: 'visitors' }).getByRole('button', { name: 'Save' }).click();
  await expect(page.locator('#mode-visitors')).toHaveValue('FULL');

  await page.goto('/operations/visitors/visitor');
  const heading = page.getByRole('heading', { name: 'Visitors', exact: true });
  if (await heading.count()) await expect(heading).toBeVisible();
  await expect(page.getByText(/tenant-scoped records/i)).toBeVisible();
  await page.getByLabel('Society', { exact: true }).selectOption({ label: societyName });

  const visitorName = `E2E Visitor ${Date.now().toString().slice(-8)}`;
  await page.getByLabel('Visitor name').fill(visitorName);
  await page.getByLabel('Code').fill(`V-${Date.now().toString().slice(-8)}`);
  await page.getByRole('button', { name: /create visitor/i }).click();
  await expect(page.getByText('Record created')).toBeVisible();
  const row = page.locator('tr').filter({ hasText: visitorName });
  await expect(row).toBeVisible();
  await row.locator('select').selectOption('APPROVED');
  await expect(page.getByText('Status changed to APPROVED')).toBeVisible();

  const response = await page.request.get('/api/v1/operations/visitors/visitor?societyId=00000000-0000-4000-8000-000000000000');
  expect(response.status()).toBe(404);

  page.once('dialog', (dialog) => void dialog.accept());
  await row.getByRole('button', { name: 'Delete' }).click();
  await expect(row).toHaveCount(0);
  expect(await csrf(page)).not.toBe('');
});
