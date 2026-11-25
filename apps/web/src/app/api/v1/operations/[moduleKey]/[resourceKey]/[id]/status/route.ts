import { z } from 'zod';
import { getOperationDefinition, type ModuleKey, type PermissionAction } from '@society/shared';
import { guardRequest } from '@/lib/api/guard';
import { apiError, apiSuccess } from '@/lib/api/response';
import { serviceError } from '@/lib/api/service-result';
import { toServiceContext } from '@/lib/api/service-context';
import { setOperationStatus } from '@/lib/services/operations-service';

export const runtime = 'nodejs';

type RouteProps = { params: Promise<{ moduleKey: string; resourceKey: string; id: string }> };

const bodySchema = z.object({
  status: z.string().trim().min(1).max(40),
  societyId: z.uuid(),
  action: z.enum(['UPDATE', 'APPROVE', 'REJECT', 'CLOSE', 'CANCEL', 'EXPORT']).default('UPDATE'),
}).strict();

export async function POST(request: Request, { params }: RouteProps) {
  const { moduleKey, resourceKey, id } = await params;
  const definition = getOperationDefinition(moduleKey, resourceKey);
  if (!definition) return apiError(404, 'NOT_FOUND', 'Operation resource not found', 'unknown-operation-resource');
  if (!z.uuid().safeParse(id).success) return apiError(400, 'INVALID', 'Invalid record id', 'invalid-record-id');

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(400, 'VALIDATION_ERROR', 'A JSON body is required', 'invalid-json');
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, 'VALIDATION_ERROR', 'Invalid status payload', 'invalid-operation-status', parsed.error.flatten());
  }

  const guard = await guardRequest(request, {
    moduleKey: definition.moduleKey as ModuleKey,
    resourceKey: definition.resourceKey,
    action: parsed.data.action as PermissionAction,
    societyId: parsed.data.societyId,
  });
  if (!guard.ok) return guard.response;

  const result = await setOperationStatus(
    toServiceContext(guard, request),
    guard.context.activeCompanyId!,
    parsed.data.societyId,
    definition.moduleKey,
    definition.resourceKey,
    id,
    parsed.data.status,
    parsed.data.action as PermissionAction,
  );
  return result.ok ? apiSuccess(result.value) : serviceError(result, guard.requestId);
}
