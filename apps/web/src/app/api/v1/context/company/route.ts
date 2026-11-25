import { switchCompanySchema } from '@society/validation';
import { recordAudit } from '@society/database';
import { guardRequest } from '@/lib/api/guard';
import { apiError, apiSuccess } from '@/lib/api/response';
import { switchActiveCompany } from '@/lib/auth/session';

export const runtime = 'nodejs';

/** Switches the server-side tenant scope stored on the opaque session. */
export async function POST(request: Request) {
  const guard = await guardRequest(request);
  if (!guard.ok) return guard.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(400, 'VALIDATION_ERROR', 'A JSON body is required', guard.requestId);
  }
  const parsed = switchCompanySchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, 'VALIDATION_ERROR', 'Invalid workspace selection', guard.requestId, parsed.error.flatten());
  }

  const { companyId, societyId = null } = parsed.data;
  const switched = await switchActiveCompany(companyId, societyId);
  await recordAudit({
    companyId,
    societyId,
    actorUserId: guard.actorUserId,
    action: 'CONTEXT_SWITCHED',
    resourceType: 'session',
    resourceId: companyId,
    result: switched ? 'SUCCESS' : 'DENIED',
    reason: switched ? 'Active tenant scope changed' : 'Membership or society scope rejected',
    requestId: guard.requestId,
    ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
    userAgent: request.headers.get('user-agent') ?? null,
  });

  if (!switched) {
    return apiError(403, 'NO_ACTIVE_MEMBERSHIP', 'That workspace is not available to this account', guard.requestId);
  }
  return apiSuccess({ ok: true, activeCompanyId: companyId, activeSocietyId: societyId });
}
