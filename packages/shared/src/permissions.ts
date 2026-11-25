import { BUSINESS_MODULE_KEYS, type ModuleKey } from './modules';
import { OPERATION_DEFINITIONS } from './operations';

export const PERMISSION_ACTIONS = [
  'CREATE',
  'READ',
  'UPDATE',
  'DELETE',
  'APPROVE',
  'REJECT',
  'EXPORT',
  'IMPORT',
  'ASSIGN',
  'CLOSE',
  'REFUND',
  'MANAGE_SETTINGS',
] as const;

export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

export const DATA_SCOPES = ['PLATFORM', 'COMPANY', 'SOCIETY', 'OWN', 'ASSIGNED'] as const;
export type DataScope = (typeof DATA_SCOPES)[number];

export const ACCESS_MODES = ['FULL', 'READ_ONLY', 'DISABLED'] as const;
export type AccessMode = (typeof ACCESS_MODES)[number];

export const ROLE_SCOPES = ['PLATFORM', 'COMPANY', 'SOCIETY'] as const;
export type RoleScope = (typeof ROLE_SCOPES)[number];

/** Resource keys are stable identifiers grouped by module (SRS 8.1/8.3). */
export const RESOURCES: Readonly<Record<ModuleKey, readonly string[]>> = {
  auth: ['account', 'session'],
  company: ['profile', 'settings', 'society', 'membership', 'invitation'],
  rbac: ['role', 'permission', 'user-role'],
  'society-foundation': ['building', 'floor', 'flat', 'society-settings'],
  audit: ['audit-log', 'login-history', 'security-event'],
  'security-settings': ['system-setting'],
  residents: ['resident', 'ownership', 'tenancy', 'family-member', 'vehicle'],
  'finance-billing': ['charge-type', 'billing-rule', 'invoice', 'invoice-item', 'dues-report', 'maintenance-expense'],
  'payments-receipts': ['payment', 'receipt', 'refund', 'reconciliation'],
  accounting: ['account', 'journal-entry', 'expense', 'expense-approval', 'bank-transaction'],
  visitors: ['visitor', 'visitor-approval', 'gate', 'visitor-session'],
  'complaints-maintenance': ['complaint', 'complaint-assignment', 'complaint-comment', 'work-order'],
  'amenities-bookings': ['amenity', 'amenity-slot', 'booking'],
  'parking-vehicles': ['parking-slot', 'parking-allocation'],
  'staff-attendance': ['employee', 'attendance', 'shift', 'leave-request'],
  'vendors-contracts': ['vendor', 'contract', 'vendor-invoice'],
  'notices-communication': ['notice', 'notification', 'notification-preference'],
  documents: ['document', 'document-permission'],
  'meetings-voting': ['meeting', 'meeting-agenda', 'meeting-attendance', 'voting-session', 'vote', 'meeting-minutes'],
  'advanced-reports': ['report', 'dashboard'],
  integrations: ['integration', 'webhook-endpoint'],
};

/** Stable permission key used in seeds, policies and audit records. */
export function permissionKey(moduleKey: ModuleKey, resourceKey: string, action: PermissionAction): string {
  return `${moduleKey}:${resourceKey}:${action}`;
}

export function parsePermissionKey(key: string): { moduleKey: ModuleKey; resourceKey: string; action: PermissionAction } | null {
  const parts = key.split(':');
  if (parts.length !== 3) return null;
  const [moduleKey, resourceKey, action] = parts as [string, string, string];
  if (!(PERMISSION_ACTIONS as readonly string[]).includes(action)) return null;
  return { moduleKey: moduleKey as ModuleKey, resourceKey, action: action as PermissionAction };
}

export interface SystemRoleDefinition {
  key: string;
  name: string;
  scope: (typeof ROLE_SCOPES)[number];
  description: string;
  /** Permission keys granted to this role. */
  permissions: readonly string[];
}

const p = permissionKey;

function residentManagementPermissions(): string[] {
  return RESOURCES.residents.flatMap((resource) =>
    (['CREATE', 'READ', 'UPDATE', 'DELETE'] as const).map((action) => p('residents', resource, action)),
  );
}

function permissionsFor(moduleKey: ModuleKey, resources: readonly string[], actions: readonly PermissionAction[] = PERMISSION_ACTIONS): string[] {
  return resources.flatMap((resource) => actions.map((action) => p(moduleKey, resource, action)));
}

/** All permission keys for every business module (used by full administrators). */
function allBusinessPermissions(): string[] {
  return BUSINESS_MODULE_KEYS.flatMap((moduleKey) => permissionsFor(moduleKey, RESOURCES[moduleKey]));
}

/** Permissions for every workflow-style resource in the operational catalog. */
function allOperationPermissions(): string[] {
  const moduleKeys = [...new Set(OPERATION_DEFINITIONS.map((definition) => definition.moduleKey))];
  return moduleKeys.flatMap((moduleKey) => permissionsFor(moduleKey, RESOURCES[moduleKey]));
}

function financePermissions(): string[] {
  return [
    ...permissionsFor('finance-billing', RESOURCES['finance-billing']),
    ...permissionsFor('payments-receipts', RESOURCES['payments-receipts']),
    ...permissionsFor('accounting', RESOURCES['accounting']),
  ];
}

/**
 * Minimal, reviewable baseline roles. Company admins may create custom roles,
 * but cannot grant permissions they do not hold themselves (enforced in service).
 */
export const SYSTEM_ROLES: readonly SystemRoleDefinition[] = [
  {
    key: 'platform-super-admin',
    name: 'Super Admin',
    scope: 'PLATFORM',
    description: 'Full platform administration. MFA required. Never tenant-scoped.',
    permissions: [
      p('company', 'profile', 'CREATE'), p('company', 'profile', 'READ'), p('company', 'profile', 'UPDATE'),
      p('company', 'profile', 'DELETE'),
      p('company', 'society', 'CREATE'), p('company', 'society', 'READ'), p('company', 'society', 'UPDATE'),
      p('society-foundation', 'building', 'CREATE'), p('society-foundation', 'building', 'READ'),
      p('society-foundation', 'building', 'UPDATE'), p('society-foundation', 'floor', 'CREATE'),
      p('society-foundation', 'floor', 'READ'), p('society-foundation', 'floor', 'UPDATE'),
      p('society-foundation', 'flat', 'CREATE'), p('society-foundation', 'flat', 'READ'),
      p('society-foundation', 'flat', 'UPDATE'), p('society-foundation', 'society-settings', 'MANAGE_SETTINGS'),
      p('finance-billing', 'maintenance-expense', 'CREATE'), p('finance-billing', 'maintenance-expense', 'READ'),
      p('finance-billing', 'maintenance-expense', 'UPDATE'), p('finance-billing', 'maintenance-expense', 'DELETE'),
      ...residentManagementPermissions(),
      ...allBusinessPermissions(),
      p('rbac', 'role', 'CREATE'), p('rbac', 'role', 'READ'), p('rbac', 'role', 'UPDATE'), p('rbac', 'role', 'DELETE'),
      p('rbac', 'permission', 'READ'), p('rbac', 'user-role', 'ASSIGN'),
      p('company', 'membership', 'ASSIGN'), p('company', 'invitation', 'CREATE'),
      p('audit', 'audit-log', 'READ'), p('audit', 'login-history', 'READ'), p('audit', 'security-event', 'READ'),
      p('security-settings', 'system-setting', 'MANAGE_SETTINGS'),
      p('company', 'settings', 'READ'), p('company', 'settings', 'MANAGE_SETTINGS'),
      p('auth', 'account', 'READ'), p('auth', 'account', 'UPDATE'),
    ],
  },
  {
    key: 'platform-support',
    name: 'Platform Support',
    scope: 'PLATFORM',
    description: 'Support tooling only; no resident personal data or finance access by default.',
    permissions: [
      p('company', 'profile', 'READ'), p('audit', 'audit-log', 'READ'),
    ],
  },
  {
    key: 'company-admin',
    name: 'Company Admin',
    scope: 'COMPANY',
    description: 'Manages one company and all of its societies within enabled modules.',
    permissions: [
      p('company', 'profile', 'READ'), p('company', 'profile', 'UPDATE'),
      p('company', 'society', 'CREATE'), p('company', 'society', 'READ'), p('company', 'society', 'UPDATE'),
      p('company', 'membership', 'READ'), p('company', 'membership', 'ASSIGN'),
      p('company', 'invitation', 'CREATE'), p('company', 'settings', 'MANAGE_SETTINGS'),
      p('rbac', 'role', 'CREATE'), p('rbac', 'role', 'READ'), p('rbac', 'role', 'UPDATE'),
      p('rbac', 'user-role', 'ASSIGN'),
      p('society-foundation', 'building', 'CREATE'), p('society-foundation', 'building', 'READ'),
      p('society-foundation', 'building', 'UPDATE'), p('society-foundation', 'floor', 'CREATE'),
      p('society-foundation', 'floor', 'READ'), p('society-foundation', 'flat', 'CREATE'),
      p('society-foundation', 'flat', 'READ'), p('society-foundation', 'flat', 'UPDATE'),
      ...residentManagementPermissions(),
      ...allBusinessPermissions(),
      p('finance-billing', 'invoice', 'READ'), p('payments-receipts', 'payment', 'READ'),
      p('finance-billing', 'maintenance-expense', 'CREATE'), p('finance-billing', 'maintenance-expense', 'READ'),
      p('finance-billing', 'maintenance-expense', 'UPDATE'), p('finance-billing', 'maintenance-expense', 'DELETE'),
      p('advanced-reports', 'dashboard', 'READ'),
      p('audit', 'audit-log', 'READ'),
      p('auth', 'account', 'READ'), p('auth', 'account', 'UPDATE'),
    ],
  },
  {
    key: 'society-manager',
    name: 'Society Manager',
    scope: 'SOCIETY',
    description: 'Manages assigned societies; data scope SOCIETY.',
    permissions: [
      p('society-foundation', 'building', 'READ'), p('society-foundation', 'floor', 'READ'),
      p('society-foundation', 'flat', 'READ'), ...residentManagementPermissions(),
      p('finance-billing', 'invoice', 'READ'), p('payments-receipts', 'payment', 'READ'),
      p('finance-billing', 'maintenance-expense', 'READ'),
      ...allOperationPermissions(),
      p('finance-billing', 'invoice', 'READ'), p('payments-receipts', 'payment', 'READ'),
      p('advanced-reports', 'dashboard', 'READ'), p('advanced-reports', 'report', 'READ'),
    ],
  },
  {
    key: 'accountant',
    name: 'Accountant',
    scope: 'COMPANY',
    description: 'Creates invoices and records payments; cannot approve expenses or refund.',
    permissions: [
      p('residents', 'resident', 'READ'),
      ...financePermissions(),
    ],
  },
  {
    key: 'treasurer',
    name: 'Treasurer',
    scope: 'COMPANY',
    description: 'Approves expenses and views finance; no invoice creation by default.',
    permissions: [
      ...permissionsFor('finance-billing', RESOURCES['finance-billing'], ['READ', 'APPROVE', 'REJECT', 'EXPORT']),
      ...permissionsFor('payments-receipts', RESOURCES['payments-receipts'], ['READ', 'APPROVE', 'REJECT', 'REFUND', 'EXPORT']),
      ...permissionsFor('accounting', RESOURCES['accounting'], ['READ', 'APPROVE', 'REJECT', 'EXPORT']),
    ],
  },
  {
    key: 'committee-member',
    name: 'Committee Member',
    scope: 'SOCIETY',
    description: 'Read-only oversight of selected operations and finance.',
    permissions: [
      p('finance-billing', 'invoice', 'READ'), p('accounting', 'expense', 'READ'),
      p('finance-billing', 'maintenance-expense', 'READ'),
      ...permissionsFor('complaints-maintenance', RESOURCES['complaints-maintenance'], ['READ']),
      ...permissionsFor('visitors', RESOURCES['visitors'], ['READ']),
      p('advanced-reports', 'dashboard', 'READ'), p('advanced-reports', 'report', 'READ'),
    ],
  },
  {
    key: 'security-operator',
    name: 'Security Operator',
    scope: 'SOCIETY',
    description: 'Visitor registration and gate log only.',
    permissions: [
      p('visitors', 'visitor', 'CREATE'), p('visitors', 'visitor', 'READ'),
      p('visitors', 'visitor-approval', 'READ'), p('visitors', 'visitor-approval', 'APPROVE'),
      p('visitors', 'visitor-approval', 'REJECT'), p('visitors', 'gate', 'READ'),
      p('visitors', 'visitor-session', 'UPDATE'), p('visitors', 'visitor-session', 'CLOSE'),
    ],
  },
  {
    key: 'maintenance-staff',
    name: 'Maintenance Staff',
    scope: 'SOCIETY',
    description: 'Sees only work orders assigned to them; data scope ASSIGNED.',
    permissions: [
      p('complaints-maintenance', 'work-order', 'READ'), p('complaints-maintenance', 'work-order', 'UPDATE'),
    ],
  },
  {
    key: 'vendor',
    name: 'Vendor',
    scope: 'SOCIETY',
    description: 'Assigned work orders and permitted documents only.',
    permissions: [p('complaints-maintenance', 'work-order', 'READ')],
  },
  {
    key: 'resident',
    name: 'Resident / Owner / Tenant',
    scope: 'SOCIETY',
    description: 'Own records only; data scope OWN.',
    permissions: [
      p('society-foundation', 'flat', 'READ'),
      p('residents', 'resident', 'READ'),
      p('residents', 'ownership', 'READ'), p('residents', 'tenancy', 'READ'),
      p('residents', 'family-member', 'CREATE'), p('residents', 'family-member', 'READ'),
      p('residents', 'family-member', 'UPDATE'), p('residents', 'family-member', 'DELETE'),
      p('residents', 'vehicle', 'CREATE'), p('residents', 'vehicle', 'READ'),
      p('residents', 'vehicle', 'UPDATE'), p('residents', 'vehicle', 'DELETE'),
      p('finance-billing', 'invoice', 'READ'), p('payments-receipts', 'receipt', 'READ'),
      p('complaints-maintenance', 'complaint', 'CREATE'), p('complaints-maintenance', 'complaint', 'READ'),
      p('visitors', 'visitor-approval', 'APPROVE'),
      p('amenities-bookings', 'booking', 'CREATE'), p('amenities-bookings', 'booking', 'READ'),
      p('amenities-bookings', 'booking', 'CLOSE'),
      p('notices-communication', 'notice', 'READ'), p('documents', 'document', 'READ'),
    ],
  },
];

export function getSystemRoleDefinition(key: string): SystemRoleDefinition | undefined {
  return SYSTEM_ROLES.find((role) => role.key === key);
}
