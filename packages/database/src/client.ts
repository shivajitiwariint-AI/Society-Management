import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { config as loadDotenv } from 'dotenv';
import { PrismaClient } from './generated/prisma/client';

// Workspace scripts may run with cwd = packages/database; load the root .env once.
const moduleDir = dirname(fileURLToPath(import.meta.url));
const rootEnvPath = resolve(moduleDir, '../../../.env');
if (!process.env.DATABASE_URL && existsSync(rootEnvPath)) {
  loadDotenv({ path: rootEnvPath });
}

function databaseConfig(): {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  ssl?: { rejectUnauthorized: boolean };
} {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error('DATABASE_URL is required (self-hosted MySQL, e.g. mysql://user:pass@127.0.0.1:3306/society_management)');
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('DATABASE_URL is not a valid URL');
  }
  if (url.protocol !== 'mysql:') throw new Error('Only the mysql protocol is supported (SRS 11.3)');
  const host = url.hostname || '127.0.0.1';
  const isPrivate =
    host === '127.0.0.1' ||
    host === 'localhost' ||
    host.startsWith('10.') ||
    host.startsWith('192.168.') ||
    host.startsWith('172.');
  const isManagedCloud = host.endsWith('.tidbcloud.com') || process.env.ALLOW_PUBLIC_DB_HOST === '1';
  if (!isPrivate && !isManagedCloud) {
    throw new Error('Database host must be localhost, a private network address, or an approved managed-cloud host');
  }
  return {
    host,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.replace(/^\//, '')),
    ...(isPrivate ? {} : { ssl: { rejectUnauthorized: true } }),
  };
}

/** Server-only. Never import this module into a Client Component. */
export function createPrismaClient(): PrismaClient {
  const config = databaseConfig();
  // Serverless functions are short-lived; a large pool exhausts TiDB Cloud's
  // per-client connection quota on cold start. Keep it small and let it grow
  // only if explicitly configured.
  const connectionLimit = Number(
    process.env.DB_POOL_LIMIT ?? (config.host.endsWith('.tidbcloud.com') ? 2 : 10),
  );
  const adapter = new PrismaMariaDb({
    ...config,
    connectionLimit: Math.max(1, Math.min(connectionLimit, 20)),
    acquireTimeout: 30_000,
    connectTimeout: 30_000,
  });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as { societyPrisma?: PrismaClient };

export const prisma: PrismaClient = globalForPrisma.societyPrisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.societyPrisma = prisma;
