import { hashPassword, verifyPassword } from './apps/web/src/lib/auth/password.ts';
const h = await hashPassword('TestPassword123');
console.log('self verify:', await verifyPassword(h, 'TestPassword123'));
console.log('hash prefix:', h.slice(0, 40));
