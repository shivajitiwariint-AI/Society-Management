import { config as loadDotenv } from 'dotenv';
import { resolve } from 'node:path';
import { hash, type Algorithm } from '@node-rs/argon2';
import {
  MODULES,
  MODULE_DEPENDENCIES,
  SYSTEM_ROLES,
  getSystemRoleDefinition,
  parsePermissionKey,
  type DataScope,
} from '@society/shared';
import { createPrismaClient } from '../src/client';

loadDotenv({ path: resolve(process.cwd(), '../../.env') });

const prisma = createPrismaClient();

const dataScopeForRole: Record<string, DataScope> = {
  resident: 'OWN',
  'maintenance-staff': 'ASSIGNED',
  vendor: 'ASSIGNED',
  'platform-super-admin': 'PLATFORM',
  'platform-support': 'PLATFORM',
};

function scopeKey(roleKey: string): string {
  const role = getSystemRoleDefinition(roleKey);
  if (!role) throw new Error(`Unknown system role ${roleKey}`);
  return `${role.scope}:::${roleKey}`;
}

async function main(): Promise<void> {
  for (const moduleDefinition of MODULES) {
    await prisma.module.upsert({
      where: { key: moduleDefinition.key },
      create: {
        key: moduleDefinition.key,
        name: moduleDefinition.name,
        description: moduleDefinition.description,
        isCore: moduleDefinition.isCore,
        isActive: true,
        sortOrder: moduleDefinition.sortOrder,
      },
      update: {
        name: moduleDefinition.name,
        description: moduleDefinition.description,
        isCore: moduleDefinition.isCore,
        sortOrder: moduleDefinition.sortOrder,
      },
    });
  }

  const moduleRows = await prisma.module.findMany({ select: { id: true, key: true } });
  const moduleIdByKey = new Map(moduleRows.map((row) => [row.key, row.id]));

  for (const [key, dependsOn] of MODULE_DEPENDENCIES) {
    const moduleId = moduleIdByKey.get(key);
    const dependencyId = moduleIdByKey.get(dependsOn);
    if (!moduleId || !dependencyId) throw new Error(`Missing module for dependency ${key} -> ${dependsOn}`);
    await prisma.moduleDependency.upsert({
      where: { moduleId_dependsOnModuleId: { moduleId, dependsOnModuleId: dependencyId } },
      create: { moduleId, dependsOnModuleId: dependencyId },
      update: {},
    });
  }

  const permissionKeys = [...new Set(SYSTEM_ROLES.flatMap((role) => role.permissions))];
  for (const key of permissionKeys) {
    const parsed = parsePermissionKey(key);
    if (!parsed) throw new Error(`Invalid permission key: ${key}`);
    await prisma.permission.upsert({
      where: { key },
      create: {
        key,
        moduleKey: parsed.moduleKey,
        resourceKey: parsed.resourceKey,
        action: parsed.action,
      },
      update: {},
    });
  }

  const permissionRows = await prisma.permission.findMany({ select: { id: true, key: true } });
  const permissionIdByKey = new Map(permissionRows.map((row) => [row.key, row.id]));

  for (const role of SYSTEM_ROLES) {
    const savedRole = await prisma.role.upsert({
      where: { scopeKey: scopeKey(role.key) },
      create: {
        scopeType: role.scope,
        scopeKey: scopeKey(role.key),
        key: role.key,
        name: role.name,
        description: role.description,
        isSystemRole: true,
      },
      update: {
        name: role.name,
        description: role.description,
        isSystemRole: true,
      },
    });

    const dataScope = dataScopeForRole[role.key] ?? (role.scope.toLowerCase().toUpperCase() as DataScope);
    for (const permissionKey of role.permissions) {
      const permissionId = permissionIdByKey.get(permissionKey);
      if (!permissionId) throw new Error(`Missing permission ${permissionKey}`);
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: savedRole.id, permissionId } },
        create: { roleId: savedRole.id, permissionId, dataScope },
        update: { dataScope },
      });
    }
  }

  const superAdminEmail = process.env.SEED_SUPERADMIN_EMAIL ?? 'superadmin@example.com';
  const superAdminPassword = process.env.SEED_SUPERADMIN_PASSWORD;
  if (!superAdminPassword || superAdminPassword.startsWith('CHANGE_ME')) {
    throw new Error('Set SEED_SUPERADMIN_PASSWORD in .env before running the seed');
  }
  const passwordHash = await hash(superAdminPassword, {
    algorithm: 2 as Algorithm, // Argon2id (ambient const enum cannot be imported with verbatimModuleSyntax)
    memoryCost: 19456,
    timeCost: 2,
    outputLen: 32,
    parallelism: 1,
  });

  const admin = await prisma.user.upsert({
    where: { email: superAdminEmail.toLowerCase() },
    create: {
      email: superAdminEmail.toLowerCase(),
      name: process.env.SEED_SUPERADMIN_NAME ?? 'Platform Super Admin',
      passwordHash,
    },
    update: { passwordHash },
  });

  const adminRole = await prisma.role.findUniqueOrThrow({
    where: { scopeKey: scopeKey('platform-super-admin') },
  });
  const existingAssignment = await prisma.userRole.findFirst({
    where: { userId: admin.id, roleId: adminRole.id, companyId: null, societyId: null },
    select: { id: true },
  });
  if (!existingAssignment) {
    await prisma.userRole.create({ data: { userId: admin.id, roleId: adminRole.id } });
  }

  await prisma.auditLog.create({
    data: {
      action: 'SYSTEM_SEED',
      resourceType: 'catalog',
      result: 'SUCCESS',
      reason: 'Idempotent baseline seed of modules, permissions, roles and super admin',
      requestId: `seed-${Date.now()}`,
    },
  });

  console.log(`Seed complete: ${MODULES.length} modules, ${permissionKeys.length} permissions, ${SYSTEM_ROLES.length} system roles.`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
