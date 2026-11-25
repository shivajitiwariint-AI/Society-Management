import { authorize, type RequestContext } from '@society/authorization';
import { MODULES, newId, permissionKey } from '@society/shared';
import type { CreateCompanyInput } from '@society/validation';
import { prisma, recordAudit, type CompanyStatus, type Prisma } from '@society/database';

function throwMissingModule(key: string): never {
  throw new Error(`Module catalog is not seeded: ${key}`);
}

export interface ServiceContext {
  context: RequestContext;
  actorUserId: string;
  requestId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export type ServiceResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: 'PERMISSION_DENIED' | 'CONFLICT' | 'INVALID' | 'NOT_FOUND'; message: string };

/**
 * Seeds the deny-by-default entitlement matrix (SRS 7.2). Shared by platform
 * company creation and public self-registration so both paths stay identical.
 */
export async function seedCompanyModules(
  tx: Prisma.TransactionClient,
  companyId: string,
  actorUserId: string,
): Promise<void> {
  const moduleRows = await tx.module.findMany({ select: { id: true, key: true } });
  const moduleIdByKey = new Map(moduleRows.map((row) => [row.key, row.id]));
  await tx.companyModule.createMany({
    data: MODULES.map((module) => ({
      id: newId(),
      companyId,
      moduleId: moduleIdByKey.get(module.key) ?? throwMissingModule(module.key),
      isEnabled: module.isCore,
      accessMode: module.isCore ? 'FULL' : 'DISABLED',
      enabledAt: module.isCore ? new Date() : null,
      changedBy: actorUserId,
      reason: module.isCore ? 'Core module' : 'Deny by default for new company',
    })),
  });
}

/** Creates a company with deny-by-default module entitlements (SRS 7.2). */
export async function createCompany(service: ServiceContext, input: CreateCompanyInput, reason: string): Promise<ServiceResult<{ id: string }>> {
  const decision = authorize(service.context, {
    moduleKey: 'company',
    resourceKey: 'profile',
    action: 'CREATE',
    platform: true,
  });
  if (!decision.ok) return { ok: false, code: 'PERMISSION_DENIED', message: decision.error.message };

  const existing = await prisma.company.findUnique({ where: { code: input.code } });
  if (existing) return { ok: false, code: 'CONFLICT', message: 'Company code already exists' };

  const companyId = newId();
  await prisma.$transaction(async (tx) => {
    await tx.company.create({
      data: {
        id: companyId,
        name: input.name,
        code: input.code,
        countryCode: input.countryCode,
        currencyCode: input.currencyCode,
        timezone: input.timezone,
      },
    });
    await seedCompanyModules(tx, companyId, service.actorUserId);
  });

  await recordAudit({
    companyId,
    actorUserId: service.actorUserId,
    action: 'COMPANY_CREATED',
    resourceType: 'company',
    resourceId: companyId,
    result: 'SUCCESS',
    reason,
    requestId: service.requestId,
    ipAddress: service.ipAddress,
    userAgent: service.userAgent,
  });
  return { ok: true, value: { id: companyId } };
}

/** Updates the company profile after authorization and an audited reason. */
export async function updateCompanyProfile(
  service: ServiceContext,
  companyId: string,
  input: Omit<import('@society/validation').UpdateCompanyProfileInput, 'reason'>,
  reason: string,
): Promise<ServiceResult<{ id: string }>> {
  const decision = authorize(service.context, {
    moduleKey: 'company', resourceKey: 'profile', action: 'UPDATE', platform: true,
  });
  if (!decision.ok) return { ok: false, code: 'PERMISSION_DENIED', message: decision.error.message };

  const existing = await prisma.company.findUnique({ where: { id: companyId }, select: { id: true, code: true } });
  if (!existing) return { ok: false, code: 'NOT_FOUND', message: 'Company not found' };
  if (existing.code !== input.code) {
    const duplicate = await prisma.company.findUnique({ where: { code: input.code }, select: { id: true } });
    if (duplicate) return { ok: false, code: 'CONFLICT', message: 'Company code already exists' };
  }

  await prisma.$transaction(async (tx) => {
    await tx.company.update({
      where: { id: companyId },
      data: {
        name: input.name,
        code: input.code,
        countryCode: input.countryCode,
        currencyCode: input.currencyCode,
        timezone: input.timezone,
      },
    });
    await tx.auditLog.create({
      data: {
        id: newId(),
        companyId,
        actorUserId: service.actorUserId,
        action: 'COMPANY_UPDATED',
        resourceType: 'company',
        resourceId: companyId,
        result: 'SUCCESS',
        reason,
        requestId: service.requestId,
        ipAddress: service.ipAddress ?? null,
        userAgent: service.userAgent ?? null,
      },
    });
  });

  return { ok: true, value: { id: companyId } };
}

export async function changeCompanyStatus(
  service: ServiceContext,
  companyId: string,
  status: Extract<CompanyStatus, 'ACTIVE' | 'SUSPENDED'>,
  reason: string,
): Promise<ServiceResult<{ id: string; status: CompanyStatus }>> {
  const decision = authorize(service.context, {
    moduleKey: 'company',
    resourceKey: 'profile',
    action: 'UPDATE',
    platform: true,
  });
  if (!decision.ok) return { ok: false, code: 'PERMISSION_DENIED', message: decision.error.message };

  return prisma.$transaction(async (tx) => {
    const company = await tx.company.findUnique({
      where: { id: companyId },
      select: { id: true, status: true },
    });
    if (!company) return { ok: false, code: 'NOT_FOUND', message: 'Company not found' };
    if (company.status === status) return { ok: true, value: company };

    const updated = await tx.company.update({
      where: { id: companyId },
      data: { status },
      select: { id: true, status: true },
    });
    if (status !== 'ACTIVE') {
      await tx.session.updateMany({
        where: { activeCompanyId: companyId },
        data: { activeCompanyId: null, activeSocietyId: null },
      });
    }
    await tx.auditLog.create({
      data: {
        id: newId(),
        companyId,
        actorUserId: service.actorUserId,
        action: status === 'ACTIVE' ? 'COMPANY_ENABLED' : 'COMPANY_DISABLED',
        resourceType: 'company',
        resourceId: companyId,
        result: 'SUCCESS',
        reason,
        requestId: service.requestId,
        ipAddress: service.ipAddress ?? null,
        userAgent: service.userAgent ?? null,
      },
    });
    return { ok: true, value: updated };
  }, { maxWait: 10_000, timeout: 60_000 });
}

export async function deleteCompany(
  service: ServiceContext,
  companyId: string,
  confirmationCode: string,
  reason: string,
): Promise<ServiceResult<{ id: string }>> {
  const decision = authorize(service.context, {
    moduleKey: 'company',
    resourceKey: 'profile',
    action: 'DELETE',
    platform: true,
  });
  if (!decision.ok) return { ok: false, code: 'PERMISSION_DENIED', message: decision.error.message };

  return prisma.$transaction(async (tx) => {
    const company = await tx.company.findUnique({
      where: { id: companyId },
      select: { id: true, code: true },
    });
    if (!company) return { ok: false, code: 'NOT_FOUND', message: 'Company not found' };
    if (company.code !== confirmationCode) {
      return { ok: false, code: 'INVALID', message: 'Company code does not match' };
    }

    const [memberships, companyAssignments, residents, companyRoles] = await Promise.all([
      tx.userMembership.findMany({ where: { companyId }, select: { userId: true } }),
      tx.userRole.findMany({
        where: { OR: [{ companyId }, { role: { companyId } }] },
        select: { userId: true },
      }),
      tx.resident.findMany({ where: { companyId, userId: { not: null } }, select: { userId: true } }),
      tx.role.findMany({ where: { companyId }, select: { id: true } }),
    ]);
    const relatedUserIds = [
      ...new Set([
        ...memberships.map((membership) => membership.userId),
        ...companyAssignments.map((assignment) => assignment.userId),
        ...residents.flatMap((resident) => (resident.userId ? [resident.userId] : [])),
      ]),
    ];
    const companyRoleIds = companyRoles.map((role) => role.id);

    await tx.session.updateMany({
      where: { activeCompanyId: companyId },
      data: { activeCompanyId: null, activeSocietyId: null },
    });
    await tx.auditLog.deleteMany({ where: { companyId } });
    await tx.securityEvent.deleteMany({ where: { companyId } });
    await tx.idempotencyRecord.deleteMany({ where: { companyId } });
    await tx.outboxEvent.deleteMany({ where: { companyId } });
    await tx.invitationToken.deleteMany({ where: { companyId } });
    await tx.companySetting.deleteMany({ where: { companyId } });
    await tx.companyModule.deleteMany({ where: { companyId } });
    await tx.moduleFeatureLimit.deleteMany({ where: { companyId } });
    if (companyRoleIds.length > 0) {
      await tx.rolePermission.deleteMany({ where: { roleId: { in: companyRoleIds } } });
    }
    await tx.userRole.deleteMany({
      where: {
        OR: [
          { companyId },
          ...(companyRoleIds.length > 0 ? [{ roleId: { in: companyRoleIds } }] : []),
        ],
      },
    });
    if (companyRoleIds.length > 0) {
      await tx.role.deleteMany({ where: { id: { in: companyRoleIds } } });
    }
    await tx.userMembership.deleteMany({ where: { companyId } });

    await tx.refund.deleteMany({ where: { companyId } });
    await tx.invoiceItem.deleteMany({ where: { companyId } });
    await tx.journalLine.deleteMany({ where: { companyId } });
    await tx.operationalRecord.deleteMany({ where: { companyId } });
    await tx.ownership.deleteMany({ where: { companyId } });
    await tx.tenancy.deleteMany({ where: { companyId } });
    await tx.familyMember.deleteMany({ where: { companyId } });
    await tx.vehicle.deleteMany({ where: { companyId } });
    await tx.payment.deleteMany({ where: { companyId } });
    await tx.invoice.deleteMany({ where: { companyId } });
    await tx.journalEntry.deleteMany({ where: { companyId } });
    await tx.financialPeriod.deleteMany({ where: { companyId } });
    await tx.billingCharge.deleteMany({ where: { companyId } });
    await tx.maintenanceExpense.deleteMany({ where: { companyId } });
    await tx.account.deleteMany({ where: { companyId } });
    await tx.resident.deleteMany({ where: { companyId } });
    await tx.flat.deleteMany({ where: { companyId } });
    await tx.floor.deleteMany({ where: { companyId } });
    await tx.building.deleteMany({ where: { companyId } });
    await tx.society.deleteMany({ where: { companyId } });

    const orphanUsers = relatedUserIds.length > 0
      ? await tx.user.findMany({
          where: {
            id: { in: relatedUserIds },
            memberships: { none: {} },
            userRoles: { none: {} },
          },
          select: { id: true },
        })
      : [];
    const orphanUserIds = orphanUsers.map((user) => user.id);
    if (orphanUserIds.length > 0) {
      await tx.session.deleteMany({ where: { userId: { in: orphanUserIds } } });
      await tx.loginHistory.deleteMany({ where: { userId: { in: orphanUserIds } } });
      await tx.securityEvent.deleteMany({ where: { userId: { in: orphanUserIds } } });
      await tx.user.deleteMany({ where: { id: { in: orphanUserIds } } });
    }

    await tx.company.delete({ where: { id: companyId } });
    await tx.auditLog.create({
      data: {
        id: newId(),
        actorUserId: service.actorUserId,
        action: 'COMPANY_DELETED',
        resourceType: 'company',
        resourceId: companyId,
        result: 'SUCCESS',
        reason,
        requestId: service.requestId,
        ipAddress: service.ipAddress ?? null,
        userAgent: service.userAgent ?? null,
      },
    });

    return { ok: true, value: { id: companyId } };
  }, { maxWait: 10_000, timeout: 60_000 });
}

export function canManagePlatformSettings(context: RequestContext): boolean {
  const decision = authorize(context, {
    moduleKey: 'company',
    resourceKey: 'settings',
    action: 'MANAGE_SETTINGS',
    platform: true,
  });
  return decision.ok;
}

export function superAdminPermissionKeys(): readonly string[] {
  return [permissionKey('company', 'profile', 'CREATE'), permissionKey('company', 'settings', 'MANAGE_SETTINGS')];
}
