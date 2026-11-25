import { config as loadDotenv } from 'dotenv';
import { defineConfig } from 'prisma/config';

// Root .env is shared by the app and Prisma CLI (workspace cwd is packages/database).
loadDotenv({ path: '../../.env' });

// `prisma generate` must work before credentials are configured; migrate/seed
// use the same single DATABASE_URL as the running web app.
const databaseUrl =
  process.env.DATABASE_URL ?? 'mysql://society_app:placeholder@127.0.0.1:3306/society_management';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: { url: databaseUrl },
  migrations: { path: 'prisma/migrations' },
});
