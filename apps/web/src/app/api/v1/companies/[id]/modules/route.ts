import { idSchema } from '@society/validation';
import { entitlementChangeSchema } from '@society/validation';
import { guardRequest } from '@/lib/api/guard';
import { apiError, apiSuccess } from '@/lib/api/response';
import { changeEntitlement, listCompanyModules } from '@/lib/services/entitlement-service';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  const guard = await guardRequest(request, {
    moduleKey: 'company', resourceKey: 'settings', action: 'READ', platform: true,
  });
  if (!guard.ok) return guard.response;
  const id = idSchema.safeParse((await params).id);
  if (!id.success) return apiError(400, 'VALIDATION_ERROR', 'Invalid company id', guard.requestId);
  return apiSuccess({ items: await listCompanyModules(id.data) });
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const guard = await guardRequest(request, {
    moduleKey: 'company', resourceKey: 'settings', action: 'MANAGE_SETTINGS', platform: true,
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
  const parsed = entitlementChangeSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, 'VALIDATION_ERROR', 'Invalid entitlement payload', guard.requestId, parsed.error.flatten());
  }

  const result = await changeEntitlement(
    {
      context: guard.context,
      actorUserId: guard.actorUserId,
      requestId: guard.requestId,
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
      userAgent: request.headers.get('user-agent') ?? null,
    },
    id.data,
    parsed.data.moduleKey,
    parsed.data.accessMode,
    parsed.data.reason,
  );
  if (!result.ok) {
    return apiError(result.code === 'INVALID' ? 400 : 403, result.code, result.message, guard.requestId);
  }
  return apiSuccess(result.value);
}
