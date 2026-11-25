import { z } from 'zod';
import { createBuildingSchema } from '@society/validation';
import { guardRequest } from '@/lib/api/guard';
import { apiError, apiSuccess } from '@/lib/api/response';
import { serviceError } from '@/lib/api/service-result';
import { createBuilding, getProperty } from '@/lib/services/society-service';

export const runtime = 'nodejs';

type RouteProps = { params: Promise<{ societyId: string }> };

function serviceContext(guard: Extract<Awaited<ReturnType<typeof guardRequest>>, { ok: true }>, request: Request) {
  return {
    context: guard.context,
    actorUserId: guard.actorUserId,
    requestId: guard.requestId,
    ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
    userAgent: request.headers.get('user-agent') ?? null,
  };
}

export async function GET(request: Request, { params }: RouteProps) {
  const { societyId } = await params;
  if (!z.uuid().safeParse(societyId).success) {
    return apiError(400, 'INVALID', 'Invalid society id', 'invalid-society-id');
  }
  const guard = await guardRequest(request, {
    moduleKey: 'society-foundation', resourceKey: 'building', action: 'READ', societyId,
  });
  if (!guard.ok) return guard.response;

  const result = await getProperty(serviceContext(guard, request), guard.context.activeCompanyId!, societyId);
  return result.ok ? apiSuccess({ items: result.value.buildings }) : serviceError(result, guard.requestId);
}

export async function POST(request: Request, { params }: RouteProps) {
  const { societyId } = await params;
  if (!z.uuid().safeParse(societyId).success) {
    return apiError(400, 'INVALID', 'Invalid society id', 'invalid-society-id');
  }
  const guard = await guardRequest(request, {
    moduleKey: 'society-foundation', resourceKey: 'building', action: 'CREATE', societyId,
  });
  if (!guard.ok) return guard.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(400, 'VALIDATION_ERROR', 'A JSON body is required', guard.requestId);
  }
  const parsed = createBuildingSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, 'VALIDATION_ERROR', 'Invalid building payload', guard.requestId, parsed.error.flatten());
  }

  const result = await createBuilding(serviceContext(guard, request), guard.context.activeCompanyId!, societyId, parsed.data);
  return result.ok ? apiSuccess(result.value, 201) : serviceError(result, guard.requestId);
}
