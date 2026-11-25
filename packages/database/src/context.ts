import type { ModuleEntitlement, RequestContext, RoleGrant } from '@society/authorization';
import { ALL_MODULE_KEYS, type ModuleKey } from '@society/shared';
import { prisma } from './client';

/** Builds the server-derived authorization context for an authenticated user. */
export async function loadRequestContext(
  userId: string,
  activeCompanyId: string | null,
  activeSocietyId: string | null,
  requestId: string,
): Promise<RequestContext | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, status: true },
  });
  if (!user) return null;

  const membershipRows = await prisma.userMembership.findMany({
    where: { userId, status: 'ACTIVE' },
    select: { companyId: true, societyId: true, status: true },
  });

  const assignmentRows = await prisma.userRole.findMany({
    where: { userId, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
    select: {
      // System roles are global templates; the assignment carries tenant scope.
      companyId: true,
      societyId: true,
      role: {
        select: {
          id: true,
          key: true,
          scopeType: true,
          companyId: true,
          societyId: true,
          permissions: {
            select: { dataScope: true, permission: { select: { key: true } } },
          },
        },
      },
    },
  });

  // Platform-wide administrators may operate inside a tenant they explicitly
  // selected, even without a membership row. Give them a synthetic active
  // membership so the normal tenant authorization path applies unchanged.
  const effectiveMemberships = [...membershipRows];
  const hasPlatformGrant = assignmentRows.some(
    (assignment) =>
      assignment.role.scopeType === 'PLATFORM' &&
      assignment.role.permissions.some((grant) => grant.dataScope === 'PLATFORM'),
  );
  if (
    hasPlatformGrant &&
    activeCompanyId &&
    !effectiveMemberships.some((membership) => membership.companyId === activeCompanyId)
  ) {
    effectiveMemberships.push({
      companyId: activeCompanyId,
      societyId: activeSocietyId,
      status: 'ACTIVE' as (typeof membershipRows)[number]['status'],
    });
  }

  // Expand each role into one grant per data scope so scope checks stay precise (SRS 8.4).
  const roles: RoleGrant[] = assignmentRows.flatMap((assignment) => {
    const base = {
      roleId: assignment.role.id,
      roleKey: assignment.role.key,
      scopeType: assignment.role.scopeType,
      companyId: assignment.role.companyId ?? assignment.companyId,
      societyId: assignment.role.societyId ?? assignment.societyId,
      expiresAt: null,
    };
    const byScope = new Map<string, { keys: Set<string>; scope: RoleGrant['dataScope'] }>();
    for (const grant of assignment.role.permissions) {
      const entry = byScope.get(grant.dataScope) ?? { keys: new Set<string>(), scope: grant.dataScope };
      entry.keys.add(grant.permission.key);
      byScope.set(grant.dataScope, entry);
    }
    return [...byScope.values()].map((entry) => ({
      ...base,
      dataScope: entry.scope,
      permissionKeys: entry.keys,
    }));
  });

  const entitlementRows = activeCompanyId
    ? await prisma.companyModule.findMany({
        where: { companyId: activeCompanyId },
        select: { isEnabled: true, accessMode: true, module: { select: { key: true } } },
      })
    : [];

  const entitlements = new Map<ModuleKey, ModuleEntitlement>();
  for (const row of entitlementRows) {
    const key = row.module.key as ModuleKey;
    if (!(ALL_MODULE_KEYS as readonly string[]).includes(key)) continue;
    entitlements.set(key, { moduleKey: key, accessMode: row.accessMode, isEnabled: row.isEnabled });
  }

  return {
    requestId,
    identity: {
      userId: user.id,
      email: user.email,
      status: user.status === 'ACTIVE' ? 'ACTIVE' : user.status === 'LOCKED' ? 'LOCKED' : 'INACTIVE',
    },
    memberships: effectiveMemberships.map((membership) => ({
      companyId: membership.companyId,
      societyId: membership.societyId,
      status: membership.status,
    })),
    roles,
    entitlements,
    activeCompanyId,
    activeSocietyId,
  };
}
