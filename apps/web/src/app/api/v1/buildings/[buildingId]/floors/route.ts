import { z } from 'zod';
import { createFloorSchema } from '@society/validation';
import { guardRequest } from '@/lib/api/guard';
import { apiError, apiSuccess } from '@/lib/api/response';
import { serviceError } from '@/lib/api/service-result';
import { createFloor } from '@/lib/services/society-service';

export const runtime = 'nodejs';

type RouteProps = { params: Promise<{ buildingId: string }> };

const bodySchema = createFloorSchema.extend({ societyId: z.uuid() });

function serviceContext(guard: Extract<Awaited<ReturnType<typeof guardRequest>>, { ok: true }>, request: Request) {
  return {
    context: guard.context,
    actorUserId: guard.actorUserId,
    requestId: guard.requestId,
    ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
    userAgent: request.headers.get('user-agent') ?? null,
  };
}

export async function POST(request: Request, { params }: RouteProps) {
  const { buildingId } = await params;
  if (!z.uuid().safeParse(buildingId).success) {
    return apiError(400, 'INVALID', 'Invalid building id', 'invalid-building-id');
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(400, 'VALIDATION_ERROR', 'A JSON body is required', 'invalid-json');
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, 'VALIDATION_ERROR', 'Invalid floor payload', 'invalid-floor', parsed.error.flatten());
  }

  const guard = await guardRequest(request, {
    moduleKey: 'society-foundation', resourceKey: 'floor', action: 'CREATE', societyId: parsed.data.societyId,
  });
  if (!guard.ok) return guard.response;

  const result = await createFloor(
    serviceContext(guard, request),
    guard.context.activeCompanyId!,
    parsed.data.societyId,
    buildingId,
    parsed.data,
  );
  return result.ok ? apiSuccess(result.value, 201) : serviceError(result, guard.requestId);
}
