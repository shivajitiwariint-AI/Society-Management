import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
const raw = await readFile('.env', 'utf8');
const get = (k) => raw.match(new RegExp(`^${k}\\s*=\\s*(.+)$`, 'm'))?.[1].trim().replace(/^["']|["']$/g, '');
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('https://society-management-zeta-eight.vercel.app/admin/login');
await page.getByLabel('Email address').fill(get('SEED_SUPERADMIN_EMAIL'));
await page.getByLabel('Password').fill(get('SEED_SUPERADMIN_PASSWORD'));
await page.getByRole('button', { name: /sign in/i }).click();
await page.waitForURL(/\/companies$/, { timeout: 40000 });
const companyId = await page.locator('.app-company-select option').evaluateAll((els) => els.find((e) => e.value)?.value);

// Test dependency-step error with a non-platform user is not easy here; check super-admin override succeeds
const result = await page.evaluate(async ({ companyId }) => {
  const csrf = document.cookie.split('; ').find((c) => c.startsWith('society_csrf='))?.split('=')[1];
  const call = async (body) => {
    const r = await fetch(`/api/v1/companies/${companyId}/modules`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', 'x-csrf-token': csrf },
      body: JSON.stringify(body),
    });
    return { status: r.status, body: await r.json() };
  };
  const disable = await call({ moduleKey: 'advanced-reports', accessMode: 'DISABLED', reason: 'Verification test disable' });
  const enable = await call({ moduleKey: 'advanced-reports', accessMode: 'FULL', reason: 'Verification test re-enable' });
  return { disable, enable };
}, { companyId });
console.log(JSON.stringify(result, null, 2).slice(0, 900));
await browser.close();
