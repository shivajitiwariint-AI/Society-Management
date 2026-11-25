import type { AccessMode, DataScope, ModuleKey, RoleScope } from '@society/shared';

export interface AuthenticatedIdentity {
  userId: string;
  email: string;
  status: 'ACTIVE' | 'INACTIVE' | 'LOCKED';
}

export interface ActiveMembership {
  companyId: string;
  societyId: string | null;
  status: 'ACTIVE' | 'INVITED' | 'SUSPENDED';
}

export interface RoleGrant {
  roleId: string;
  roleKey: string;
  scopeType: RoleScope;
  companyId: string | null;
  societyId: string | null;
  dataScope: DataScope;
  permissionKeys: ReadonlySet<string>;
  expiresAt: Date | null;
}

export interface ModuleEntitlement {
  moduleKey: ModuleKey;
  accessMode: AccessMode;
  isEnabled: boolean;
}

/**
 * Server-derived request context. companyId/societyId are taken from the
 * verified session and memberships -- never from a browser-provided value.
 */
export interface RequestContext {
  requestId: string;
  identity: AuthenticatedIdentity | null;
  memberships: readonly ActiveMembership[];
  roles: readonly RoleGrant[];
  entitlements: ReadonlyMap<ModuleKey, ModuleEntitlement>;
  activeCompanyId: string | null;
  activeSocietyId: string | null;
}

export function anonymousContext(requestId: string): RequestContext {
  return {
    requestId,
    identity: null,
    memberships: [],
    roles: [],
    entitlements: new Map(),
    activeCompanyId: null,
    activeSocietyId: null,
  };
}
