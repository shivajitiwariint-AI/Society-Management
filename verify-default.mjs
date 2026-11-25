import { chromium } from 'playwright';
const base = 'https://society-management-zeta-eight.vercel.app';
const browser = await chromium.launch();
const page = await browser.newPage();
const stamp = Date.now();
const code = `def-${stamp}`;
const email = `default-${stamp}@example.com`;
const password = 'VerifyPass123!';

await page.goto(`${base}/register`);
await page.waitForLoadState('domcontentloaded');
const csrf = await page.evaluate(() => document.cookie.split('; ').find((c) => c.startsWith('society_csrf='))?.split('=')[1]);
const reg = await page.evaluate(async ({ code, email, password, csrf }) => {
  const r = await fetch('/api/v1/auth/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-csrf-token': csrf },
    body: JSON.stringify({
      name: `Default Test ${Date.now()}`, code, countryCode: 'IN', currencyCode: 'INR',
      timezone: 'Asia/Kolkata', adminName: 'Default Test', adminEmail: email, adminPassword: password,
    }),
  });
  return { status: r.status, body: await r.json() };
}, { code, email, password, csrf });
console.log('register:', reg.status, JSON.stringify(reg.body).slice(0, 300));

await page.goto(`${base}/login`);
await page.getByLabel('Email address').fill(email);
await page.getByLabel('Password').fill(password);
await page.getByRole('button', { name: /sign in/i }).click();
await page.waitForURL(/\/dashboard$/, { timeout: 40000 });
const ctx = await page.evaluate(async () => await (await fetch('/api/v1/auth/context')).json());
console.log('default modules:', ctx.modules);
await browser.close();
