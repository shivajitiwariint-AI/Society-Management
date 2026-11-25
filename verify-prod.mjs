import { readFile } from 'node:fs/promises';
const envRaw = await readFile('.env', 'utf8');
const envVal = (k) => envRaw.match(new RegExp(`^${k}\\s*=\\s*(.+)$`, 'm'))?.[1].trim().replace(/^["']|["']$/g, '');
const base = process.env.BASE_URL ?? 'https://society-management-zeta-eight.vercel.app';
const jar = {};
async function req(path, init = {}) {
  const r = await fetch(base + path, { ...init, headers: { ...(init.headers ?? {}) } });
  const set = r.headers.get('set-cookie');
  if (set) set.split(/,(?=\s*[^;,]+=)/).forEach((c) => {
    const [k, v] = c.trim().split(';')[0].split('=');
    jar[k] = v;
  });
  const text = await r.text();
  return { status: r.status, text: text.slice(0, 400), contentType: r.headers.get('content-type') };
}
console.log('home:', await req('/'));
console.log('csrf:', await req('/api/v1/auth/csrf'));
console.log('cookie names:', Object.keys(jar));
const csrf = jar['society_csrf'];
console.log('csrf present:', Boolean(csrf));
console.log('login:', await req('/api/v1/auth/login', {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-csrf-token': csrf ?? '', cookie: Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ') },
  body: JSON.stringify({ loginIntent: 'PLATFORM', email: 'superadmin@example.com', password: 'ChangeMe123!' }),
}));
