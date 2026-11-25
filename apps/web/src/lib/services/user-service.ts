import { authorize } from '@society/authorization';
import { prisma, recordAudit } from '@society/database';
import { hashPassword } from '@/lib/auth/password';
import type { ServiceContext, ServiceResult } from './company-service';

/**
 * Administrative password reset. Platform super admins may reset any company
 * user; company admins may only reset users inside their active company.
 * All active sessions for the target are revoked and the action is audited.
 */
export async function resetUserPassword(
  service: ServiceContext,
  targetUserId: string,
  newPassword: string,
  reason: string,
): Promise<ServiceResult<{ userId: string; sessionsRevoked: number }>> {
  const platformDecision = authorize(service.context, {
    moduleKey: 'auth', resourceKey: 'account', action: 'UPDATE', platform: true,
  });
  const companyDecision = platformDecision.ok ? null : authorize(service.context, {
    moduleKey: 'auth', resourceKey: 'account', action: 'UPDATE',
  });
  if (!platformDecision.ok && !companyDecision?.ok) {
    await recordAudit({
      actorUserId: service.actorUserId,
      action: 'auth:account:UPDATE',
      resourceType: 'user',
      resourceId: targetUserId,
      result: 'DENIED',
      reason: platformDecision.ok ? 'PERMISSION_DENIED' : companyDecision!.error.reason,
      requestId: service.requestId,
      ipAddress: service.ipAddress,
      userAgent: service.userAgent,
    });
    return { ok: false, code: 'PERMISSION_DENIED', message: 'You are not allowed to reset user passwords' };
  }
  const isPlatformActor = platformDecision.ok;

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: {
      id: true,
      memberships: { where: { status: 'ACTIVE' }, select: { companyId: true } },
    },
  });
  if (!target || target.memberships.length === 0) {
    return { ok: false, code: 'NOT_FOUND', message: 'Company user not found' };
  }
  if (!isPlatformActor && !target.memberships.some((row) => row.companyId === service.context.activeCompanyId)) {
    return { ok: false, code: 'NOT_FOUND', message: 'Company user not found in the active company' };
  }

  const passwordHash = await hashPassword(newPassword);
  const [, revokedSessions] = await prisma.$transaction([
    prisma.user.update({
      where: { id: targetUserId },
      data: { passwordHash, failedLoginAttempts: 0, lockedUntil: null },
    }),
    prisma.session.updateMany({
      where: { userId: targetUserId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);
  const sessionsRevoked = revokedSessions.count;
  await recordAudit({
    companyId: isPlatformActor ? target.memberships[0]?.companyId ?? null : service.context.activeCompanyId,
    actorUserId: service.actorUserId,
    action: 'ADMIN_PASSWORD_RESET',
    resourceType: 'user',
    resourceId: targetUserId,
    result: 'SUCCESS',
    reason,
    requestId: service.requestId,
    ipAddress: service.ipAddress,
    userAgent: service.userAgent,
    metadata: { platform: isPlatformActor },
  });

  return { ok: true, value: { userId: targetUserId, sessionsRevoked } };
}

/**
 * Administrative change of a tenant user's login email. Available to platform
 * super admins and company admins in scope, and always audited.
 */
export async function updateUserEmail(
  service: ServiceContext,
  targetUserId: string,
  newEmail: string,
  reason: string,
): Promise<ServiceResult<{ userId: string; email: string }>> {
  const platformDecision = authorize(service.context, {
    moduleKey: 'auth', resourceKey: 'account', action: 'UPDATE', platform: true,
  });
  const companyDecision = platformDecision.ok ? null : authorize(service.context, {
    moduleKey: 'auth', resourceKey: 'account', action: 'UPDATE',
  });
  if (!platformDecision.ok && !companyDecision?.ok) {
    return { ok: false, code: 'PERMISSION_DENIED', message: 'You are not allowed to change user emails' };
  }
  const isPlatformActor = platformDecision.ok;

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: {
      id: true,
      memberships: { where: { status: 'ACTIVE' }, select: { companyId: true } },
    },
  });
  if (!target || target.memberships.length === 0) {
    return { ok: false, code: 'NOT_FOUND', message: 'Company user not found' };
  }
  if (!isPlatformActor && !target.memberships.some((row) => row.companyId === service.context.activeCompanyId)) {
    return { ok: false, code: 'NOT_FOUND', message: 'Company user not found in the active company' };
  }

  const duplicate = await prisma.user.findUnique({ where: { email: newEmail }, select: { id: true } });
  if (duplicate && duplicate.id !== targetUserId) {
    return { ok: false, code: 'CONFLICT', message: 'A user with this email already exists' };
  }

  await prisma.user.update({
    where: { id: targetUserId },
    data: { email: newEmail },
  });
  await recordAudit({
    companyId: isPlatformActor ? target.memberships[0]?.companyId ?? null : service.context.activeCompanyId,
    actorUserId: service.actorUserId,
    action: 'ADMIN_EMAIL_UPDATED',
    resourceType: 'user',
    resourceId: targetUserId,
    result: 'SUCCESS',
    reason,
    requestId: service.requestId,
    ipAddress: service.ipAddress,
    userAgent: service.userAgent,
    metadata: { platform: isPlatformActor, email: newEmail },
  });

  return { ok: true, value: { userId: targetUserId, email: newEmail } };
}
