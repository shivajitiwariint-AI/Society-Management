import { describe, expect, it } from 'vitest';
import { permissionKey } from '@society/shared';
import { authorize, canAccessModule, type RequestContext, type RoleGrant } from './index';

const COMPANY_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_COMPANY_ID = '22222222-2222-4222-8222-222222222222';
const SOCIETY_ID = '33333333-3333-4333-8333-333333333333';
const USER_ID = '44444444-4444-4444-8444-444444444444';

function role(overrides: Partial<RoleGrant> = {}): RoleGrant {
  return {
    roleId: 'role-1',
    roleKey: 'company-admin',
    scopeType: 'COMPANY',
    companyId: COMPANY_ID,
    societyId: null,
    dataScope: 'COMPANY',
    permissionKeys: new Set([permissionKey('residents', 'resident', 'READ')]),
    expiresAt: null,
    ...overrides,
  };
}

function context(overrides: Partial<RequestContext> = {}): RequestContext {
  return {
    requestId: 'test-request',
    identity: { userId: USER_ID, email: 'user@example.com', status: 'ACTIVE' },
    memberships: [{ companyId: COMPANY_ID, societyId: SOCIETY_ID, status: 'ACTIVE' }],
    roles: [role()],
    entitlements: new Map([['residents', { moduleKey: 'residents', isEnabled: true, accessMode: 'FULL' }]]),
    activeCompanyId: COMPANY_ID,
    activeSocietyId: SOCIETY_ID,
    ...overrides,
  };
}

const request = {
  moduleKey: 'residents' as const,
  resourceKey: 'resident',
  action: 'READ' as const,
};

describe('authorize (SRS 8.5 evaluation order)', () => {
  it('denies anonymous requests', () => {
    const result = authorize(context({ identity: null }), request);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.reason).toBe('UNAUTHENTICATED');
  });

  it('denies inactive users', () => {
    const result = authorize(context({ identity: { userId: USER_ID, email: 'x', status: 'LOCKED' } }), request);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.reason).toBe('UNAUTHENTICATED');
  });

  it('denies a company outside the active membership', () => {
    const result = authorize(context(), { ...request, companyId: OTHER_COMPANY_ID });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.reason).toBe('COMPANY_OUT_OF_SCOPE');
  });

  it('denies a society outside the active membership', () => {
    const result = authorize(context(), { ...request, societyId: '99999999-9999-4999-8999-999999999999' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.reason).toBe('SOCIETY_OUT_OF_SCOPE');
  });

  it('denies a disabled business module', () => {
    const result = authorize(context({ entitlements: new Map() }), request);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.reason).toBe('MODULE_DISABLED');
  });

  it('allows reads but denies writes when the module is read-only', () => {
    const readOnly = context({
      entitlements: new Map([['residents', { moduleKey: 'residents', isEnabled: true, accessMode: 'READ_ONLY' }]]),
    });
    expect(authorize(readOnly, request).ok).toBe(true);
    const write = authorize(readOnly, { ...request, action: 'CREATE' });
    expect(write.ok).toBe(false);
    if (!write.ok) expect(write.error.reason).toBe('MODULE_READ_ONLY');
  });

  it('denies a missing permission', () => {
    const result = authorize(context({ roles: [role({ permissionKeys: new Set() })] }), request);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.reason).toBe('PERMISSION_DENIED');
  });

  it('enforces SOCIETY data scope', () => {
    const scoped = role({ scopeType: 'SOCIETY', societyId: SOCIETY_ID, dataScope: 'SOCIETY' });
    expect(authorize(context({ roles: [scoped] }), request).ok).toBe(true);
    const result = authorize(context({ roles: [scoped] }), {
      ...request,
      societyId: '99999999-9999-4999-8999-999999999999',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.reason).toBe('SOCIETY_OUT_OF_SCOPE');
  });

  it('enforces OWN and ASSIGNED data scopes', () => {
    const own = role({ dataScope: 'OWN' });
    expect(authorize(context({ roles: [own] }), { ...request, ownerUserId: USER_ID }).ok).toBe(true);
    expect(authorize(context({ roles: [own] }), { ...request, ownerUserId: 'someone-else' }).ok).toBe(false);

    const assigned = role({ dataScope: 'ASSIGNED' });
    expect(authorize(context({ roles: [assigned] }), { ...request, assignedUserId: USER_ID }).ok).toBe(true);
    expect(authorize(context({ roles: [assigned] }), { ...request, assignedUserId: 'someone-else' }).ok).toBe(false);
  });

  it('rejects expired role assignments', () => {
    const expired = role({ expiresAt: new Date(Date.now() - 1000) });
    const result = authorize(context({ roles: [expired] }), request);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.reason).toBe('PERMISSION_DENIED');
  });

  it('evaluates the optional business rule last', () => {
    const result = authorize(context(), { ...request, businessRule: () => false });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.reason).toBe('BUSINESS_RULE_DENIED');
  });

  it('uses separate platform authorization for Super Admin', () => {
    const platformRole = role({
      scopeType: 'PLATFORM',
      companyId: null,
      dataScope: 'PLATFORM',
      permissionKeys: new Set([permissionKey('company', 'profile', 'READ')]),
    });
    const platformContext = context({
      identity: { userId: USER_ID, email: 'admin@example.com', status: 'ACTIVE' },
      memberships: [],
      roles: [platformRole],
      activeCompanyId: null,
      activeSocietyId: null,
    });
    expect(authorize(platformContext, {
      moduleKey: 'company',
      resourceKey: 'profile',
      action: 'READ',
      platform: true,
    }).ok).toBe(true);
    expect(authorize(context(), {
      moduleKey: 'company',
      resourceKey: 'profile',
      action: 'READ',
      platform: true,
    }).ok).toBe(false);
  });
});

describe('module entitlement navigation filter', () => {
  it('hides disabled modules and core modules are always available', () => {
    const ctx = context({ entitlements: new Map() });
    expect(canAccessModule(ctx, 'residents').ok).toBe(false);
    expect(canAccessModule(ctx, 'company').ok).toBe(true);
  });
});
