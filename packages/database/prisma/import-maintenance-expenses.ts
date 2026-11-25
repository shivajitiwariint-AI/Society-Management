import { config as loadDotenv } from 'dotenv';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { MAINTENANCE_EXPENSE_CATEGORIES } from '@society/shared';
import { newId } from '@society/shared';
import { createPrismaClient, recordAudit } from '../src';

loadDotenv({ path: resolve(process.cwd(), '../../.env') });

const prisma = createPrismaClient();

interface SampleRow {
  month: string;
  category: string;
  vendorPayee: string;
  voucherRef: string;
  amount: string;
  remarks: string;
}

async function main(): Promise<void> {
  const companyCode = process.env.IMPORT_COMPANY_CODE ?? 'playground-6246';
  const societyName = process.env.IMPORT_SOCIETY_NAME ?? 'Oasis Venetia Heights';

  const company = await prisma.company.findUnique({ where: { code: companyCode }, select: { id: true } });
  if (!company) throw new Error(`Company ${companyCode} not found. Set IMPORT_COMPANY_CODE.`);

  let society = await prisma.society.findFirst({
    where: { companyId: company.id, name: societyName },
    select: { id: true },
  });
  if (!society) {
    society = await prisma.society.create({
      data: {
        id: newId(),
        companyId: company.id,
        name: societyName,
        countryCode: 'IN',
        timezone: 'Asia/Kolkata',
      },
      select: { id: true },
    });
  }

  const raw = await readFile(resolve(process.cwd(), 'prisma/seed-data/maintenance-expenses.json'), 'utf8');
  const rows = JSON.parse(raw) as SampleRow[];
  const validCategories = new Set<string>(MAINTENANCE_EXPENSE_CATEGORIES);
  let total = 0;

  for (const row of rows) {
    if (!validCategories.has(row.category)) throw new Error(`Unexpected expense category: ${row.category}`);
    const sourceKey = row.voucherRef || `${row.month}|${row.category}|${row.vendorPayee}`;
    await prisma.maintenanceExpense.upsert({
      where: { companyId_societyId_sourceKey: { companyId: company.id, societyId: society.id, sourceKey } },
      create: {
        id: newId(),
        companyId: company.id,
        societyId: society.id,
        month: new Date(`${row.month}T00:00:00.000Z`),
        category: row.category,
        vendorPayee: row.vendorPayee || null,
        voucherRef: row.voucherRef || null,
        amount: row.amount,
        remarks: row.remarks || 'Illustrative only',
        source: 'SAMPLE',
        sourceKey,
      },
      update: {
        month: new Date(`${row.month}T00:00:00.000Z`),
        category: row.category,
        vendorPayee: row.vendorPayee || null,
        voucherRef: row.voucherRef || null,
        amount: row.amount,
        remarks: row.remarks || 'Illustrative only',
        source: 'SAMPLE',
      },
    });
    total += Number(row.amount);
  }

  await recordAudit({
    companyId: company.id,
    societyId: society.id,
    action: 'MAINTENANCE_EXPENSES_IMPORTED',
    resourceType: 'maintenance-expense',
    resourceId: society.id,
    result: 'SUCCESS',
    reason: `Imported ${rows.length} sample maintenance expense rows`,
    requestId: `import-expenses-${Date.now()}`,
    metadata: { rows: rows.length, total, societyName, workbook: 'OVH_Monthly_Maintenance_Expenses_Apr2022_Nov2026_SAMPLE.xlsx' },
  });

  console.log(`Imported ${rows.length} sample expense rows into ${societyName} (total ${total.toFixed(2)}).`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
