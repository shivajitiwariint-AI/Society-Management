import { recordAudit } from '@society/database';
import { guardRequest } from '@/lib/api/guard';
import { apiSuccess } from '@/lib/api/response';
import { revokeSession } from '@/lib/auth/session';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const guard = await guardRequest(request);
  if (!guard.ok) return guard.response;
  await recordAudit({
    actorUserId: guard.actorUserId,
    action: 'LOGOUT',
    resourceType: 'session',
    result: 'SUCCESS',
    requestId: guard.requestId,
    ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
    userAgent: request.headers.get('user-agent') ?? null,
  });
  await revokeSession();
  return apiSuccess({ ok: true });
}
