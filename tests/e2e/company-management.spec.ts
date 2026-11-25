import { expect, test, type Page } from '@playwright/test';

const platformEmail = process.env.SEED_SUPERADMIN_EMAIL ?? 'superadmin@example.com';
const platformPassword = process.env.SEED_SUPERADMIN_PASSWORD ?? 'ChangeMe123!';

async function signOut(page: Page) {
  const status = await page.evaluate(async () => {
    const csrf = document.cookie
      .split('; ')
      .find((entry) => entry.startsWith('society_csrf='))
      ?.split('=')[1] ?? '';
    const response = await fetch('/api/v1/auth/logout', {
      method: 'POST',
      headers: { 'x-csrf-token': decodeURIComponent(csrf) },
    });
    return response.status;
  });
  expect(status).toBe(200);
}

async function signInAsSuperAdmin(page: Page) {
  await page.goto('/admin/login');
  await page.getByLabel('Email address').fill(platformEmail);
  await page.getByLabel('Password').fill(platformPassword);
  await page.getByRole('button', { name: 'Sign in to platform' }).click();
  await expect(page).toHaveURL(/\/companies$/);
}

test('super admin can disable, enable, and permanently delete a company', async ({ page }) => {
  const suffix = Date.now().toString();
  const companyCode = `e2e-company-${suffix}`;
  const companyName = `E2E Company ${suffix}`;
  const companyAdminEmail = `${companyCode}@example.com`;
  const companyAdminPassword = 'LifecyclePass123!';
  const societyName = `Lifecycle Society ${suffix}`;
  let companyId: string | null = null;
  let deleted = false;

  try {
    await page.goto('/register');
    await page.getByLabel('Company name').fill(companyName);
    await page.getByLabel('Company code').fill(companyCode);
    await page.getByLabel('Administrator name').fill('E2E Lifecycle Admin');
    await page.getByLabel('Administrator email').fill(companyAdminEmail);
    await page.getByLabel('Administrator password').fill(companyAdminPassword);
    await page.getByRole('button', { name: 'Register company' }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.locator('#workspace-switcher')).toContainText(companyName);
    companyId = (await page.locator('#workspace-switcher').inputValue()).split('|')[0] ?? null;
    expect(companyId).not.toBe('');

    await page.goto('/societies');
    await page.getByLabel('Society name').fill(societyName);
    await page.getByLabel('City').fill('Pune');
    await page.getByRole('button', { name: 'Create society' }).click();
    await expect(page.getByText('Society created.')).toBeVisible();

    await signOut(page);
    await signInAsSuperAdmin(page);

    const row = page.locator('tbody tr').filter({ hasText: companyCode });
    await expect(row).toBeVisible();
    const configureHref = await row.getByRole('link').getAttribute('href');
    companyId = configureHref?.match(/\/companies\/([^/]+)\/modules/)?.[1] ?? null;
    expect(companyId).not.toBeNull();

    page.once('dialog', (dialog) => dialog.accept());
    await row.getByRole('button', { name: `Disable ${companyName}` }).click();
    await expect(row).toContainText('Disabled');

    await row.getByRole('button', { name: `Enable ${companyName}` }).click();
    await expect(row).toContainText('Enabled');

    await row.getByRole('button', { name: `Delete ${companyName}` }).click();
    const dialog = page.getByRole('dialog', { name: `Delete ${companyName}?` });
    await expect(dialog).toBeVisible();
    await dialog.getByLabel('Type the company code to confirm').fill(companyCode);
    await dialog.getByLabel('Reason for deletion').fill('Remove company after lifecycle test');
    await dialog.getByRole('button', { name: 'Delete company and data' }).click();
    await expect(row).toHaveCount(0);
    deleted = true;

    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: 'Your platform overview' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Choose a workspace to get started' })).toBeVisible();

    await signOut(page);
    await page.goto('/login');
    await page.getByLabel('Email address').fill(companyAdminEmail);
    await page.getByLabel('Password').fill(companyAdminPassword);
    await page.getByRole('button', { name: 'Sign in to company' }).click();
    await expect(page.getByText('Invalid email or password')).toBeVisible();
  } finally {
    if (companyId && !deleted) {
      await signOut(page);
      await signInAsSuperAdmin(page);
      await page.evaluate(async ({ id, code }) => {
        const csrf = document.cookie
          .split('; ')
          .find((entry) => entry.startsWith('society_csrf='))
          ?.split('=')[1] ?? '';
        await fetch(`/api/v1/companies/${id}`, {
          method: 'DELETE',
          headers: { 'content-type': 'application/json', 'x-csrf-token': decodeURIComponent(csrf) },
          body: JSON.stringify({ confirmationCode: code, reason: 'E2E cleanup after failed assertion' }),
        });
      }, { id: companyId, code: companyCode });
    }
  }
});
