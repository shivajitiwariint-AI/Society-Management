import { adminResetPasswordSchema, idSchema } from '@society/validation';
import { guardRequest } from '@/lib/api/guard';
import { apiError, apiSuccess } from '@/lib/api/response';
import { toServiceContext } from '@/lib/api/service-context';
import { resetUserPassword } from '@/lib/services/user-service';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string }> };

/** Platform super admins (or company admins in scope) reset a tenant user's password. */
export async function POST(request: Request, { params }: RouteContext) {
  const guard = await guardRequest(request);
  if (!guard.ok) return guard.response;

  const id = idSchema.safeParse((await params).id);
  if (!id.success) return apiError(400, 'VALIDATION_ERROR', 'Invalid user id', guard.requestId);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(400, 'VALIDATION_ERROR', 'A JSON body is required', guard.requestId);
  }
  const parsed = adminResetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, 'VALIDATION_ERROR', 'Invalid password reset payload', guard.requestId, parsed.error.flatten());
  }

  const result = await resetUserPassword(
    toServiceContext(guard, request),
    id.data,
    parsed.data.newPassword,
    parsed.data.reason,
  );
  if (!result.ok) {
    const status = result.code === 'PERMISSION_DENIED' ? 403 : result.code === 'NOT_FOUND' ? 404 : 400;
    return apiError(status, result.code, result.message, guard.requestId);
  }
  return apiSuccess({ ok: true, userId: result.value.userId, sessionsRevoked: result.value.sessionsRevoked });
}
