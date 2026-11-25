import { newId } from '@society/shared';
import { companyRegistrationSchema } from '@society/validation';
import { apiError, apiSuccess } from '@/lib/api/response';
import { assertLoginCsrf, issueSession } from '@/lib/auth/session';
import { registerCompany } from '@/lib/services/registration-service';

export const runtime = 'nodejs';

/** Anonymous, CSRF-protected tenant onboarding; authority is created in one transaction. */
export async function POST(request: Request) {
  const requestId = request.headers.get('x-request-id')?.slice(0, 64) || newId();
  const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
  const userAgent = request.headers.get('user-agent') ?? null;

  if (!(await assertLoginCsrf(request))) {
    return apiError(403, 'CSRF_INVALID', 'CSRF token is invalid or missing', requestId);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(400, 'VALIDATION_ERROR', 'A JSON body is required', requestId);
  }
  const parsed = companyRegistrationSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, 'VALIDATION_ERROR', 'Invalid registration request', requestId, parsed.error.flatten());
  }

  const result = await registerCompany(parsed.data, { requestId, ipAddress, userAgent });
  if (!result.ok) {
    return apiError(409, result.code === 'CONFLICT' ? 'CONFLICT' : 'VALIDATION_ERROR', result.message, requestId);
  }

  await issueSession(result.value.userId, { companyId: result.value.companyId, societyId: null });
  return apiSuccess({ ok: true, companyId: result.value.companyId }, 201);
}
