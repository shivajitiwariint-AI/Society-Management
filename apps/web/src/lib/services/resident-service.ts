import { authorize } from '@society/authorization';
import { newId, type PermissionAction } from '@society/shared';
import { recordAudit, prisma } from '@society/database';
import type {
  CreateFamilyMemberInput,
  CreateOwnershipInput,
  CreateResidentInput,
  CreateTenancyInput,
  CreateVehicleInput,
  ResidentQuery,
  UpdateFamilyMemberInput,
  UpdateOwnershipInput,
  UpdateResidentInput,
  UpdateTenancyInput,
  UpdateVehicleInput,
} from '@society/validation';
import type { ServiceContext, ServiceResult } from './company-service';

export type ResidentResource = 'resident' | 'ownership' | 'tenancy' | 'family-member' | 'vehicle';

function permitted(service: ServiceContext, companyId: string, societyId: string, resource: ResidentResource, action: PermissionAction): boolean {
  return authorize(service.context, {
    moduleKey: 'residents',
    resourceKey: resource,
    action,
    companyId,
    societyId,
  }).ok;
}

function denied<T>(): ServiceResult<T> {
  return { ok: false, code: 'PERMISSION_DENIED', message: 'The required permission is not granted within the current data scope' };
}

function notFound<T>(message: string): ServiceResult<T> {
  return { ok: false, code: 'NOT_FOUND', message };
}

async function audit(
  service: ServiceContext,
  companyId: string,
  societyId: string,
  action: string,
  resourceType: string,
  resourceId: string,
  reason: string,
): Promise<void> {
  await recordAudit({
    companyId,
    societyId,
    actorUserId: service.actorUserId,
    action,
    resourceType,
    resourceId,
    result: 'SUCCESS',
    reason,
    requestId: service.requestId,
    ipAddress: service.ipAddress ?? null,
    userAgent: service.userAgent ?? null,
  });
}

async function assertSociety(companyId: string, societyId: string): Promise<boolean> {
  return (await prisma.society.findFirst({ where: { id: societyId, companyId }, select: { id: true } })) !== null;
}

async function assertFlat(companyId: string, societyId: string, flatId: string): Promise<boolean> {
  return (await prisma.flat.findFirst({ where: { id: flatId, companyId, societyId }, select: { id: true } })) !== null;
}

async function assertResident(companyId: string, societyId: string, residentId: string): Promise<boolean> {
  return (await prisma.resident.findFirst({ where: { id: residentId, companyId, societyId }, select: { id: true } })) !== null;
}

function dateOnly(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year!, month! - 1, day!));
}

function isoDate(value: Date | null): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}

function money(value: { toString(): string } | null): string | null {
  return value ? value.toString() : null;
}

export interface ResidentListItem {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  residentType: string;
  status: string;
  documentStatus: string;
  linkedUserId: string | null;
  flats: string[];
  familyCount: number;
  vehicleCount: number;
}

export interface ResidentDetailView extends ResidentListItem {
  notes: string | null;
  documentType: string | null;
  documentNumber: string | null;
  ownerships: Array<{
    id: string; flat: string; fromDate: string; toDate: string | null; share: string | null;
    isPrimary: boolean; status: string;
  }>;
  tenancies: Array<{
    id: string; flat: string; startDate: string; endDate: string | null; monthlyRent: string | null; status: string;
  }>;
  familyMembers: Array<{ id: string; name: string; relationship: string; phone: string | null; documentStatus: string }>;
  vehicles: Array<{ id: string; registrationNumber: string; vehicleType: string; make: string | null; model: string | null }>;
}

export interface ResidentListView {
  items: ResidentListItem[];
  flats: Array<{ id: string; label: string }>;
  total: number;
  page: number;
  pageSize: number;
}

function toListItem(row: {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  residentType: string;
  status: string;
  documentStatus: string;
  userId: string | null;
  ownerships: Array<{ flat: { number: string } }>;
  tenancies: Array<{ flat: { number: string } }>;
  _count: { familyMembers: number; vehicles: number };
}): ResidentListItem {
  const flats = [...new Set([...row.ownerships, ...row.tenancies].map((link) => link.flat.number))];
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    residentType: row.residentType,
    status: row.status,
    documentStatus: row.documentStatus,
    linkedUserId: row.userId,
    flats,
    familyCount: row._count.familyMembers,
    vehicleCount: row._count.vehicles,
  };
}

const listInclude = {
  ownerships: { where: { status: 'ACTIVE' }, select: { flat: { select: { number: true } } } },
  tenancies: { where: { status: 'ACTIVE' }, select: { flat: { select: { number: true } } } },
  _count: { select: { familyMembers: true, vehicles: true } },
} as const;

export async function listResidents(
  service: ServiceContext,
  companyId: string,
  societyId: string,
  query: ResidentQuery,
): Promise<ServiceResult<ResidentListView>> {
  if (!permitted(service, companyId, societyId, 'resident', 'READ')) return denied();
  if (!(await assertSociety(companyId, societyId))) return notFound('Society not found in the active company');

  const where = {
    companyId,
    societyId,
    ...(query.residentType ? { residentType: query.residentType } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.search
      ? {
          OR: [
            { name: { contains: query.search } },
            { phone: { contains: query.search } },
            { email: { contains: query.search } },
            { documentNumber: { contains: query.search } },
          ],
        }
      : {}),
  };

  const [total, rows, flatRows] = await Promise.all([
    prisma.resident.count({ where }),
    prisma.resident.findMany({
      where,
      include: listInclude,
      orderBy: [{ name: 'asc' }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.flat.findMany({
      where: { companyId, societyId },
      select: { id: true, number: true, floor: { select: { building: { select: { name: true } } } } },
      orderBy: { number: 'asc' },
    }),
  ]);

  return {
    ok: true,
    value: {
      items: rows.map(toListItem),
      flats: flatRows.map((flat) => ({ id: flat.id, label: `${flat.floor.building.name} / ${flat.number}` })),
      total,
      page: query.page,
      pageSize: query.pageSize,
    },
  };
}

export async function getResident(
  service: ServiceContext,
  companyId: string,
  societyId: string,
  residentId: string,
): Promise<ServiceResult<ResidentDetailView>> {
  if (!permitted(service, companyId, societyId, 'resident', 'READ')) return denied();
  const row = await prisma.resident.findFirst({
    where: { id: residentId, companyId, societyId },
    include: {
      ...listInclude,
      ownerships: {
        select: {
          id: true, fromDate: true, toDate: true, ownershipShare: true, isPrimary: true, status: true,
          flat: { select: { number: true } },
        },
        orderBy: { fromDate: 'desc' },
      },
      tenancies: {
        select: {
          id: true, startDate: true, endDate: true, monthlyRent: true, status: true,
          flat: { select: { number: true } },
        },
        orderBy: { startDate: 'desc' },
      },
      familyMembers: { select: { id: true, name: true, relationship: true, phone: true, documentStatus: true }, orderBy: { name: 'asc' } },
      vehicles: { select: { id: true, registrationNumber: true, vehicleType: true, make: true, model: true }, orderBy: { registrationNumber: 'asc' } },
    },
  });
  if (!row) return notFound('Resident not found in the active society');

  return {
    ok: true,
    value: {
      ...toListItem({ ...row, ownerships: row.ownerships.map((o) => ({ flat: o.flat })), tenancies: row.tenancies.map((t) => ({ flat: t.flat })) }),
      notes: row.notes,
      documentType: row.documentType,
      documentNumber: row.documentNumber,
      ownerships: row.ownerships.map((o) => ({
        id: o.id, flat: o.flat.number, fromDate: isoDate(o.fromDate)!, toDate: isoDate(o.toDate),
        share: money(o.ownershipShare), isPrimary: o.isPrimary, status: o.status,
      })),
      tenancies: row.tenancies.map((t) => ({
        id: t.id, flat: t.flat.number, startDate: isoDate(t.startDate)!, endDate: isoDate(t.endDate),
        monthlyRent: money(t.monthlyRent), status: t.status,
      })),
      familyMembers: row.familyMembers,
      vehicles: row.vehicles,
    },
  };
}

export async function createResident(
  service: ServiceContext,
  companyId: string,
  societyId: string,
  input: CreateResidentInput,
): Promise<ServiceResult<{ id: string }>> {
  if (!permitted(service, companyId, societyId, 'resident', 'CREATE')) return denied();
  if (!(await assertSociety(companyId, societyId))) return notFound('Society not found in the active company');

  const id = newId();
  await prisma.$transaction(async (tx) => {
    await tx.resident.create({
      data: {
        id, companyId, societyId,
        name: input.name, phone: input.phone, email: input.email || null,
        residentType: input.residentType,
        documentType: input.documentType || null,
        documentNumber: input.documentNumber || null,
        documentStatus: input.documentStatus,
        notes: input.notes || null,
      },
    });
    await tx.auditLog.create({
      data: {
        id: newId(), companyId, societyId, actorUserId: service.actorUserId,
        action: 'RESIDENT_CREATED', resourceType: 'resident', resourceId: id,
        result: 'SUCCESS', reason: `${input.residentType} ${input.name} added`,
        requestId: service.requestId, ipAddress: service.ipAddress ?? null, userAgent: service.userAgent ?? null,
      },
    });
  });
  return { ok: true, value: { id } };
}

export async function updateResident(
  service: ServiceContext,
  companyId: string,
  societyId: string,
  residentId: string,
  input: UpdateResidentInput,
): Promise<ServiceResult<{ id: string }>> {
  if (!permitted(service, companyId, societyId, 'resident', 'UPDATE')) return denied();
  if (!(await assertResident(companyId, societyId, residentId))) return notFound('Resident not found in the active society');

  await prisma.resident.update({
    where: { id: residentId },
    data: {
      ...input,
      email: input.email === undefined ? undefined : input.email || null,
      documentType: input.documentType === undefined ? undefined : input.documentType || null,
      documentNumber: input.documentNumber === undefined ? undefined : input.documentNumber || null,
      notes: input.notes === undefined ? undefined : input.notes || null,
    },
  });
  await audit(service, companyId, societyId, 'RESIDENT_UPDATED', 'resident', residentId, 'Resident profile updated');
  return { ok: true, value: { id: residentId } };
}

export async function deactivateResident(
  service: ServiceContext,
  companyId: string,
  societyId: string,
  residentId: string,
): Promise<ServiceResult<{ id: string }>> {
  if (!permitted(service, companyId, societyId, 'resident', 'DELETE')) return denied();
  if (!(await assertResident(companyId, societyId, residentId))) return notFound('Resident not found in the active society');
  await prisma.resident.update({ where: { id: residentId }, data: { status: 'INACTIVE' } });
  await audit(service, companyId, societyId, 'RESIDENT_DEACTIVATED', 'resident', residentId, 'Resident archived; history preserved');
  return { ok: true, value: { id: residentId } };
}

export async function createOwnership(
  service: ServiceContext,
  companyId: string,
  societyId: string,
  input: CreateOwnershipInput,
): Promise<ServiceResult<{ id: string }>> {
  if (!permitted(service, companyId, societyId, 'ownership', 'CREATE')) return denied();
  if (!(await assertSociety(companyId, societyId))) return notFound('Society not found in the active company');
  if (!(await assertFlat(companyId, societyId, input.flatId))) return notFound('Flat not found in the active society');
  if (!(await assertResident(companyId, societyId, input.residentId))) return notFound('Resident not found in the active society');

  const id = newId();
  await prisma.$transaction(async (tx) => {
    if (input.isPrimary) {
      await tx.ownership.updateMany({
        where: { companyId, societyId, flatId: input.flatId, isPrimary: true },
        data: { isPrimary: false },
      });
    }
    await tx.ownership.create({
      data: {
        id, companyId, societyId, flatId: input.flatId, residentId: input.residentId,
        fromDate: dateOnly(input.fromDate),
        toDate: input.toDate ? dateOnly(input.toDate) : null,
        ownershipShare: input.ownershipShare?.toFixed(2) ?? null,
        isPrimary: input.isPrimary, status: input.status,
      },
    });
    await tx.flat.update({ where: { id: input.flatId }, data: { occupancyStatus: 'OWNER_OCCUPIED' } });
    await tx.auditLog.create({
      data: {
        id: newId(), companyId, societyId, actorUserId: service.actorUserId,
        action: 'OWNERSHIP_RECORDED', resourceType: 'ownership', resourceId: id,
        result: 'SUCCESS', reason: `Ownership recorded from ${input.fromDate}`,
        requestId: service.requestId, ipAddress: service.ipAddress ?? null, userAgent: service.userAgent ?? null,
      },
    });
  });
  return { ok: true, value: { id } };
}

export async function updateOwnership(
  service: ServiceContext,
  companyId: string,
  societyId: string,
  id: string,
  input: UpdateOwnershipInput,
): Promise<ServiceResult<{ id: string }>> {
  if (!permitted(service, companyId, societyId, 'ownership', 'UPDATE')) return denied();
  const existing = await prisma.ownership.findFirst({ where: { id, companyId, societyId }, select: { flatId: true } });
  if (!existing) return notFound('Ownership record not found in the active society');

  await prisma.$transaction(async (tx) => {
    if (input.isPrimary) {
      await tx.ownership.updateMany({ where: { companyId, societyId, flatId: existing.flatId, isPrimary: true }, data: { isPrimary: false } });
    }
    await tx.ownership.update({
      where: { id },
      data: {
        ...input,
        fromDate: input.fromDate ? dateOnly(input.fromDate) : undefined,
        toDate: input.toDate === undefined ? undefined : input.toDate ? dateOnly(input.toDate) : null,
        ownershipShare: input.ownershipShare === undefined
          ? undefined
          : input.ownershipShare === null
            ? null
            : input.ownershipShare.toFixed(2),
      },
    });
  });
  await audit(service, companyId, societyId, 'OWNERSHIP_UPDATED', 'ownership', id, 'Ownership or transfer history updated');
  return { ok: true, value: { id } };
}

export async function deleteOwnership(
  service: ServiceContext,
  companyId: string,
  societyId: string,
  id: string,
): Promise<ServiceResult<{ id: string }>> {
  if (!permitted(service, companyId, societyId, 'ownership', 'DELETE')) return denied();
  const existing = await prisma.ownership.findFirst({ where: { id, companyId, societyId }, select: { id: true } });
  if (!existing) return notFound('Ownership record not found in the active society');
  await prisma.ownership.delete({ where: { id } });
  await audit(service, companyId, societyId, 'OWNERSHIP_DELETED', 'ownership', id, 'Ownership record removed');
  return { ok: true, value: { id } };
}

export async function createTenancy(
  service: ServiceContext,
  companyId: string,
  societyId: string,
  input: CreateTenancyInput,
): Promise<ServiceResult<{ id: string }>> {
  if (!permitted(service, companyId, societyId, 'tenancy', 'CREATE')) return denied();
  if (!(await assertSociety(companyId, societyId))) return notFound('Society not found in the active company');
  if (!(await assertFlat(companyId, societyId, input.flatId))) return notFound('Flat not found in the active society');
  if (!(await assertResident(companyId, societyId, input.residentId))) return notFound('Resident not found in the active society');

  const id = newId();
  await prisma.$transaction(async (tx) => {
    await tx.tenancy.create({
      data: {
        id, companyId, societyId, flatId: input.flatId, residentId: input.residentId,
        startDate: dateOnly(input.startDate),
        endDate: input.endDate ? dateOnly(input.endDate) : null,
        monthlyRent: input.monthlyRent?.toFixed(2) ?? null,
        status: input.status,
      },
    });
    await tx.flat.update({ where: { id: input.flatId }, data: { occupancyStatus: 'TENANT_OCCUPIED' } });
    await tx.auditLog.create({
      data: {
        id: newId(), companyId, societyId, actorUserId: service.actorUserId,
        action: 'TENANCY_RECORDED', resourceType: 'tenancy', resourceId: id,
        result: 'SUCCESS', reason: `Tenancy recorded from ${input.startDate}`,
        requestId: service.requestId, ipAddress: service.ipAddress ?? null, userAgent: service.userAgent ?? null,
      },
    });
  });
  return { ok: true, value: { id } };
}

export async function updateTenancy(
  service: ServiceContext,
  companyId: string,
  societyId: string,
  id: string,
  input: UpdateTenancyInput,
): Promise<ServiceResult<{ id: string }>> {
  if (!permitted(service, companyId, societyId, 'tenancy', 'UPDATE')) return denied();
  const existing = await prisma.tenancy.findFirst({ where: { id, companyId, societyId }, select: { id: true } });
  if (!existing) return notFound('Tenancy record not found in the active society');

  await prisma.tenancy.update({
    where: { id },
    data: {
      ...input,
      startDate: input.startDate ? dateOnly(input.startDate) : undefined,
      endDate: input.endDate === undefined ? undefined : input.endDate ? dateOnly(input.endDate) : null,
      monthlyRent: input.monthlyRent === undefined
        ? undefined
        : input.monthlyRent === null
          ? null
          : input.monthlyRent.toFixed(2),
    },
  });
  await audit(service, companyId, societyId, 'TENANCY_UPDATED', 'tenancy', id, 'Tenancy record updated');
  return { ok: true, value: { id } };
}

export async function deleteTenancy(
  service: ServiceContext,
  companyId: string,
  societyId: string,
  id: string,
): Promise<ServiceResult<{ id: string }>> {
  if (!permitted(service, companyId, societyId, 'tenancy', 'DELETE')) return denied();
  const existing = await prisma.tenancy.findFirst({ where: { id, companyId, societyId }, select: { id: true } });
  if (!existing) return notFound('Tenancy record not found in the active society');
  await prisma.tenancy.delete({ where: { id } });
  await audit(service, companyId, societyId, 'TENANCY_DELETED', 'tenancy', id, 'Tenancy record removed');
  return { ok: true, value: { id } };
}

export async function createFamilyMember(
  service: ServiceContext,
  companyId: string,
  societyId: string,
  residentId: string,
  input: CreateFamilyMemberInput,
): Promise<ServiceResult<{ id: string }>> {
  if (!permitted(service, companyId, societyId, 'family-member', 'CREATE')) return denied();
  if (!(await assertResident(companyId, societyId, residentId))) return notFound('Resident not found in the active society');
  const id = newId();
  await prisma.familyMember.create({
    data: {
      id, companyId, societyId, residentId,
      name: input.name, relationship: input.relationship,
      phone: input.phone || null,
      dateOfBirth: input.dateOfBirth ? dateOnly(input.dateOfBirth) : null,
      documentStatus: input.documentStatus,
    },
  });
  await audit(service, companyId, societyId, 'FAMILY_MEMBER_ADDED', 'family-member', id, `${input.relationship} added to resident`);
  return { ok: true, value: { id } };
}

export async function updateFamilyMember(
  service: ServiceContext,
  companyId: string,
  societyId: string,
  id: string,
  input: UpdateFamilyMemberInput,
): Promise<ServiceResult<{ id: string }>> {
  if (!permitted(service, companyId, societyId, 'family-member', 'UPDATE')) return denied();
  const existing = await prisma.familyMember.findFirst({ where: { id, companyId, societyId }, select: { id: true } });
  if (!existing) return notFound('Family member not found in the active society');
  await prisma.familyMember.update({
    where: { id },
    data: {
      ...input,
      phone: input.phone === undefined ? undefined : input.phone || null,
      dateOfBirth: input.dateOfBirth === undefined ? undefined : input.dateOfBirth ? dateOnly(input.dateOfBirth) : null,
    },
  });
  await audit(service, companyId, societyId, 'FAMILY_MEMBER_UPDATED', 'family-member', id, 'Family member updated');
  return { ok: true, value: { id } };
}

export async function deleteFamilyMember(
  service: ServiceContext,
  companyId: string,
  societyId: string,
  id: string,
): Promise<ServiceResult<{ id: string }>> {
  if (!permitted(service, companyId, societyId, 'family-member', 'DELETE')) return denied();
  const existing = await prisma.familyMember.findFirst({ where: { id, companyId, societyId }, select: { id: true } });
  if (!existing) return notFound('Family member not found in the active society');
  await prisma.familyMember.delete({ where: { id } });
  await audit(service, companyId, societyId, 'FAMILY_MEMBER_REMOVED', 'family-member', id, 'Family member removed');
  return { ok: true, value: { id } };
}

export async function createVehicle(
  service: ServiceContext,
  companyId: string,
  societyId: string,
  residentId: string,
  input: CreateVehicleInput,
): Promise<ServiceResult<{ id: string }>> {
  if (!permitted(service, companyId, societyId, 'vehicle', 'CREATE')) return denied();
  if (!(await assertResident(companyId, societyId, residentId))) return notFound('Resident not found in the active society');
  const id = newId();
  await prisma.vehicle.create({
    data: {
      id, companyId, societyId, residentId,
      registrationNumber: input.registrationNumber,
      vehicleType: input.vehicleType,
      make: input.make || null,
      model: input.model || null,
    },
  });
  await audit(service, companyId, societyId, 'VEHICLE_REGISTERED', 'vehicle', id, `Vehicle ${input.registrationNumber} registered`);
  return { ok: true, value: { id } };
}

export async function updateVehicle(
  service: ServiceContext,
  companyId: string,
  societyId: string,
  id: string,
  input: UpdateVehicleInput,
): Promise<ServiceResult<{ id: string }>> {
  if (!permitted(service, companyId, societyId, 'vehicle', 'UPDATE')) return denied();
  const existing = await prisma.vehicle.findFirst({ where: { id, companyId, societyId }, select: { id: true } });
  if (!existing) return notFound('Vehicle not found in the active society');
  await prisma.vehicle.update({
    where: { id },
    data: { ...input, make: input.make === undefined ? undefined : input.make || null, model: input.model === undefined ? undefined : input.model || null },
  });
  await audit(service, companyId, societyId, 'VEHICLE_UPDATED', 'vehicle', id, 'Vehicle record updated');
  return { ok: true, value: { id } };
}

export async function deleteVehicle(
  service: ServiceContext,
  companyId: string,
  societyId: string,
  id: string,
): Promise<ServiceResult<{ id: string }>> {
  if (!permitted(service, companyId, societyId, 'vehicle', 'DELETE')) return denied();
  const existing = await prisma.vehicle.findFirst({ where: { id, companyId, societyId }, select: { id: true } });
  if (!existing) return notFound('Vehicle not found in the active society');
  await prisma.vehicle.delete({ where: { id } });
  await audit(service, companyId, societyId, 'VEHICLE_REMOVED', 'vehicle', id, 'Vehicle record removed');
  return { ok: true, value: { id } };
}
