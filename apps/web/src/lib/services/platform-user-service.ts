import { authorize } from '@society/authorization';
import { newId } from '@society/shared';
import type { CreateCompanyUserInput, UpdateCompanyUserInput } from '@society/validation';
import { prisma, recordAudit } from '@society/database';
import { hashPassword } from '@/lib/auth/password';
import type { ServiceContext, ServiceResult } from './company-service';

function canManage(service: ServiceContext): boolean {
  return authorize(service.context, {
    moduleKey: 'company', resourceKey: 'membership', action: 'ASSIGN', platform: true,
  }).ok;
}

async function resolveRole(roleId: string, companyId: string) {
  const role = await prisma.role.findUnique({
    where: { id: roleId },
    select: { id: true, scopeType: true, companyId: true, name: true },
  });
  if (!role) return { ok: false as const, message: 'Role not found' };
  if (role.scopeType === 'PLATFORM' || (role.companyId !== null && role.companyId !== companyId)) {
    return { ok: false as const, message: 'This role cannot be assigned to a company user' };
  }
  return { ok: true as const, role };
}

/** Creates a user, company membership and role assignment in one audited transaction. */
export async function createCompanyUser(
  service: ServiceContext,
  companyId: string,
  input: Omit<CreateCompanyUserInput, 'reason'>,
  reason: string,
): Promise<ServiceResult<{ id: string }>> {
  if (!canManage(service)) {
    return { ok: false, code: 'PERMISSION_DENIED', message: 'You are not allowed to manage company users' };
  }

  const company = await prisma.company.findUnique({ where: { id: companyId }, select: { id: true } });
  if (!company) return { ok: false, code: 'NOT_FOUND', message: 'Company not found' };
  if (await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } })) {
    return { ok: false, code: 'CONFLICT', message: 'A user with this email already exists' };
  }
  const role = await resolveRole(input.roleId, companyId);
  if (!role.ok) return { ok: false, code: 'INVALID', message: role.message };

  const userId = newId();
  const passwordHash = await hashPassword(input.password);
  await prisma.$transaction(async (tx) => {
    await tx.user.create({
      data: { id: userId, email: input.email, name: input.name, passwordHash, status: 'ACTIVE' },
    });
    await tx.userMembership.create({
      data: { id: newId(), userId, companyId, status: 'ACTIVE' },
    });
    await tx.userRole.create({
      data: {
        id: newId(),
        userId,
        roleId: role.role.id,
        companyId,
        assignedBy: service.actorUserId,
      },
    });
    await tx.auditLog.create({
      data: {
        id: newId(),
        companyId,
        actorUserId: service.actorUserId,
        action: 'COMPANY_USER_CREATED',
        resourceType: 'user',
        resourceId: userId,
        result: 'SUCCESS',
        reason,
        requestId: service.requestId,
        ipAddress: service.ipAddress ?? null,
        userAgent: service.userAgent ?? null,
        metadata: { role: role.role.name },
      },
    });
  });

  return { ok: true, value: { id: userId } };
}

/** Changes a company user's status and/or company role assignment. */
export async function updateCompanyUser(
  service: ServiceContext,
  companyId: string,
  userId: string,
  input: Omit<UpdateCompanyUserInput, 'reason'>,
  reason: string,
): Promise<ServiceResult<{ id: string }>> {
  if (!canManage(service)) {
    return { ok: false, code: 'PERMISSION_DENIED', message: 'You are not allowed to manage company users' };
  }

  const membership = await prisma.userMembership.findFirst({
    where: { userId, companyId },
    select: { id: true },
  });
  if (!membership) return { ok: false, code: 'NOT_FOUND', message: 'User is not a member of this company' };

  let roleName: string | null = null;
  if (input.roleId) {
    const role = await resolveRole(input.roleId, companyId);
    if (!role.ok) return { ok: false, code: 'INVALID', message: role.message };
    roleName = role.role.name;
  }

  await prisma.$transaction(async (tx) => {
    if (input.status) {
      await tx.user.update({
        where: { id: userId },
        data: {
          status: input.status,
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      });
      await tx.userMembership.update({
        where: { id: membership.id },
        data: { status: input.status === 'ACTIVE' ? 'ACTIVE' : 'SUSPENDED' },
      });
      if (input.status !== 'ACTIVE') {
        await tx.session.updateMany({
          where: { userId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
    }

    if (input.roleId) {
      await tx.userRole.deleteMany({
        where: {
          userId,
          OR: [
            { companyId },
            { companyId: null, role: { scopeType: { not: 'PLATFORM' } } },
          ],
        },
      });
      await tx.userRole.create({
        data: {
          id: newId(),
          userId,
          roleId: input.roleId,
          companyId,
          assignedBy: service.actorUserId,
        },
      });
    }

    await tx.auditLog.create({
      data: {
        id: newId(),
        companyId,
        actorUserId: service.actorUserId,
        action: 'COMPANY_USER_UPDATED',
        resourceType: 'user',
        resourceId: userId,
        result: 'SUCCESS',
        reason,
        requestId: service.requestId,
        ipAddress: service.ipAddress ?? null,
        userAgent: service.userAgent ?? null,
        metadata: {
          status: input.status ?? null,
          role: roleName,
        },
      },
    });
  });

  return { ok: true, value: { id: userId } };
}

/** Records an audited password reset for a company user. */
export async function resetCompanyUserPassword(
  service: ServiceContext,
  companyId: string,
  userId: string,
  newPassword: string,
  reason: string,
): Promise<ServiceResult<{ sessionsRevoked: number }>> {
  const membership = await prisma.userMembership.findFirst({
    where: { userId, companyId },
    select: { id: true },
  });
  if (!membership) return { ok: false, code: 'NOT_FOUND', message: 'User is not a member of this company' };

  const passwordHash = await hashPassword(newPassword);
  const [, revoked] = await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { passwordHash, failedLoginAttempts: 0, lockedUntil: null },
    }),
    prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);
  await recordAudit({
    companyId,
    actorUserId: service.actorUserId,
    action: 'ADMIN_PASSWORD_RESET',
    resourceType: 'user',
    resourceId: userId,
    result: 'SUCCESS',
    reason,
    requestId: service.requestId,
    ipAddress: service.ipAddress,
    userAgent: service.userAgent,
    metadata: { companyScoped: true },
  });

  return { ok: true, value: { sessionsRevoked: revoked.count } };
}
