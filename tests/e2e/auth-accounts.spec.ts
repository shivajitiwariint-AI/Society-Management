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
  await page.goto('/login');
  await expect(page).toHaveURL(/\/login$/);
}

async function signIn(page: Page, portal: '/login' | '/admin/login', email: string, password: string) {
  await page.goto(portal);
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: portal === '/admin/login' ? 'Sign in to platform' : 'Sign in to company' }).click();
}

test('company registration, separate portals, and super-admin password reset', async ({ page }) => {
  const suffix = Date.now().toString().slice(-10);
  const companyCode = `e2e-reg-${suffix}`;
  const companyName = `E2E Registered ${suffix}`;
  const adminEmail = `${companyCode}@example.com`;
  const initialPassword = 'RegTestPass123!';
  const resetPassword = 'ResetPass456!';

  await page.goto('/register');
  await page.getByLabel('Company name').fill(companyName);
  await page.getByLabel('Company code').fill(companyCode);
  await page.getByLabel('Administrator name').fill('E2E Company Admin');
  await page.getByLabel('Administrator email').fill(adminEmail);
  await page.getByLabel('Administrator password').fill(initialPassword);
  await page.getByRole('button', { name: 'Register company' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.locator('#workspace-switcher')).toContainText(companyName);

  await signOut(page);
  await signIn(page, '/login', adminEmail, initialPassword);
  await expect(page).toHaveURL(/\/dashboard$/);

  await signOut(page);
  await signIn(page, '/admin/login', platformEmail, platformPassword);
  await expect(page).toHaveURL(/\/companies$/);

  await page.goto('/admin/users');
  const row = page.locator('div.rounded-xl').filter({ hasText: adminEmail });
  await row.getByLabel('New password').fill(resetPassword);
  await row.getByLabel('Audit reason').fill('E2E administrative password reset');
  await row.getByRole('button', { name: 'Reset password' }).click();
  await expect(page.getByText(new RegExp(`Password reset for ${adminEmail}`))).toBeVisible();

  await signOut(page);
  await signIn(page, '/login', adminEmail, resetPassword);
  await expect(page).toHaveURL(/\/dashboard$/);

  await signOut(page);
  await signIn(page, '/admin/login', adminEmail, resetPassword);
  await expect(page).toHaveURL(/\/admin\/login$/);
  await expect(page.getByText('Invalid email or password')).toBeVisible();
});
