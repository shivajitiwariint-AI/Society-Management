import mariadb from 'mariadb';
import { config as loadDotenv } from 'dotenv';
import { hashPassword, verifyPassword } from './apps/web/src/lib/auth/password.ts';
loadDotenv({ path: '.env' });
const password = process.env.SEED_SUPERADMIN_PASSWORD;
const email = (process.env.SEED_SUPERADMIN_EMAIL ?? 'superadmin@example.com').toLowerCase();
const newHash = await hashPassword(password);
const conn = await mariadb.createConnection({
  host: 'gateway01.ap-southeast-1.prod.aws.tidbcloud.com',
  port: 4000,
  user: '2oZ11H5Zrv6DURe.root',
  password: process.env.DBPASS,
  database: 'society_management',
  ssl: { rejectUnauthorized: false },
  connectTimeout: 20000,
});
await conn.query('UPDATE User SET passwordHash = ? WHERE email = ?', [newHash, 'shivajitiwariint@gmail.com']);
const rows = await conn.query('SELECT passwordHash FROM User WHERE email = ?', ['shivajitiwariint@gmail.com']);
console.log('rows:', rows.length, 'updated, verifies:', await verifyPassword(rows[0].passwordHash, password));
await conn.end();
