import { chromium } from 'playwright';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { prisma } from '@society/database';

const raw = await readFile('.env', 'utf8');
const get = (k) => raw.match(new RegExp(`^${k}\\s*=\\s*(.+)$`, 'm'))?.[1].trim().replace(/^["']|["']$/g, '');
const base = 'https://society-management-zeta-eight.vercel.app';
const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();
await page.goto(`${base}/admin/login`);
await page.getByLabel('Email address').fill(get('SEED_SUPERADMIN_EMAIL'));
await page.getByLabel('Password').fill(get('SEED_SUPERADMIN_PASSWORD'));
await page.getByRole('button', { name: /sign in/i }).click();
await page.waitForURL(/\/companies$/, { timeout: 40000 });

const token = (await context.cookies()).find((c) => c.name === 'society_session')?.value;
const hash = createHash('sha256').update(token).digest('hex');
await prisma.session.updateMany({ where: { tokenHash: hash }, data: { revokedAt: new Date() } });
console.log('revoked current session');

const redirects = [];
page.on('framenavigated', (frame) => { if (frame === page.mainFrame()) redirects.push(frame.url()); });
let finalUrl = '';
let error = '';
try {
  const res = await page.goto(`${base}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  finalUrl = page.url();
  console.log('status', res?.status());
} catch (e) {
  error = e.message.slice(0, 200);
}
console.log('finalUrl', finalUrl || '(none)');
console.log('navigations', redirects.slice(0, 12));
console.log('error', error);
await browser.close();
await prisma.$disconnect();
