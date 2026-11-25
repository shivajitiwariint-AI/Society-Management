import { idSchema, updateCompanyUserSchema } from '@society/validation';
import { guardRequest } from '@/lib/api/guard';
import { apiError, apiSuccess } from '@/lib/api/response';
import { serviceError } from '@/lib/api/service-result';
import { toServiceContext } from '@/lib/api/service-context';
import { updateCompanyUser } from '@/lib/services/platform-user-service';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string; userId: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const guard = await guardRequest(request, {
    moduleKey: 'company', resourceKey: 'membership', action: 'ASSIGN', platform: true,
  });
  if (!guard.ok) return guard.response;

  const { id, userId } = await params;
  if (!idSchema.safeParse(id).success || !idSchema.safeParse(userId).success) {
    return apiError(400, 'VALIDATION_ERROR', 'Invalid company or user id', guard.requestId);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(400, 'VALIDATION_ERROR', 'A JSON body is required', guard.requestId);
  }
  const parsed = updateCompanyUserSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, 'VALIDATION_ERROR', 'Invalid user update payload', guard.requestId, parsed.error.flatten());
  }

  const { reason, ...input } = parsed.data;
  const result = await updateCompanyUser(toServiceContext(guard, request), id, userId, input, reason);
  return result.ok ? apiSuccess(result.value) : serviceError(result, guard.requestId);
}
