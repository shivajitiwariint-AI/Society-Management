import { authorize, type AuthorizationRequest } from '@society/authorization';
import { newId } from '@society/shared';
import { prisma } from '@society/database';
import type {
  CreateBuildingInput,
  CreateFlatInput,
  CreateFloorInput,
  CreateSocietyInput,
} from '@society/validation';
import type { ServiceContext, ServiceResult } from './company-service';

type ReadResource = 'society' | 'building' | 'floor' | 'flat' | 'property';
type ResourceAction = 'CREATE' | 'READ' | 'UPDATE';

/**
 * Authorization is repeated inside the service (not only in the route guard),
 * and every query is filtered by the server-derived companyId. The composite
 * foreign keys in the schema are the final isolation boundary.
 */
function policy(
  companyId: string,
  resource: ReadResource,
  action: ResourceAction,
  societyId?: string,
): AuthorizationRequest {
  if (resource === 'society' || resource === 'property') {
    return { moduleKey: 'company', resourceKey: 'society', action, companyId };
  }
  return { moduleKey: 'society-foundation', resourceKey: resource, action, companyId, societyId };
}

function permitted(service: ServiceContext, request: AuthorizationRequest): boolean {
  return authorize(service.context, request).ok;
}

function denied<T>(message = 'The required permission is not granted within the current data scope'): ServiceResult<T> {
  return { ok: false, code: 'PERMISSION_DENIED', message };
}

export async function listSocieties(
  service: ServiceContext,
  companyId: string,
): Promise<ServiceResult<Array<{ id: string; name: string; registrationNumber: string | null; city: string | null }>>> {
  if (!permitted(service, policy(companyId, 'society', 'READ'))) return denied();
  const societies = await prisma.society.findMany({
    where: { companyId },
    select: { id: true, name: true, registrationNumber: true, city: true },
    orderBy: { name: 'asc' },
  });
  return { ok: true, value: societies };
}

export async function createSociety(
  service: ServiceContext,
  companyId: string,
  input: CreateSocietyInput,
): Promise<ServiceResult<{ id: string }>> {
  if (!permitted(service, policy(companyId, 'society', 'CREATE'))) return denied();

  const id = newId();
  await prisma.$transaction(async (tx) => {
    await tx.society.create({
      data: {
        id,
        companyId,
        name: input.name,
        registrationNumber: input.registrationNumber || null,
        addressLine1: input.addressLine1 || null,
        city: input.city || null,
        state: input.state || null,
        postalCode: input.postalCode || null,
        countryCode: input.countryCode,
        timezone: input.timezone,
      },
    });
    await tx.auditLog.create({
      data: {
        id: newId(),
        companyId,
        societyId: id,
        actorUserId: service.actorUserId,
        action: 'SOCIETY_CREATED',
        resourceType: 'society',
        resourceId: id,
        result: 'SUCCESS',
        reason: `Society ${input.name} registered`,
        requestId: service.requestId,
        ipAddress: service.ipAddress ?? null,
        userAgent: service.userAgent ?? null,
      },
    });
  });
  return { ok: true, value: { id } };
}

export interface PropertyView {
  society: { id: string; name: string; city: string | null; countryCode: string; timezone: string };
  buildings: Array<{
    id: string;
    name: string;
    code: string;
    floorCount: number;
    floors: Array<{
      id: string;
      name: string;
      floorNumber: number;
      flats: Array<{ id: string; number: string; areaSqMt: string | null; occupancyStatus: string }>;
    }>;
  }>;
}

/** Returns the property tree only when the society belongs to the active company. */
export async function getProperty(
  service: ServiceContext,
  companyId: string,
  societyId: string,
): Promise<ServiceResult<PropertyView>> {
  const society = await prisma.society.findFirst({
    where: { id: societyId, companyId },
    select: { id: true, name: true, city: true, countryCode: true, timezone: true },
  });
  if (!society) return { ok: false, code: 'NOT_FOUND', message: 'Society not found in the active company' };
  if (!permitted(service, policy(companyId, 'property', 'READ', societyId))) return denied();

  const buildings = await prisma.building.findMany({
    where: { companyId, societyId },
    select: {
      id: true,
      name: true,
      code: true,
      floorCount: true,
      floors: {
        where: { companyId, societyId },
        select: {
          id: true,
          name: true,
          floorNumber: true,
          flats: {
            where: { companyId, societyId },
            select: { id: true, number: true, areaSqMt: true, occupancyStatus: true },
            orderBy: { number: 'asc' },
          },
        },
        orderBy: { floorNumber: 'asc' },
      },
    },
    orderBy: { name: 'asc' },
  });

  return {
    ok: true,
    value: {
      society,
      buildings: buildings.map((building) => ({
        ...building,
        floors: building.floors.map((floor) => ({
          ...floor,
          flats: floor.flats.map((flat) => ({
            id: flat.id,
            number: flat.number,
            areaSqMt: flat.areaSqMt === null ? null : flat.areaSqMt.toString(),
            occupancyStatus: flat.occupancyStatus,
          })),
        })),
      })),
    },
  };
}

/** Deletes are authorized with UPDATE because the role catalog has no DELETE
 * action for property records yet. Cascades remove child floors and flats. */
async function deletePropertyRecord(
  service: ServiceContext,
  input: {
    companyId: string;
    societyId: string;
    resource: 'building' | 'floor' | 'flat';
    recordId: string;
    label: string;
    remove: () => Promise<void>;
  },
): Promise<ServiceResult<{ id: string }>> {
  if (!permitted(service, policy(input.companyId, input.resource, 'UPDATE', input.societyId))) return denied();
  await input.remove();
  await prisma.auditLog.create({
    data: {
      id: newId(),
      companyId: input.companyId,
      societyId: input.societyId,
      actorUserId: service.actorUserId,
      action: 'PROPERTY_RECORD_DELETED',
      resourceType: input.resource,
      resourceId: input.recordId,
      result: 'SUCCESS',
      reason: `Deleted ${input.resource}: ${input.label}`,
      requestId: service.requestId,
      ipAddress: service.ipAddress ?? null,
      userAgent: service.userAgent ?? null,
    },
  });
  return { ok: true, value: { id: input.recordId } };
}

export async function deleteBuilding(
  service: ServiceContext,
  companyId: string,
  societyId: string,
  buildingId: string,
): Promise<ServiceResult<{ id: string }>> {
  const record = await prisma.building.findFirst({
    where: { id: buildingId, companyId, societyId },
    select: { id: true, name: true },
  });
  if (!record) return { ok: false, code: 'NOT_FOUND', message: 'Building not found in this society' };
  return deletePropertyRecord(service, {
    companyId, societyId, resource: 'building', recordId: buildingId, label: record.name,
    remove: async () => { await prisma.building.delete({ where: { id: buildingId, companyId } }); },
  });
}

export async function deleteFloor(
  service: ServiceContext,
  companyId: string,
  societyId: string,
  floorId: string,
): Promise<ServiceResult<{ id: string }>> {
  const record = await prisma.floor.findFirst({
    where: { id: floorId, companyId, societyId },
    select: { id: true, name: true },
  });
  if (!record) return { ok: false, code: 'NOT_FOUND', message: 'Floor not found in this society' };
  return deletePropertyRecord(service, {
    companyId, societyId, resource: 'floor', recordId: floorId, label: record.name,
    remove: async () => { await prisma.floor.delete({ where: { id: floorId, companyId } }); },
  });
}

export async function deleteFlat(
  service: ServiceContext,
  companyId: string,
  societyId: string,
  flatId: string,
): Promise<ServiceResult<{ id: string }>> {
  const record = await prisma.flat.findFirst({
    where: { id: flatId, companyId, societyId },
    select: { id: true, number: true },
  });
  if (!record) return { ok: false, code: 'NOT_FOUND', message: 'Flat not found in this society' };
  return deletePropertyRecord(service, {
    companyId, societyId, resource: 'flat', recordId: flatId, label: record.number,
    remove: async () => { await prisma.flat.delete({ where: { id: flatId, companyId } }); },
  });
}

export async function createBuilding(
  service: ServiceContext,
  companyId: string,
  societyId: string,
  input: CreateBuildingInput,
): Promise<ServiceResult<{ id: string }>> {
  if (!permitted(service, policy(companyId, 'building', 'CREATE', societyId))) return denied();
  const society = await prisma.society.findFirst({ where: { id: societyId, companyId }, select: { id: true } });
  if (!society) return { ok: false, code: 'NOT_FOUND', message: 'Society not found in the active company' };
  const existing = await prisma.building.findFirst({
    where: { companyId, societyId, code: input.code },
    select: { id: true },
  });
  if (existing) return { ok: false, code: 'CONFLICT', message: 'Building code already exists in this society' };

  const id = newId();
  await prisma.$transaction(async (tx) => {
    await tx.building.create({
      data: {
        id,
        companyId,
        societyId,
        name: input.name,
        code: input.code,
        floorCount: input.floorCount,
      },
    });
    await tx.auditLog.create({
      data: {
        id: newId(),
        companyId,
        societyId,
        actorUserId: service.actorUserId,
        action: 'BUILDING_CREATED',
        resourceType: 'building',
        resourceId: id,
        result: 'SUCCESS',
        reason: `Building ${input.name} (${input.code}) created`,
        requestId: service.requestId,
        ipAddress: service.ipAddress ?? null,
        userAgent: service.userAgent ?? null,
      },
    });
  });
  return { ok: true, value: { id } };
}

export async function createFloor(
  service: ServiceContext,
  companyId: string,
  societyId: string,
  buildingId: string,
  input: CreateFloorInput,
): Promise<ServiceResult<{ id: string }>> {
  if (!permitted(service, policy(companyId, 'floor', 'CREATE', societyId))) return denied();
  if (input.buildingId !== buildingId) {
    return { ok: false, code: 'INVALID', message: 'Building id in the body must match the URL' };
  }
  const building = await prisma.building.findFirst({
    where: { id: buildingId, companyId, societyId },
    select: { id: true },
  });
  if (!building) return { ok: false, code: 'NOT_FOUND', message: 'Building not found in this society' };
  const existing = await prisma.floor.findFirst({
    where: { companyId, societyId, buildingId, floorNumber: input.floorNumber },
    select: { id: true },
  });
  if (existing) return { ok: false, code: 'CONFLICT', message: 'Floor number already exists in this building' };

  const id = newId();
  await prisma.$transaction(async (tx) => {
    await tx.floor.create({
      data: { id, companyId, societyId, buildingId, name: input.name, floorNumber: input.floorNumber },
    });
    await tx.auditLog.create({
      data: {
        id: newId(),
        companyId,
        societyId,
        actorUserId: service.actorUserId,
        action: 'FLOOR_CREATED',
        resourceType: 'floor',
        resourceId: id,
        result: 'SUCCESS',
        reason: `Floor ${input.name} (${input.floorNumber}) created`,
        requestId: service.requestId,
        ipAddress: service.ipAddress ?? null,
        userAgent: service.userAgent ?? null,
      },
    });
  });
  return { ok: true, value: { id } };
}

export async function createFlat(
  service: ServiceContext,
  companyId: string,
  societyId: string,
  floorId: string,
  input: CreateFlatInput,
): Promise<ServiceResult<{ id: string }>> {
  if (!permitted(service, policy(companyId, 'flat', 'CREATE', societyId))) return denied();
  if (input.floorId !== floorId) {
    return { ok: false, code: 'INVALID', message: 'Floor id in the body must match the URL' };
  }
  const floor = await prisma.floor.findFirst({
    where: { id: floorId, companyId, societyId, buildingId: input.buildingId },
    select: { id: true },
  });
  if (!floor) return { ok: false, code: 'NOT_FOUND', message: 'Floor not found in this building' };
  const existing = await prisma.flat.findFirst({
    where: { companyId, societyId, floorId, number: input.number },
    select: { id: true },
  });
  if (existing) return { ok: false, code: 'CONFLICT', message: 'Flat number already exists on this floor' };

  const id = newId();
  await prisma.$transaction(async (tx) => {
    await tx.flat.create({
      data: {
        id,
        companyId,
        societyId,
        buildingId: input.buildingId,
        floorId,
        number: input.number,
        areaSqMt: input.areaSqMt ?? null,
      },
    });
    await tx.auditLog.create({
      data: {
        id: newId(),
        companyId,
        societyId,
        actorUserId: service.actorUserId,
        action: 'FLAT_CREATED',
        resourceType: 'flat',
        resourceId: id,
        result: 'SUCCESS',
        reason: `Flat ${input.number} created`,
        requestId: service.requestId,
        ipAddress: service.ipAddress ?? null,
        userAgent: service.userAgent ?? null,
      },
    });
  });
  return { ok: true, value: { id } };
}
