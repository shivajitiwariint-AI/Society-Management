import { z } from 'zod';
import { getOperationDefinition, type ModuleKey } from '@society/shared';
import { updateOperationSchema } from '@society/validation';
import { guardRequest } from '@/lib/api/guard';
import { apiError, apiSuccess } from '@/lib/api/response';
import { serviceError } from '@/lib/api/service-result';
import { toServiceContext } from '@/lib/api/service-context';
import { deleteOperation, getOperation, updateOperation } from '@/lib/services/operations-service';

export const runtime = 'nodejs';

type RouteProps = { params: Promise<{ moduleKey: string; resourceKey: string; id: string }> };

function readDefinition(moduleKey: string, resourceKey: string) {
  const definition = getOperationDefinition(moduleKey, resourceKey);
  if (!definition) {
    return { error: apiError(404, 'NOT_FOUND', 'Operation resource not found', 'unknown-operation-resource') };
  }
  return { definition };
}

export async function GET(request: Request, { params }: RouteProps) {
  const { moduleKey, resourceKey, id } = await params;
  const definitionResult = readDefinition(moduleKey, resourceKey);
  if (definitionResult.error) return definitionResult.error;
  const definition = definitionResult.definition;
  if (!z.uuid().safeParse(id).success) return apiError(400, 'INVALID', 'Invalid record id', 'invalid-record-id');

  const societyId = new URL(request.url).searchParams.get('societyId') ?? undefined;
  if (!societyId || !z.uuid().safeParse(societyId).success) {
    return apiError(400, 'INVALID', 'A valid societyId query parameter is required', 'invalid-society-id');
  }

  const guard = await guardRequest(request, {
    moduleKey: definition.moduleKey as ModuleKey,
    resourceKey: definition.resourceKey,
    action: 'READ',
    societyId,
  });
  if (!guard.ok) return guard.response;

  const result = await getOperation(
    toServiceContext(guard, request),
    guard.context.activeCompanyId!,
    societyId,
    definition.moduleKey,
    definition.resourceKey,
    id,
  );
  return result.ok ? apiSuccess(result.value) : serviceError(result, guard.requestId);
}

export async function PATCH(request: Request, { params }: RouteProps) {
  const { moduleKey, resourceKey, id } = await params;
  const definitionResult = readDefinition(moduleKey, resourceKey);
  if (definitionResult.error) return definitionResult.error;
  const definition = definitionResult.definition;
  if (!z.uuid().safeParse(id).success) return apiError(400, 'INVALID', 'Invalid record id', 'invalid-record-id');

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(400, 'VALIDATION_ERROR', 'A JSON body is required', 'invalid-json');
  }
  const raw = body as Record<string, unknown>;
  const societyId = raw.societyId;
  if (typeof societyId !== 'string' || !z.uuid().safeParse(societyId).success) {
    return apiError(400, 'INVALID', 'A valid societyId is required', 'invalid-society-id');
  }
  const { id: _id, societyId: _societyId, ...updateBody } = raw;
  const parsed = updateOperationSchema.safeParse(updateBody);
  if (!parsed.success) {
    return apiError(400, 'VALIDATION_ERROR', 'Invalid operation payload', 'invalid-operation', parsed.error.flatten());
  }

  const guard = await guardRequest(request, {
    moduleKey: definition.moduleKey as ModuleKey,
    resourceKey: definition.resourceKey,
    action: 'UPDATE',
    societyId,
  });
  if (!guard.ok) return guard.response;

  const data = parsed.data as Record<string, unknown>;
  const result = await updateOperation(
    toServiceContext(guard, request),
    guard.context.activeCompanyId!,
    societyId,
    definition.moduleKey,
    definition.resourceKey,
    id,
    data,
  );
  return result.ok ? apiSuccess(result.value) : serviceError(result, guard.requestId);
}

export async function DELETE(request: Request, { params }: RouteProps) {
  const { moduleKey, resourceKey, id } = await params;
  const definitionResult = readDefinition(moduleKey, resourceKey);
  if (definitionResult.error) return definitionResult.error;
  const definition = definitionResult.definition;
  if (!z.uuid().safeParse(id).success) return apiError(400, 'INVALID', 'Invalid record id', 'invalid-record-id');

  const societyId = new URL(request.url).searchParams.get('societyId') ?? undefined;
  if (!societyId || !z.uuid().safeParse(societyId).success) {
    return apiError(400, 'INVALID', 'A valid societyId query parameter is required', 'invalid-society-id');
  }

  const guard = await guardRequest(request, {
    moduleKey: definition.moduleKey as ModuleKey,
    resourceKey: definition.resourceKey,
    action: 'DELETE',
    societyId,
  });
  if (!guard.ok) return guard.response;

  const result = await deleteOperation(
    toServiceContext(guard, request),
    guard.context.activeCompanyId!,
    societyId,
    definition.moduleKey,
    definition.resourceKey,
    id,
  );
  return result.ok ? apiSuccess(result.value) : serviceError(result, guard.requestId);
}
