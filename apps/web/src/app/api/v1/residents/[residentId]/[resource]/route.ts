import { z } from 'zod';
import { createFamilyMemberSchema, createVehicleSchema } from '@society/validation';
import { guardRequest } from '@/lib/api/guard';
import { apiError, apiSuccess } from '@/lib/api/response';
import { serviceError } from '@/lib/api/service-result';
import { toServiceContext } from '@/lib/api/service-context';
import {
  createFamilyMember,
  createVehicle,
  getResident,
  type ResidentResource,
} from '@/lib/services/resident-service';

export const runtime = 'nodejs';

type RouteProps = { params: Promise<{ residentId: string; resource: string }> };
type NestedResource = 'family-members' | 'vehicles';

const RESOURCES: Record<NestedResource, ResidentResource> = {
  'family-members': 'family-member',
  vehicles: 'vehicle',
};

function readResource(value: string): NestedResource | null {
  return value in RESOURCES ? (value as NestedResource) : null;
}

function societyIdFrom(request: Request): string | null {
  const value = new URL(request.url).searchParams.get('societyId');
  return value && z.uuid().safeParse(value).success ? value : null;
}

export async function GET(request: Request, { params }: RouteProps) {
  const { residentId, resource: rawResource } = await params;
  const resource = readResource(rawResource);
  const societyId = societyIdFrom(request);
  if (!resource || !z.uuid().safeParse(residentId).success || !societyId) {
    return apiError(404, 'NOT_FOUND', 'Resource not found', 'unknown-resource');
  }

  const guard = await guardRequest(request, {
    moduleKey: 'residents', resourceKey: RESOURCES[resource], action: 'READ', societyId,
  });
  if (!guard.ok) return guard.response;

  const result = await getResident(toServiceContext(guard, request), guard.context.activeCompanyId!, societyId, residentId);
  if (!result.ok) return serviceError(result, guard.requestId);
  return apiSuccess(resource === 'family-members' ? result.value.familyMembers : result.value.vehicles);
}

export async function POST(request: Request, { params }: RouteProps) {
  const { residentId, resource: rawResource } = await params;
  const resource = readResource(rawResource);
  const societyId = societyIdFrom(request);
  if (!resource || !z.uuid().safeParse(residentId).success || !societyId) {
    return apiError(404, 'NOT_FOUND', 'Resource not found', 'unknown-resource');
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(400, 'VALIDATION_ERROR', 'A JSON body is required', 'invalid-json');
  }

  const guard = await guardRequest(request, {
    moduleKey: 'residents', resourceKey: RESOURCES[resource], action: 'CREATE', societyId,
  });
  if (!guard.ok) return guard.response;

  const service = toServiceContext(guard, request);
  const companyId = guard.context.activeCompanyId!;

  if (resource === 'family-members') {
    const parsed = createFamilyMemberSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(400, 'VALIDATION_ERROR', 'Invalid family member payload', 'invalid-family-member', parsed.error.flatten());
    }
    const result = await createFamilyMember(service, companyId, societyId, residentId, parsed.data);
    return result.ok ? apiSuccess(result.value, 201) : serviceError(result, guard.requestId);
  }

  const parsed = createVehicleSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, 'VALIDATION_ERROR', 'Invalid vehicle payload', 'invalid-vehicle', parsed.error.flatten());
  }
  const result = await createVehicle(service, companyId, societyId, residentId, parsed.data);
  return result.ok ? apiSuccess(result.value, 201) : serviceError(result, guard.requestId);
}
