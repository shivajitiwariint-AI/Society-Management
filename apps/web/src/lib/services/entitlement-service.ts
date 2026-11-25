import { authorize } from '@society/authorization';
import { ALL_MODULE_KEYS, MODULES, MODULE_DEPENDENCIES, isCoreModule, missingDependencies, type ModuleKey } from '@society/shared';
import { prisma, recordAudit } from '@society/database';
import type { ServiceResult, ServiceContext } from './company-service';

function isModuleKey(value: string): value is ModuleKey {
  return (ALL_MODULE_KEYS as readonly string[]).includes(value);
}

function displayNames(keys: readonly string[]): string {
  const names = new Map<string, string>(MODULES.map((module) => [module.key, module.name]));
  return keys.map((key) => names.get(key) ?? key).join(', ');
}

export async function listCompanyModules(companyId: string): Promise<Array<{ moduleKey: string; isEnabled: boolean; accessMode: string; isCore: boolean; name: string }>> {
  const rows = await prisma.companyModule.findMany({
    where: { companyId },
    select: {
      isEnabled: true,
      accessMode: true,
      module: { select: { key: true, name: true, isCore: true } },
    },
    orderBy: { module: { sortOrder: 'asc' } },
  });
  return rows.map((row) => ({
    moduleKey: row.module.key,
    isEnabled: row.isEnabled,
    accessMode: row.accessMode,
    isCore: row.module.isCore,
    name: row.module.name,
  }));
}

/**
 * Changes a company's module entitlement with dependency and core checks (SRS 7.2/7.3).
 * Authorization is re-evaluated here at execution time, not only in the route guard.
 */
export async function changeEntitlement(
  service: ServiceContext,
  companyId: string,
  moduleKeyInput: string,
  accessMode: 'FULL' | 'READ_ONLY' | 'DISABLED',
  reason: string,
): Promise<ServiceResult<{ moduleKey: string; accessMode: string }>> {
  const decision = authorize(service.context, {
    moduleKey: 'company',
    resourceKey: 'settings',
    action: 'MANAGE_SETTINGS',
    platform: true,
  });
  if (!decision.ok) return { ok: false, code: 'PERMISSION_DENIED', message: decision.error.message };
  if (!isModuleKey(moduleKeyInput)) return { ok: false, code: 'INVALID', message: 'Unknown module key' };

  const company = await prisma.company.findUnique({ where: { id: companyId }, select: { id: true } });
  if (!company) return { ok: false, code: 'INVALID', message: 'Company not found' };
  if (isCoreModule(moduleKeyInput) && accessMode !== 'FULL') {
    return { ok: false, code: 'INVALID', message: 'Core modules cannot be disabled or restricted' };
  }

  const rows = await prisma.companyModule.findMany({
    where: { companyId },
    select: { module: { select: { key: true } }, isEnabled: true },
  });
  const enabledKeys = new Set<ModuleKey>(
    rows.filter((row) => row.isEnabled).map((row) => row.module.key as ModuleKey),
  );
  if (accessMode === 'DISABLED') {
    const dependents = MODULE_DEPENDENCIES
      .filter(([, dependsOn]) => dependsOn === moduleKeyInput)
      .map(([module]) => module)
      .filter((module) => enabledKeys.has(module));
    if (dependents.length > 0) {
      return {
        ok: false,
        code: 'INVALID',
        message: `Disable dependent modules first: ${displayNames(dependents)}`,
      };
    }
  } else {
    const missing = missingDependencies(moduleKeyInput, enabledKeys);
    if (missing.length > 0) {
      return {
        ok: false,
        code: 'INVALID',
        message: `Enable required modules first: ${displayNames(missing)}`,
      };
    }
  }

  const moduleRow = await prisma.module.findUnique({ where: { key: moduleKeyInput }, select: { id: true } });
  if (!moduleRow) return { ok: false, code: 'INVALID', message: 'Module catalog is not seeded' };

  const isEnabled = accessMode !== 'DISABLED';
  await prisma.companyModule.upsert({
    where: { companyId_moduleId: { companyId, moduleId: moduleRow.id } },
    create: {
      companyId,
      moduleId: moduleRow.id,
      isEnabled,
      accessMode,
      enabledAt: isEnabled ? new Date() : null,
      disabledAt: isEnabled ? null : new Date(),
      changedBy: service.actorUserId,
      reason,
    },
    update: {
      isEnabled,
      accessMode,
      enabledAt: isEnabled ? new Date() : null,
      disabledAt: isEnabled ? null : new Date(),
      changedBy: service.actorUserId,
      reason,
    },
  });

  await recordAudit({
    companyId,
    actorUserId: service.actorUserId,
    action: 'MODULE_ENTITLEMENT_CHANGED',
    resourceType: 'company_module',
    resourceId: moduleRow.id,
    result: 'SUCCESS',
    reason,
    requestId: service.requestId,
    ipAddress: service.ipAddress,
    userAgent: service.userAgent,
    metadata: { moduleKey: moduleKeyInput, accessMode, isEnabled },
  });

  return { ok: true, value: { moduleKey: moduleKeyInput, accessMode } };
}
