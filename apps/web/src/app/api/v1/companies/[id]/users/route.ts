import { createCompanyUserSchema, idSchema } from '@society/validation';
import { guardRequest } from '@/lib/api/guard';
import { apiError, apiSuccess } from '@/lib/api/response';
import { serviceError } from '@/lib/api/service-result';
import { toServiceContext } from '@/lib/api/service-context';
import { createCompanyUser } from '@/lib/services/platform-user-service';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  const guard = await guardRequest(request, {
    moduleKey: 'company', resourceKey: 'membership', action: 'ASSIGN', platform: true,
  });
  if (!guard.ok) return guard.response;

  const id = idSchema.safeParse((await params).id);
  if (!id.success) return apiError(400, 'VALIDATION_ERROR', 'Invalid company id', guard.requestId);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(400, 'VALIDATION_ERROR', 'A JSON body is required', guard.requestId);
  }
  const parsed = createCompanyUserSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, 'VALIDATION_ERROR', 'Invalid user payload', guard.requestId, parsed.error.flatten());
  }

  const { reason, ...input } = parsed.data;
  const result = await createCompanyUser(toServiceContext(guard, request), id.data, input, reason);
  return result.ok ? apiSuccess(result.value) : serviceError(result, guard.requestId);
}
