import { z } from 'zod';
import {
  updateFamilyMemberSchema,
  updateOwnershipSchema,
  updateResidentSchema,
  updateTenancySchema,
  updateVehicleSchema,
} from '@society/validation';
import { guardRequest } from '@/lib/api/guard';
import { apiError, apiSuccess } from '@/lib/api/response';
import { serviceError } from '@/lib/api/service-result';
import { toServiceContext } from '@/lib/api/service-context';
import {
  deactivateResident,
  deleteFamilyMember,
  deleteOwnership,
  deleteTenancy,
  deleteVehicle,
  getResident,
  updateFamilyMember,
  updateOwnership,
  updateResident,
  updateTenancy,
  updateVehicle,
  type ResidentResource,
} from '@/lib/services/resident-service';

export const runtime = 'nodejs';

type RouteProps = { params: Promise<{ resource: string; id: string }> };
type DetailResource = 'residents' | 'ownerships' | 'tenancies' | 'family-members' | 'vehicles';

const RESOURCES: Record<DetailResource, ResidentResource> = {
  residents: 'resident',
  ownerships: 'ownership',
  tenancies: 'tenancy',
  'family-members': 'family-member',
  vehicles: 'vehicle',
};

function readResource(value: string): DetailResource | null {
  return value in RESOURCES ? (value as DetailResource) : null;
}

function societyIdFrom(request: Request): string | null {
  const value = new URL(request.url).searchParams.get('societyId');
  return value && z.uuid().safeParse(value).success ? value : null;
}

async function parseBody(request: Request, resource: DetailResource): Promise<{ ok: true; data: unknown } | { ok: false; response: ReturnType<typeof apiError> }> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { ok: false, response: apiError(400, 'VALIDATION_ERROR', 'A JSON body is required', 'invalid-json') };
  }

  const schemas = {
    residents: updateResidentSchema,
    ownerships: updateOwnershipSchema,
    tenancies: updateTenancySchema,
    'family-members': updateFamilyMemberSchema,
    vehicles: updateVehicleSchema,
  } as const;
  const parsed = schemas[resource].safeParse(body);
  if (!parsed.success) {
    return {
      ok: false,
      response: apiError(400, 'VALIDATION_ERROR', `Invalid ${RESOURCES[resource]} payload`, `invalid-${resource}`, parsed.error.flatten()),
    };
  }
  return { ok: true, data: parsed.data };
}

export async function GET(request: Request, { params }: RouteProps) {
  const { resource: rawResource, id } = await params;
  const resource = readResource(rawResource);
  const societyId = societyIdFrom(request);
  if (!resource || resource !== 'residents' || !z.uuid().safeParse(id).success || !societyId) {
    return apiError(404, 'NOT_FOUND', 'Resource not found', 'unknown-resource');
  }

  const guard = await guardRequest(request, {
    moduleKey: 'residents', resourceKey: 'resident', action: 'READ', societyId,
  });
  if (!guard.ok) return guard.response;

  const result = await getResident(toServiceContext(guard, request), guard.context.activeCompanyId!, societyId, id);
  return result.ok ? apiSuccess(result.value) : serviceError(result, guard.requestId);
}

export async function PATCH(request: Request, { params }: RouteProps) {
  const { resource: rawResource, id } = await params;
  const resource = readResource(rawResource);
  const societyId = societyIdFrom(request);
  if (!resource || !z.uuid().safeParse(id).success || !societyId) {
    return apiError(404, 'NOT_FOUND', 'Resource not found', 'unknown-resource');
  }

  const parsed = await parseBody(request, resource);
  if (!parsed.ok) return parsed.response;

  const guard = await guardRequest(request, {
    moduleKey: 'residents', resourceKey: RESOURCES[resource], action: 'UPDATE', societyId,
  });
  if (!guard.ok) return guard.response;

  const service = toServiceContext(guard, request);
  const companyId = guard.context.activeCompanyId!;
  const data = parsed.data as never;

  switch (resource) {
    case 'residents': {
      const result = await updateResident(service, companyId, societyId, id, data);
      return result.ok ? apiSuccess(result.value) : serviceError(result, guard.requestId);
    }
    case 'ownerships': {
      const result = await updateOwnership(service, companyId, societyId, id, data);
      return result.ok ? apiSuccess(result.value) : serviceError(result, guard.requestId);
    }
    case 'tenancies': {
      const result = await updateTenancy(service, companyId, societyId, id, data);
      return result.ok ? apiSuccess(result.value) : serviceError(result, guard.requestId);
    }
    case 'family-members': {
      const result = await updateFamilyMember(service, companyId, societyId, id, data);
      return result.ok ? apiSuccess(result.value) : serviceError(result, guard.requestId);
    }
    case 'vehicles': {
      const result = await updateVehicle(service, companyId, societyId, id, data);
      return result.ok ? apiSuccess(result.value) : serviceError(result, guard.requestId);
    }
  }
}

export async function DELETE(request: Request, { params }: RouteProps) {
  const { resource: rawResource, id } = await params;
  const resource = readResource(rawResource);
  const societyId = societyIdFrom(request);
  if (!resource || !z.uuid().safeParse(id).success || !societyId) {
    return apiError(404, 'NOT_FOUND', 'Resource not found', 'unknown-resource');
  }

  const guard = await guardRequest(request, {
    moduleKey: 'residents', resourceKey: RESOURCES[resource], action: 'DELETE', societyId,
  });
  if (!guard.ok) return guard.response;

  const service = toServiceContext(guard, request);
  const companyId = guard.context.activeCompanyId!;

  switch (resource) {
    case 'residents': {
      const result = await deactivateResident(service, companyId, societyId, id);
      return result.ok ? apiSuccess(result.value) : serviceError(result, guard.requestId);
    }
    case 'ownerships': {
      const result = await deleteOwnership(service, companyId, societyId, id);
      return result.ok ? apiSuccess(result.value) : serviceError(result, guard.requestId);
    }
    case 'tenancies': {
      const result = await deleteTenancy(service, companyId, societyId, id);
      return result.ok ? apiSuccess(result.value) : serviceError(result, guard.requestId);
    }
    case 'family-members': {
      const result = await deleteFamilyMember(service, companyId, societyId, id);
      return result.ok ? apiSuccess(result.value) : serviceError(result, guard.requestId);
    }
    case 'vehicles': {
      const result = await deleteVehicle(service, companyId, societyId, id);
      return result.ok ? apiSuccess(result.value) : serviceError(result, guard.requestId);
    }
  }
}
