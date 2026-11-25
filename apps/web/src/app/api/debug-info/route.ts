import { prisma } from '@society/database';
import { apiSuccess } from '@/lib/api/response';

export const runtime = 'nodejs';

export async function GET() {
  const raw = process.env.DATABASE_URL ?? '';
  let host = 'unset';
  let db = '';
  try {
    const url = new URL(raw);
    host = url.host;
    db = url.pathname;
  } catch { /* ignore */ }
  const users = await prisma.user.findMany({ select: { email: true }, take: 5 });
  return apiSuccess({ host, db, users: users.map((user) => user.email) });
}
