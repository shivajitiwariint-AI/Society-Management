import { readFile } from 'node:fs/promises';
const raw = await readFile('.env', 'utf8');
const get = (k) => raw.match(new RegExp(`^${k}\\s*=\\s*(.+)$`, 'm'))?.[1].trim().replace(/^["']|["']$/g, '');
const token = get('VERCEL_TOKEN');
const headers = { Authorization: `Bearer ${token}`, 'content-type': 'application/json' };
const list = await (await fetch('https://api.vercel.com/v9/projects/society-management/env', { headers })).json();
for (const key of ['DATABASE_URL', 'SESSION_COOKIE_SECRET', 'CSRF_SECRET']) {
  const value = get(key);
  const existing = (list.envs ?? []).find((e) => e.key === key && e.target.includes('production'));
  if (!value || !existing) { console.log(key, 'missing', Boolean(value), Boolean(existing)); continue; }
  const r = await fetch(`https://api.vercel.com/v9/projects/society-management/env/${existing.id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ value, target: ['production'] }),
  });
  const body = await r.json();
  console.log(key, r.status, body.error?.message ?? 'updated');
}
