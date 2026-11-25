import { config as loadDotenv } from 'dotenv';
import { randomUUID } from 'node:crypto';
import { MODULES } from '@society/shared';
import { createPrismaClient } from './packages/database/src/client';

loadDotenv({ path: './.env' });

const prisma = createPrismaClient();

const COMPANY_ID = '32338730-660e-4b03-b8e6-c2935cb82cc4';
const SOCIETY_ID = '335e7da8-935f-410d-b071-f10da74db7fe';
const COMPANY_CODE = 'playground-6246';
const SOCIETY_NAME = 'Oasis Venetia Heights';

async function main(): Promise<void> {
  const adminEmail = process.env.SEED_SUPERADMIN_EMAIL ?? 'superadmin@example.com';
  const admin = await prisma.user.findUniqueOrThrow({ where: { email: adminEmail.toLowerCase() } });

  await prisma.company.upsert({
    where: { id: COMPANY_ID },
    create: {
      id: COMPANY_ID,
      name: 'Playground Housing',
      code: COMPANY_CODE,
      countryCode: 'IN',
      currencyCode: 'INR',
      timezone: 'Asia/Kolkata',
      status: 'ACTIVE',
    },
    update: { name: 'Playground Housing', code: COMPANY_CODE, status: 'ACTIVE' },
  });

  await prisma.society.upsert({
    where: { id: SOCIETY_ID },
    create: {
      id: SOCIETY_ID,
      companyId: COMPANY_ID,
      name: SOCIETY_NAME,
      countryCode: 'IN',
      timezone: 'Asia/Kolkata',
    },
    update: { name: SOCIETY_NAME, companyId: COMPANY_ID },
  });

  const moduleRows = await prisma.module.findMany({ select: { id: true, key: true } });
  const moduleIdByKey = new Map(moduleRows.map((row) => [row.key, row.id]));
  await prisma.companyModule.createMany({
    data: MODULES.map((module) => ({
      id: randomUUID(),
      companyId: COMPANY_ID,
      moduleId: moduleIdByKey.get(module.key)!,
      isEnabled: true,
      accessMode: 'FULL' as const,
      enabledAt: new Date(),
      changedBy: admin.id,
      reason: 'Playground restore with full module access',
    })),
    skipDuplicates: true,
  });
  await prisma.companyModule.updateMany({
    where: { companyId: COMPANY_ID },
    data: { isEnabled: true, accessMode: 'FULL', enabledAt: new Date(), reason: 'Playground restore with full module access' },
  });

  const membership = await prisma.userMembership.findFirst({
    where: { userId: admin.id, companyId: COMPANY_ID, societyId: null },
    select: { id: true },
  });
  if (!membership) {
    await prisma.userMembership.create({
      data: { id: randomUUID(), userId: admin.id, companyId: COMPANY_ID, societyId: null, status: 'ACTIVE' },
    });
  } else {
    await prisma.userMembership.update({ where: { id: membership.id }, data: { status: 'ACTIVE' } });
  }

  const adminRole = await prisma.role.findUniqueOrThrow({ where: { scopeKey: 'COMPANY:::company-admin' } });
  const assignment = await prisma.userRole.findFirst({
    where: { userId: admin.id, roleId: adminRole.id, companyId: COMPANY_ID, societyId: null },
    select: { id: true },
  });
  if (!assignment) {
    await prisma.userRole.create({
      data: {
        id: randomUUID(),
        userId: admin.id,
        roleId: adminRole.id,
        companyId: COMPANY_ID,
        societyId: null,
        assignedBy: admin.id,
      },
    });
  }

  console.log(`Restored ${COMPANY_CODE} with ${moduleRows.length} enabled modules and ${SOCIETY_NAME}.`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
