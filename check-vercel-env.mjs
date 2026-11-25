import { readFile } from 'node:fs/promises';
const raw = await readFile('.env', 'utf8');
const token = raw.match(/^VERCEL_TOKEN\s*=\s*(.+)$/m)?.[1].trim().replace(/^["']|["']$/g, '');
const r = await fetch('https://api.vercel.com/v9/projects/society-management/env', {
  headers: { Authorization: `Bearer ${token}` },
});
console.log('status:', r.status);
const body = await r.json();
for (const e of body.envs ?? []) {
  if (e.key === 'DATABASE_URL') {
    console.log('DATABASE_URL target:', e.target.join(','), 'length:', e.value?.length);
    console.log('host:', e.value?.match(/@([^/]+)/)?.[1]);
    console.log('suffix:', e.value?.slice(-30));
  } else {
    console.log(e.key, 'target:', e.target.join(','));
  }
}
