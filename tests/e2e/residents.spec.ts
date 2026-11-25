import { expect, test, type Page } from '@playwright/test';

const email = process.env.SEED_SUPERADMIN_EMAIL ?? 'superadmin@example.com';
const password = process.env.SEED_SUPERADMIN_PASSWORD ?? 'ChangeMe123!';
const companyCode = process.env.PLAYGROUND_COMPANY_CODE ?? 'playground-6246';
const societyName = process.env.IMPORT_SOCIETY_NAME ?? 'Oasis Venetia Heights';

async function postJson<T>(page: Page, url: string, body: unknown): Promise<T> {
  // The login flow installs the authenticated double-submit cookie. Requesting
  // /auth/csrf here would replace it with an anonymous token and be rejected.
  const csrfToken = await page.evaluate(() => {
    const entry = document.cookie.split('; ').find((item) => item.startsWith('society_csrf='));
    return entry ? decodeURIComponent(entry.split('=')[1] ?? '') : '';
  });
  expect(csrfToken).not.toBe('');
  const response = await page.request.post(url, {
    headers: { 'content-type': 'application/json', 'x-csrf-token': csrfToken },
    data: body,
  });
  expect(response.ok(), `${url} returned ${response.status()}: ${await response.text()}`).toBeTruthy();
  return (await response.json()) as T;
}

test('resident directory manages relationships, history and tenant isolation', async ({ page }) => {
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
  await page.locator('li').filter({ hasText: 'residents' }).locator('#mode-residents').selectOption('FULL');
  await page.getByLabel('Reason for residents change').fill('Enable resident management for playground verification');
  await page.locator('li').filter({ hasText: 'residents' }).getByRole('button', { name: 'Save' }).click();
  await expect(page.locator('#mode-residents')).toHaveValue('FULL');

  await page.goto('/residents');
  await expect(page.getByRole('heading', { name: 'Residents', exact: true })).toBeVisible();
  await page.getByLabel('Society', { exact: true }).selectOption({ label: societyName });

  const suffix = Date.now().toString().slice(-8);
  const residentName = `E2E Resident ${suffix}`;
  const phone = `98765${suffix.slice(-5)}`;

  await page.getByLabel('Name', { exact: true }).fill(residentName);
  await page.getByLabel('Phone', { exact: true }).fill(phone);
  await page.getByLabel('Resident type', { exact: true }).selectOption('OWNER');
  await page.getByRole('button', { name: 'Add resident' }).click();
  await expect(page.getByText('Resident added.')).toBeVisible();

  await page.getByLabel('Search').fill(residentName);
  const residentRow = page.locator('tr').filter({ hasText: residentName });
  await expect(residentRow).toContainText('OWNER');
  await residentRow.getByRole('button', { name: 'View' }).click();
  await expect(page.getByRole('heading', { name: residentName })).toBeVisible();

  await page.getByLabel('Family name').fill(`E2E Family ${suffix}`);
  await page.getByLabel('Relationship').selectOption('SPOUSE');
  await page.getByRole('button', { name: 'Add family member' }).click();
  await expect(page.getByText('Family member added.')).toBeVisible();
  await expect(page.locator('li').filter({ hasText: `E2E Family ${suffix}` })).toBeVisible();

  const vehicleNumber = `MH12E2${suffix.slice(-4)}`;
  await page.getByLabel('Registration number').fill(vehicleNumber);
  await page.getByLabel('Vehicle type').selectOption('CAR');
  await page.getByRole('button', { name: 'Register vehicle' }).click();
  await expect(page.getByText('Vehicle registered.')).toBeVisible();
  await expect(page.locator('li').filter({ hasText: vehicleNumber })).toBeVisible();

  const activeSocietyId = await societyId(page, societyName);
  const buildingNumber = Date.now().toString().slice(-6);
  const building = await postJson<{ id: string }>(page, `/api/v1/societies/${activeSocietyId}/buildings`, {
    name: `E2E Block ${buildingNumber}`,
    code: `R${buildingNumber}`,
    floorCount: 1,
  });
  const floor = await postJson<{ id: string }>(page, `/api/v1/buildings/${building.id}/floors`, {
    buildingId: building.id,
    societyId: activeSocietyId,
    name: 'Ground',
    floorNumber: 0,
  });
  const flatNumber = `R-${buildingNumber}`;
  await postJson<{ id: string }>(page, `/api/v1/floors/${floor.id}/flats`, {
    floorId: floor.id,
    buildingId: building.id,
    societyId: activeSocietyId,
    number: flatNumber,
  });

  await page.reload();
  await page.getByLabel('Society', { exact: true }).selectOption({ label: societyName });
  await page.getByLabel('Search').fill(residentName);
  await page.locator('tr').filter({ hasText: residentName }).getByRole('button', { name: 'View' }).click();
  await page.getByLabel('Record type').selectOption('OWNERSHIP');
  await page.getByLabel('Flat', { exact: true }).selectOption({ label: `E2E Block ${buildingNumber} / ${flatNumber}` });
  await page.getByLabel('Resident', { exact: true }).selectOption({ label: residentName });
  await page.getByLabel('From date').fill('2026-01-01');
  await page.getByLabel('Ownership share %').fill('100');
  await page.getByLabel('Primary owner').check();
  await page.getByRole('button', { name: 'Add ownership record' }).click();
  await expect(page.getByText('OWNERSHIP record added.')).toBeVisible();
  await expect(page.locator('li').filter({ hasText: flatNumber }).first()).toBeVisible();

  const outOfScope = await page.request.get('/api/v1/societies/00000000-0000-4000-8000-000000000000/residents');
  expect(outOfScope.status()).toBe(404);
  expect((await outOfScope.json()).error.code).toBe('NOT_FOUND');

  page.once('dialog', (dialog) => void dialog.accept());
  await page.locator('tr').filter({ hasText: residentName }).getByRole('button', { name: 'Archive' }).click();
  await expect(page.getByText('Resident archived.')).toBeVisible();
  await page.getByLabel('Filter by status', { exact: true }).selectOption('INACTIVE');
  await expect(page.locator('tr').filter({ hasText: residentName })).toBeVisible();
});

async function societyId(page: Page, name: string): Promise<string> {
  const response = await page.request.get('/api/v1/companies');
  const companies = (await response.json()) as { items: Array<{ id: string; code: string }> };
  const company = companies.items.find((item) => item.code === companyCode)!;
  const societiesResponse = await page.request.get(`/api/v1/companies/${company.id}/societies`);
  expect(societiesResponse.ok()).toBeTruthy();
  const societies = (await societiesResponse.json()) as { items: Array<{ id: string; name: string }> } | Array<{ id: string; name: string }>;
  const rows = Array.isArray(societies) ? societies : societies.items;
  const society = rows.find((item) => item.name === name);
  expect(society).toBeDefined();
  return society!.id;
}
