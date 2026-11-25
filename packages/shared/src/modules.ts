/**
 * Stable module keys (SRS 7.4). Keys must never depend on display labels.
 * Core modules cannot be disabled; business modules are entitled per company.
 */

export const CORE_MODULE_KEYS = [
  'auth',
  'company',
  'rbac',
  'society-foundation',
  'audit',
  'security-settings',
] as const;

export const BUSINESS_MODULE_KEYS = [
  'residents',
  'finance-billing',
  'payments-receipts',
  'accounting',
  'visitors',
  'complaints-maintenance',
  'amenities-bookings',
  'parking-vehicles',
  'staff-attendance',
  'vendors-contracts',
  'notices-communication',
  'documents',
  'meetings-voting',
  'advanced-reports',
  'integrations',
] as const;

export const ALL_MODULE_KEYS = [...CORE_MODULE_KEYS, ...BUSINESS_MODULE_KEYS] as const;

export type ModuleKey = (typeof ALL_MODULE_KEYS)[number];
export type BusinessModuleKey = (typeof BUSINESS_MODULE_KEYS)[number];

export interface ModuleDefinition {
  key: ModuleKey;
  name: string;
  description: string;
  isCore: boolean;
  sortOrder: number;
}

export const MODULES: readonly ModuleDefinition[] = [
  { key: 'auth', name: 'Authentication & Accounts', description: 'Sign-in, sessions and account security', isCore: true, sortOrder: 1 },
  { key: 'company', name: 'Company & Membership', description: 'Company profile and user memberships', isCore: true, sortOrder: 2 },
  { key: 'rbac', name: 'Roles & Permissions', description: 'Role-based access control administration', isCore: true, sortOrder: 3 },
  { key: 'society-foundation', name: 'Society Foundation', description: 'Societies, buildings, floors and flats', isCore: true, sortOrder: 4 },
  { key: 'audit', name: 'Audit Logging', description: 'Append-only security and business audit trail', isCore: true, sortOrder: 5 },
  { key: 'security-settings', name: 'Security & System Settings', description: 'Platform and company security configuration', isCore: true, sortOrder: 6 },
  { key: 'residents', name: 'Resident Management', description: 'Owners, tenants, family members and vehicles', isCore: false, sortOrder: 10 },
  { key: 'finance-billing', name: 'Finance & Maintenance Billing', description: 'Charges, billing rules, invoices and dues', isCore: false, sortOrder: 11 },
  { key: 'payments-receipts', name: 'Payments & Receipts', description: 'Payment recording, receipts and refunds', isCore: false, sortOrder: 12 },
  { key: 'accounting', name: 'Accounting', description: 'Chart of accounts, journals, expenses and ledgers', isCore: false, sortOrder: 13 },
  { key: 'visitors', name: 'Visitor Management', description: 'Visitor registration, approvals and gate log', isCore: false, sortOrder: 14 },
  { key: 'complaints-maintenance', name: 'Complaints & Maintenance', description: 'Complaints, work orders and SLAs', isCore: false, sortOrder: 15 },
  { key: 'amenities-bookings', name: 'Amenities & Bookings', description: 'Facilities, slots, booking rules and conflicts', isCore: false, sortOrder: 16 },
  { key: 'parking-vehicles', name: 'Parking & Vehicles', description: 'Parking inventory, allocations and visitor parking', isCore: false, sortOrder: 17 },
  { key: 'staff-attendance', name: 'Staff & Attendance', description: 'Employees, shifts, attendance and leave', isCore: false, sortOrder: 18 },
  { key: 'vendors-contracts', name: 'Vendors & Contracts', description: 'Vendors, contracts and vendor work orders', isCore: false, sortOrder: 19 },
  { key: 'notices-communication', name: 'Notices & Communication', description: 'Notices, announcements and notifications', isCore: false, sortOrder: 20 },
  { key: 'documents', name: 'Documents', description: 'Private document storage and controlled access', isCore: false, sortOrder: 21 },
  { key: 'meetings-voting', name: 'Meetings & Voting', description: 'Meetings, agendas, quorum and votes', isCore: false, sortOrder: 22 },
  { key: 'advanced-reports', name: 'Advanced Reports', description: 'Cross-module reports and exports', isCore: false, sortOrder: 23 },
  { key: 'integrations', name: 'Integrations', description: 'Approved external provider adapters', isCore: false, sortOrder: 24 },
];

/** Directed edges: [module, dependsOn]. SRS 7.3. */
export const MODULE_DEPENDENCIES: readonly (readonly [ModuleKey, ModuleKey])[] = [
  ['residents', 'society-foundation'],
  ['finance-billing', 'society-foundation'],
  ['finance-billing', 'residents'],
  ['payments-receipts', 'finance-billing'],
  ['accounting', 'finance-billing'],
  ['accounting', 'payments-receipts'],
  ['visitors', 'society-foundation'],
  ['visitors', 'residents'],
  ['complaints-maintenance', 'society-foundation'],
  ['complaints-maintenance', 'residents'],
  ['amenities-bookings', 'society-foundation'],
  ['amenities-bookings', 'residents'],
  ['parking-vehicles', 'society-foundation'],
  ['parking-vehicles', 'residents'],
  ['staff-attendance', 'society-foundation'],
  ['vendors-contracts', 'society-foundation'],
  ['notices-communication', 'society-foundation'],
  ['documents', 'society-foundation'],
  ['meetings-voting', 'society-foundation'],
  ['meetings-voting', 'residents'],
  ['advanced-reports', 'residents'],
  ['advanced-reports', 'finance-billing'],
  ['advanced-reports', 'payments-receipts'],
  ['advanced-reports', 'accounting'],
  ['advanced-reports', 'visitors'],
  ['advanced-reports', 'complaints-maintenance'],
  ['advanced-reports', 'amenities-bookings'],
  ['advanced-reports', 'parking-vehicles'],
  ['integrations', 'society-foundation'],
];

export function isCoreModule(key: ModuleKey): boolean {
  return (CORE_MODULE_KEYS as readonly string[]).includes(key);
}

export function getModuleDefinition(key: ModuleKey): ModuleDefinition {
  const definition = MODULES.find((module) => module.key === key);
  if (!definition) throw new Error(`Unknown module key: ${key}`);
  return definition;
}

export function getDependencies(key: ModuleKey): readonly ModuleKey[] {
  return MODULE_DEPENDENCIES.filter(([module]) => module === key).map(([, dependsOn]) => dependsOn);
}

/**
 * Returns dependencies that are missing from `enabledKeys`.
 * Used by the entitlement service before enabling a module (SRS 7.3).
 */
export function missingDependencies(
  key: ModuleKey,
  enabledKeys: ReadonlySet<ModuleKey>,
): readonly ModuleKey[] {
  return getDependencies(key).filter((dependency) => !enabledKeys.has(dependency));
}

export function validateEntitlementChange(
  key: ModuleKey,
  enabledKeys: ReadonlySet<ModuleKey>,
): { ok: true } | { ok: false; missing: readonly ModuleKey[] } {
  if (isCoreModule(key)) return { ok: true };
  const missing = missingDependencies(key, enabledKeys);
  return missing.length === 0 ? { ok: true } : { ok: false, missing };
}
