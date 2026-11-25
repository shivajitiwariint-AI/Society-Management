import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
const raw = await readFile('.env', 'utf8');
const get = (k) => raw.match(new RegExp(`^${k}\\s*=\\s*(.+)$`, 'm'))?.[1].trim().replace(/^["']|["']$/g, '');
const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto('https://society-management-zeta-eight.vercel.app/admin/login');
await page.getByLabel('Email address').fill(get('SEED_SUPERADMIN_EMAIL'));
await page.getByLabel('Password').fill(get('SEED_SUPERADMIN_PASSWORD'));
await page.getByRole('button', { name: /sign in/i }).click();
await page.waitForURL(/\/companies$/, { timeout: 40000 });
const companyId = await page.locator('.app-company-select option').evaluateAll((els) => els.find((e) => e.value)?.value);
if (companyId) {
  await page.locator('.app-company-select').selectOption(companyId);
  await page.waitForTimeout(1500);
}
await page.goto('https://society-management-zeta-eight.vercel.app/societies/create');
await page.waitForLoadState('domcontentloaded');
await page.waitForTimeout(1500);
const text = await page.locator('main').innerText();
console.log('URL:', page.url());
console.log('error banner:', text.includes('Invalid society id'));
console.log('form visible:', text.includes('Register a society') && text.includes('Society name'));
console.log('text:', text.slice(0, 300).replace(/\n/g, ' | '));
console.log('errors:', errors);
await browser.close();
