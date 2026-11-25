import { z } from 'zod';
import { getOperationDefinition, type ModuleKey } from '@society/shared';
import { createOperationSchema, operationQuerySchema } from '@society/validation';
import { guardRequest } from '@/lib/api/guard';
import { apiError, apiSuccess } from '@/lib/api/response';
import { serviceError } from '@/lib/api/service-result';
import { toServiceContext } from '@/lib/api/service-context';
import { createOperation, listOperations } from '@/lib/services/operations-service';

export const runtime = 'nodejs';

type RouteProps = { params: Promise<{ moduleKey: string; resourceKey: string }> };

function readDefinition(moduleKey: string, resourceKey: string) {
  const definition = getOperationDefinition(moduleKey, resourceKey);
  if (!definition) {
    return { error: apiError(404, 'NOT_FOUND', 'Operation resource not found', 'unknown-operation-resource') };
  }
  return { definition };
}

export async function GET(request: Request, { params }: RouteProps) {
  const { moduleKey, resourceKey } = await params;
  const definitionResult = readDefinition(moduleKey, resourceKey);
  if (definitionResult.error) return definitionResult.error;
  const definition = definitionResult.definition;

  const searchParams = new URL(request.url).searchParams;
  const query = operationQuerySchema.safeParse(
    Object.fromEntries([...searchParams.entries()].filter(([key, value]) => key !== 'societyId' && value !== '')),
  );
  if (!query.success) {
    return apiError(400, 'VALIDATION_ERROR', 'Invalid operation filters', 'invalid-operation-query', query.error.flatten());
  }

  const societyId = searchParams.get('societyId') ?? undefined;
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

  const result = await listOperations(
    toServiceContext(guard, request),
    guard.context.activeCompanyId!,
    societyId,
    definition.moduleKey,
    definition.resourceKey,
    query.data,
  );
  return result.ok ? apiSuccess(result.value) : serviceError(result, guard.requestId);
}

export async function POST(request: Request, { params }: RouteProps) {
  const { moduleKey, resourceKey } = await params;
  const definitionResult = readDefinition(moduleKey, resourceKey);
  if (definitionResult.error) return definitionResult.error;
  const definition = definitionResult.definition;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(400, 'VALIDATION_ERROR', 'A JSON body is required', 'invalid-json');
  }
  const parsed = createOperationSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, 'VALIDATION_ERROR', 'Invalid operation payload', 'invalid-operation', parsed.error.flatten());
  }
  const societyId = (parsed.data.metadata as Record<string, unknown> | undefined)?.societyId;
  if (typeof societyId !== 'string' || !z.uuid().safeParse(societyId).success) {
    return apiError(400, 'INVALID', 'A valid societyId is required in metadata', 'invalid-society-id');
  }

  const guard = await guardRequest(request, {
    moduleKey: definition.moduleKey as ModuleKey,
    resourceKey: definition.resourceKey,
    action: 'CREATE',
    societyId,
  });
  if (!guard.ok) return guard.response;

  const { societyId: _societyId, ...metadata } = parsed.data.metadata as Record<string, unknown>;
  const result = await createOperation(
    toServiceContext(guard, request),
    guard.context.activeCompanyId!,
    societyId,
    definition.moduleKey,
    definition.resourceKey,
    { ...parsed.data, metadata },
  );
  return result.ok ? apiSuccess(result.value, 201) : serviceError(result, guard.requestId);
}
