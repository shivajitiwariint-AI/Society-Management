import { authorize } from '@society/authorization';
import {
  getOperationDefinition,
  newId,
  type ModuleKey,
  type OperationDefinition,
  type PermissionAction,
} from '@society/shared';
import { prisma, recordAudit, type Prisma } from '@society/database';
import type { CreateOperationInput, OperationQuery, UpdateOperationInput } from '@society/validation';
import type { ServiceContext, ServiceResult } from './company-service';

export interface OperationListItem {
  id: string;
  code: string | null;
  title: string;
  description: string | null;
  status: string;
  priority: string | null;
  startAt: string | null;
  endAt: string | null;
  amount: string | null;
  resident: string | null;
  flat: string | null;
  assignee: string | null;
  metadata: Record<string, unknown>;
}

export interface OperationListView {
  definition: OperationDefinition;
  items: OperationListItem[];
  total: number;
  page: number;
  pageSize: number;
}

function denied<T>(): ServiceResult<T> {
  return { ok: false, code: 'PERMISSION_DENIED', message: 'The required permission is not granted within the current data scope' };
}

function invalid<T>(message: string): ServiceResult<T> {
  return { ok: false, code: 'INVALID', message };
}

function notFound<T>(message: string): ServiceResult<T> {
  return { ok: false, code: 'NOT_FOUND', message };
}

function permitted(service: ServiceContext, companyId: string, societyId: string, definition: OperationDefinition, action: PermissionAction): boolean {
  return authorize(service.context, {
    moduleKey: definition.moduleKey,
    resourceKey: definition.resourceKey,
    action,
    companyId,
    societyId,
  }).ok;
}

function resolveDefinition(moduleKey: string, resourceKey: string): OperationDefinition | null {
  return getOperationDefinition(moduleKey, resourceKey);
}

async function assertSociety(companyId: string, societyId: string): Promise<boolean> {
  return (await prisma.society.findFirst({ where: { id: societyId, companyId }, select: { id: true } })) !== null;
}

function parseDateTime(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function iso(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

function metadataOf(value: Prisma.JsonValue | null): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function toListItem(row: {
  id: string;
  code: string | null;
  title: string;
  description: string | null;
  status: string;
  priority: string | null;
  startAt: Date | null;
  endAt: Date | null;
  amount: { toString(): string } | null;
  metadata: Prisma.JsonValue | null;
  resident: { name: string } | null;
  flat: { number: string; floor: { building: { name: string } } } | null;
  assigneeUserId?: string | null;
}): OperationListItem {
  return {
    id: row.id,
    code: row.code,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    startAt: iso(row.startAt),
    endAt: iso(row.endAt),
    amount: row.amount ? row.amount.toString() : null,
    resident: row.resident?.name ?? null,
    flat: row.flat ? `${row.flat.floor.building.name} / ${row.flat.number}` : null,
    assignee: row.assigneeUserId ?? null,
    metadata: metadataOf(row.metadata),
  };
}

const listInclude = {
  resident: { select: { name: true } },
  flat: { select: { number: true, floor: { select: { building: { select: { name: true } } } } } },
} as const;

async function audit(
  service: ServiceContext,
  definition: OperationDefinition,
  companyId: string,
  societyId: string,
  action: string,
  resourceId: string,
  reason: string,
): Promise<void> {
  await recordAudit({
    companyId,
    societyId,
    actorUserId: service.actorUserId,
    action,
    resourceType: definition.resourceKey,
    resourceId,
    result: 'SUCCESS',
    reason,
    requestId: service.requestId,
    ipAddress: service.ipAddress ?? null,
    userAgent: service.userAgent ?? null,
  });
}

export async function listOperations(
  service: ServiceContext,
  companyId: string,
  societyId: string,
  moduleKey: string,
  resourceKey: string,
  query: OperationQuery,
): Promise<ServiceResult<OperationListView>> {
  const definition = resolveDefinition(moduleKey, resourceKey);
  if (!definition) return notFound('Operation resource not found');
  if (!permitted(service, companyId, societyId, definition, 'READ')) return denied();
  if (!(await assertSociety(companyId, societyId))) return notFound('Society not found in the active company');

  const where = {
    companyId,
    societyId,
    moduleKey,
    resourceKey,
    ...(query.status ? { status: query.status } : {}),
    ...(query.search
      ? {
          OR: [
            { title: { contains: query.search } },
            { code: { contains: query.search } },
            { description: { contains: query.search } },
          ],
        }
      : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.operationalRecord.count({ where }),
    prisma.operationalRecord.findMany({
      where,
      include: listInclude,
      orderBy: [{ startAt: 'desc' }, { createdAt: 'desc' }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);

  return {
    ok: true,
    value: {
      definition,
      items: rows.map(toListItem),
      total,
      page: query.page,
      pageSize: query.pageSize,
    },
  };
}

export async function getOperation(
  service: ServiceContext,
  companyId: string,
  societyId: string,
  moduleKey: string,
  resourceKey: string,
  id: string,
): Promise<ServiceResult<OperationListItem>> {
  const definition = resolveDefinition(moduleKey, resourceKey);
  if (!definition) return notFound('Operation resource not found');
  if (!permitted(service, companyId, societyId, definition, 'READ')) return denied();

  const row = await prisma.operationalRecord.findFirst({
    where: { id, companyId, societyId, moduleKey, resourceKey },
    include: listInclude,
  });
  if (!row) return notFound('Record not found in the active society');
  return { ok: true, value: toListItem(row) };
}

export async function createOperation(
  service: ServiceContext,
  companyId: string,
  societyId: string,
  moduleKey: string,
  resourceKey: string,
  input: CreateOperationInput,
): Promise<ServiceResult<{ id: string }>> {
  const definition = resolveDefinition(moduleKey, resourceKey);
  if (!definition) return notFound('Operation resource not found');
  if (!permitted(service, companyId, societyId, definition, 'CREATE')) return denied();
  if (!(await assertSociety(companyId, societyId))) return notFound('Society not found in the active company');
  if (!definition.statusOptions.includes(input.status)) return invalid('Unsupported status for this resource');
  if (input.priority && definition.priorityOptions && !definition.priorityOptions.includes(input.priority)) {
    return invalid('Unsupported priority for this resource');
  }
  if (input.residentId && !(await prisma.resident.findFirst({ where: { id: input.residentId, companyId, societyId }, select: { id: true } }))) {
    return notFound('Resident not found in the active society');
  }
  if (input.flatId && !(await prisma.flat.findFirst({ where: { id: input.flatId, companyId, societyId }, select: { id: true } }))) {
    return notFound('Flat not found in the active society');
  }

  const id = newId();
  const startAt = parseDateTime(input.startAt);
  const endAt = parseDateTime(input.endAt);
  if ((input.startAt && !startAt) || (input.endAt && !endAt)) return invalid('Invalid date/time value');
  if (startAt && endAt && endAt < startAt) return invalid('End must not precede start');

  try {
    await prisma.$transaction(async (tx) => {
      await tx.operationalRecord.create({
        data: {
          id,
          companyId,
          societyId,
          moduleKey,
          resourceKey,
          code: input.code || null,
          title: input.title,
          description: input.description || null,
          status: input.status,
          priority: input.priority || null,
          startAt,
          endAt,
          amount: input.amount?.toFixed(2) ?? null,
          residentId: input.residentId || null,
          flatId: input.flatId || null,
          assigneeUserId: input.assigneeUserId || null,
          metadata: input.metadata as Prisma.InputJsonValue,
          createdBy: service.actorUserId,
          updatedBy: service.actorUserId,
        },
      });
      await tx.auditLog.create({
        data: {
          id: newId(),
          companyId,
          societyId,
          actorUserId: service.actorUserId,
          action: `${definition.resourceKey.toUpperCase().replaceAll('-', '_')}_CREATED`,
          resourceType: definition.resourceKey,
          resourceId: id,
          result: 'SUCCESS',
          reason: `${definition.label} record created`,
          requestId: service.requestId,
          ipAddress: service.ipAddress ?? null,
          userAgent: service.userAgent ?? null,
        },
      });
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create record';
    if (message.includes('Unique constraint')) return { ok: false, code: 'CONFLICT', message: 'Code must be unique in this society' };
    throw error;
  }

  return { ok: true, value: { id } };
}

export async function updateOperation(
  service: ServiceContext,
  companyId: string,
  societyId: string,
  moduleKey: string,
  resourceKey: string,
  id: string,
  input: UpdateOperationInput,
): Promise<ServiceResult<{ id: string }>> {
  const definition = resolveDefinition(moduleKey, resourceKey);
  if (!definition) return notFound('Operation resource not found');
  if (!permitted(service, companyId, societyId, definition, 'UPDATE')) return denied();

  const existing = await prisma.operationalRecord.findFirst({
    where: { id, companyId, societyId, moduleKey, resourceKey },
    select: { id: true, startAt: true, endAt: true },
  });
  if (!existing) return notFound('Record not found in the active society');
  if (input.status && !definition.statusOptions.includes(input.status)) return invalid('Unsupported status for this resource');
  if (input.priority && definition.priorityOptions && !definition.priorityOptions.includes(input.priority)) {
    return invalid('Unsupported priority for this resource');
  }

  const startAt = input.startAt === undefined ? undefined : parseDateTime(input.startAt);
  const endAt = input.endAt === undefined ? undefined : parseDateTime(input.endAt);
  if (input.startAt !== undefined && !startAt) return invalid('Invalid date/time value');
  if (input.endAt !== undefined && !endAt) return invalid('Invalid date/time value');
  const nextStart = startAt === undefined ? existing.startAt : startAt;
  const nextEnd = endAt === undefined ? existing.endAt : endAt;
  if (nextStart && nextEnd && nextEnd < nextStart) return invalid('End must not precede start');

  await prisma.operationalRecord.update({
    where: { id },
    data: {
      code: input.code === undefined ? undefined : input.code || null,
      title: input.title,
      description: input.description === undefined ? undefined : input.description || null,
      status: input.status,
      priority: input.priority === undefined ? undefined : input.priority || null,
      startAt: startAt === undefined ? undefined : startAt,
      endAt: endAt === undefined ? undefined : endAt,
      amount: input.amount === undefined ? undefined : input.amount?.toFixed(2) ?? null,
      residentId: input.residentId === undefined ? undefined : input.residentId || null,
      flatId: input.flatId === undefined ? undefined : input.flatId || null,
      assigneeUserId: input.assigneeUserId === undefined ? undefined : input.assigneeUserId || null,
      ...(input.metadata === undefined ? {} : { metadata: input.metadata as Prisma.InputJsonValue }),
      updatedBy: service.actorUserId,
    },
  });
  await audit(service, definition, companyId, societyId, `${definition.resourceKey.toUpperCase().replaceAll('-', '_')}_UPDATED`, id, `${definition.label} record updated`);
  return { ok: true, value: { id } };
}

export async function setOperationStatus(
  service: ServiceContext,
  companyId: string,
  societyId: string,
  moduleKey: string,
  resourceKey: string,
  id: string,
  status: string,
  action: PermissionAction,
): Promise<ServiceResult<{ id: string }>> {
  const definition = resolveDefinition(moduleKey, resourceKey);
  if (!definition) return notFound('Operation resource not found');
  if (!permitted(service, companyId, societyId, definition, action)) return denied();
  if (!definition.statusOptions.includes(status)) return invalid('Unsupported status for this resource');

  const existing = await prisma.operationalRecord.findFirst({ where: { id, companyId, societyId, moduleKey, resourceKey }, select: { id: true } });
  if (!existing) return notFound('Record not found in the active society');
  await prisma.operationalRecord.update({
    where: { id },
    data: { status, updatedBy: service.actorUserId },
  });
  await audit(
    service,
    definition,
    companyId,
    societyId,
    `${definition.resourceKey.toUpperCase().replaceAll('-', '_')}_${action}`,
    id,
    `Status changed to ${status}`,
  );
  return { ok: true, value: { id } };
}

export async function deleteOperation(
  service: ServiceContext,
  companyId: string,
  societyId: string,
  moduleKey: string,
  resourceKey: string,
  id: string,
): Promise<ServiceResult<{ id: string }>> {
  const definition = resolveDefinition(moduleKey, resourceKey);
  if (!definition) return notFound('Operation resource not found');
  if (!permitted(service, companyId, societyId, definition, 'DELETE')) return denied();

  const row = await prisma.operationalRecord.findFirst({
    where: { id, companyId, societyId, moduleKey, resourceKey },
    select: { id: true, metadata: true },
  });
  if (!row) return notFound('Record not found in the active society');

  await prisma.$transaction(async (tx) => {
    await tx.operationalRecord.delete({ where: { id } });
    await tx.auditLog.create({
      data: {
        id: newId(),
        companyId,
        societyId,
        actorUserId: service.actorUserId,
        action: `${definition.resourceKey.toUpperCase().replaceAll('-', '_')}_DELETED`,
        resourceType: definition.resourceKey,
        resourceId: id,
        result: 'SUCCESS',
        reason: `${definition.label} record deleted`,
        requestId: service.requestId,
        ipAddress: service.ipAddress ?? null,
        userAgent: service.userAgent ?? null,
      },
    });
  });
  return { ok: true, value: { id } };
}
