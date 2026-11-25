import { adminUpdateUserEmailSchema, idSchema } from '@society/validation';
import { guardRequest } from '@/lib/api/guard';
import { apiError, apiSuccess } from '@/lib/api/response';
import { serviceError } from '@/lib/api/service-result';
import { toServiceContext } from '@/lib/api/service-context';
import { updateUserEmail } from '@/lib/services/user-service';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string }> };

/** Platform/company administrator changes a tenant user's login email. */
export async function PATCH(request: Request, { params }: RouteContext) {
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
  const parsed = adminUpdateUserEmailSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, 'VALIDATION_ERROR', 'Invalid email update payload', guard.requestId, parsed.error.flatten());
  }

  const result = await updateUserEmail(
    toServiceContext(guard, request),
    id.data,
    parsed.data.newEmail,
    parsed.data.reason,
  );
  return result.ok ? apiSuccess(result.value) : serviceError(result, guard.requestId);
}
