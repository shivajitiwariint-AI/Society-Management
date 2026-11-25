import { z } from 'zod';
import { createSocietySchema } from '@society/validation';
import { guardRequest } from '@/lib/api/guard';
import { apiError, apiSuccess } from '@/lib/api/response';
import { serviceError } from '@/lib/api/service-result';
import { createSociety, listSocieties } from '@/lib/services/society-service';

export const runtime = 'nodejs';

type RouteProps = { params: Promise<{ id: string }> };

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
  const { id: companyId } = await params;
  if (!z.uuid().safeParse(companyId).success) {
    return apiError(400, 'INVALID', 'Invalid company id', 'invalid-company-id');
  }
  const guard = await guardRequest(request, {
    moduleKey: 'company', resourceKey: 'society', action: 'READ', companyId,
  });
  if (!guard.ok) return guard.response;

  const result = await listSocieties(serviceContext(guard, request), companyId);
  return result.ok ? apiSuccess({ items: result.value }) : serviceError(result, guard.requestId);
}

export async function POST(request: Request, { params }: RouteProps) {
  const { id: companyId } = await params;
  if (!z.uuid().safeParse(companyId).success) {
    return apiError(400, 'INVALID', 'Invalid company id', 'invalid-company-id');
  }
  const guard = await guardRequest(request, {
    moduleKey: 'company', resourceKey: 'society', action: 'CREATE', companyId,
  });
  if (!guard.ok) return guard.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(400, 'VALIDATION_ERROR', 'A JSON body is required', guard.requestId);
  }
  const parsed = createSocietySchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, 'VALIDATION_ERROR', 'Invalid society payload', guard.requestId, parsed.error.flatten());
  }

  const result = await createSociety(serviceContext(guard, request), companyId, parsed.data);
  return result.ok ? apiSuccess(result.value, 201) : serviceError(result, guard.requestId);
}
