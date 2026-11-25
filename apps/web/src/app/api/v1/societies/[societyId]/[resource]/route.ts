import { z } from 'zod';
import {
  createOwnershipSchema,
  createResidentSchema,
  createTenancySchema,
  residentQuerySchema,
} from '@society/validation';
import { guardRequest } from '@/lib/api/guard';
import { apiError, apiSuccess } from '@/lib/api/response';
import { serviceError } from '@/lib/api/service-result';
import { toServiceContext } from '@/lib/api/service-context';
import {
  createOwnership,
  createResident,
  createTenancy,
  listResidents,
  type ResidentResource,
} from '@/lib/services/resident-service';

export const runtime = 'nodejs';

type RouteProps = { params: Promise<{ societyId: string; resource: string }> };
type SocietyResource = 'residents' | 'ownerships' | 'tenancies';
type ResourceMap = Record<SocietyResource, { permission: ResidentResource; label: string }>;

const RESOURCES: ResourceMap = {
  residents: { permission: 'resident', label: 'resident' },
  ownerships: { permission: 'ownership', label: 'ownership record' },
  tenancies: { permission: 'tenancy', label: 'tenancy record' },
};

function readResource(value: string): SocietyResource | null {
  return value in RESOURCES ? (value as SocietyResource) : null;
}

export async function GET(request: Request, { params }: RouteProps) {
  const { societyId, resource: rawResource } = await params;
  const resource = readResource(rawResource);
  if (!z.uuid().safeParse(societyId).success || resource !== 'residents') {
    return apiError(404, 'NOT_FOUND', 'Resource not found', 'unknown-resource');
  }

  const searchParams = new URL(request.url).searchParams;
  const query = residentQuerySchema.safeParse(
    Object.fromEntries([...searchParams.entries()].filter(([, value]) => value !== '')),
  );
  if (!query.success) {
    return apiError(400, 'VALIDATION_ERROR', 'Invalid resident filters', 'invalid-resident-query', query.error.flatten());
  }

  const guard = await guardRequest(request, {
    moduleKey: 'residents', resourceKey: 'resident', action: 'READ', societyId,
  });
  if (!guard.ok) return guard.response;

  const result = await listResidents(
    toServiceContext(guard, request),
    guard.context.activeCompanyId!,
    societyId,
    query.data,
  );
  return result.ok ? apiSuccess(result.value) : serviceError(result, guard.requestId);
}

export async function POST(request: Request, { params }: RouteProps) {
  const { societyId, resource: rawResource } = await params;
  const resource = readResource(rawResource);
  if (!z.uuid().safeParse(societyId).success || !resource) {
    return apiError(404, 'NOT_FOUND', 'Resource not found', 'unknown-resource');
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(400, 'VALIDATION_ERROR', 'A JSON body is required', 'invalid-json');
  }

  const guard = await guardRequest(request, {
    moduleKey: 'residents', resourceKey: RESOURCES[resource].permission, action: 'CREATE', societyId,
  });
  if (!guard.ok) return guard.response;

  const service = toServiceContext(guard, request);
  const companyId = guard.context.activeCompanyId!;

  if (resource === 'residents') {
    const parsed = createResidentSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(400, 'VALIDATION_ERROR', 'Invalid resident payload', 'invalid-resident', parsed.error.flatten());
    }
    const result = await createResident(service, companyId, societyId, parsed.data);
    return result.ok ? apiSuccess(result.value, 201) : serviceError(result, guard.requestId);
  }

  if (resource === 'ownerships') {
    const parsed = createOwnershipSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(400, 'VALIDATION_ERROR', 'Invalid ownership payload', 'invalid-ownership', parsed.error.flatten());
    }
    const result = await createOwnership(service, companyId, societyId, parsed.data);
    return result.ok ? apiSuccess(result.value, 201) : serviceError(result, guard.requestId);
  }

  const parsed = createTenancySchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, 'VALIDATION_ERROR', 'Invalid tenancy payload', 'invalid-tenancy', parsed.error.flatten());
  }
  const result = await createTenancy(service, companyId, societyId, parsed.data);
  return result.ok ? apiSuccess(result.value, 201) : serviceError(result, guard.requestId);
}
