import {
  PERMISSION_ACTIONS,
  isCoreModule,
  permissionKey,
  type DataScope,
  type ModuleKey,
  type PermissionAction,
  type RoleScope,
} from '@society/shared';
import { err, ok, type AuthorizationResult, type DenyReason } from '@society/shared';
import type { RequestContext, RoleGrant } from './context';

const READ_ACTIONS: ReadonlySet<PermissionAction> = new Set(['READ', 'EXPORT']);

export interface AuthorizationRequest {
  moduleKey: ModuleKey;
  resourceKey: string;
  action: PermissionAction;
  /** Server-derived company; defaults to the active company in the context. */
  companyId?: string;
  societyId?: string;
  ownerUserId?: string;
  assignedUserId?: string;
  /** Platform-level operation: no company membership required; PLATFORM role only. */
  platform?: boolean;
  /** Business approval rule evaluated last (SRS 8.5 step 7). */
  businessRule?: (context: RequestContext, request: AuthorizationRequest) => boolean;
}

function deny<T = undefined>(reason: DenyReason, message: string): AuthorizationResult<T> {
  return err({ reason, message });
}

function roleMatchesScope(role: RoleGrant, request: AuthorizationRequest, context: RequestContext): boolean {
  const companyId = request.companyId ?? context.activeCompanyId;
  switch (role.scopeType) {
    case 'PLATFORM':
      return role.companyId === null;
    case 'COMPANY':
      return role.companyId !== null && role.companyId === companyId;
    case 'SOCIETY': {
      const societyId = request.societyId ?? context.activeSocietyId;
      return role.companyId === companyId && !!societyId && (role.societyId === null || role.societyId === societyId);
    }
  }
}

function dataScopeAllows(
  scope: DataScope,
  role: RoleGrant,
  request: AuthorizationRequest,
  context: RequestContext,
): boolean {
  const identity = context.identity;
  if (!identity) return false;
  switch (scope) {
    case 'PLATFORM':
      return role.scopeType === 'PLATFORM';
    case 'COMPANY':
      return role.companyId === (request.companyId ?? context.activeCompanyId);
    case 'SOCIETY': {
      const societyId = request.societyId ?? context.activeSocietyId;
      return !!societyId && (role.societyId === null || role.societyId === societyId);
    }
    case 'OWN':
      return request.ownerUserId === identity.userId;
    case 'ASSIGNED':
      return request.assignedUserId === identity.userId;
  }
}

/**
 * Server-enforced RBAC with the exact evaluation order from SRS 8.5.
 * Multiple roles are additive, but each grant must independently satisfy
 * scope checks so a broad role cannot be "mixed" with a narrow one.
 */
export type AuthorizedScope = { requestId: string; companyId: string | null; societyId: string | null };

export function authorize(context: RequestContext, request: AuthorizationRequest): AuthorizationResult<AuthorizedScope> {
  // 1. Authenticated and active.
  if (!context.identity || context.identity.status !== 'ACTIVE') {
    return deny('UNAUTHENTICATED', 'Authentication is required');
  }

  // 2 & 3. Active membership covering the requested company and society.
  // Platform operations use separate platform-level authorization (SRS 6.2).
  const companyId = request.companyId ?? context.activeCompanyId;
  const societyId = request.societyId ?? context.activeSocietyId;
  if (!request.platform) {
    if (!companyId || companyId !== context.activeCompanyId) {
      return deny('COMPANY_OUT_OF_SCOPE', 'The active company does not match the requested company');
    }
    const membership = context.memberships.find(
      (candidate) => candidate.companyId === companyId && candidate.status === 'ACTIVE',
    );
    if (!membership) return deny('NO_ACTIVE_MEMBERSHIP', 'No active membership for this company');

    if (societyId) {
      const societyMember = context.memberships.some(
        (candidate) =>
          candidate.companyId === companyId &&
          candidate.status === 'ACTIVE' &&
          (candidate.societyId === null || candidate.societyId === societyId),
      );
      if (!societyMember) return deny('SOCIETY_OUT_OF_SCOPE', 'No active membership for this society');
    }
  }

  // 4. Module entitlement.
  if (!isCoreModule(request.moduleKey)) {
    const entitlement = context.entitlements.get(request.moduleKey);
    if (!entitlement || !entitlement.isEnabled || entitlement.accessMode === 'DISABLED') {
      return deny('MODULE_DISABLED', `Module '${request.moduleKey}' is not enabled for this company`);
    }
    if (entitlement.accessMode === 'READ_ONLY' && !READ_ACTIONS.has(request.action)) {
      return deny('MODULE_READ_ONLY', `Module '${request.moduleKey}' is read-only for this company`);
    }
  }

  // 5 & 6. Permission and data scope.
  const requiredKey = permissionKey(request.moduleKey, request.resourceKey, request.action);
  const now = Date.now();
  const allowed = context.roles.some((role) => {
    if (!role.permissionKeys.has(requiredKey)) return false;
    if (role.expiresAt && role.expiresAt.getTime() <= now) return false;
    if (request.platform && role.scopeType !== 'PLATFORM') return false;
    if (!request.platform && !roleMatchesScope(role, request, context)) return false;
    return dataScopeAllows(role.dataScope, role, request, context);
  });
  if (!allowed) return deny('PERMISSION_DENIED', 'The required permission is not granted within the current data scope');

  // 7. Additional business approval rule.
  if (request.businessRule && !request.businessRule(context, request)) {
    return deny('BUSINESS_RULE_DENIED', 'An additional business rule denied this operation');
  }

  return ok({ requestId: context.requestId, companyId, societyId });
}

export function hasPermission(context: RequestContext, key: string, roleScope: RoleScope = 'COMPANY'): boolean {
  return context.roles.some(
    (role) => role.scopeType === roleScope && role.permissionKeys.has(key),
  );
}

export function isKnownAction(action: string): action is PermissionAction {
  return (PERMISSION_ACTIONS as readonly string[]).includes(action);
}

/** Tenant isolation helper for queries that must never cross companies. */
export function assertCompanyScope(context: RequestContext, companyId: string): AuthorizationResult {
  if (!context.identity || context.identity.status !== 'ACTIVE') {
    return deny('UNAUTHENTICATED', 'Authentication is required');
  }
  if (companyId !== context.activeCompanyId) {
    return deny('COMPANY_OUT_OF_SCOPE', 'Requested company is outside the active membership');
  }
  return ok(undefined);
}
