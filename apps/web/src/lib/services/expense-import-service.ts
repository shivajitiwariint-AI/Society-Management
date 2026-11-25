import { authorize } from '@society/authorization';
import { formatMoney, MAINTENANCE_EXPENSE_CATEGORIES, newId, parseMoney } from '@society/shared';
import { prisma } from '@society/database';
import type { ServiceContext, ServiceResult } from './company-service';
import type { ExpenseImportSource } from '@/lib/expenses/import-types';

export interface ExpenseImportRow {
  month: string;
  category: string;
  vendorPayee?: string | null;
  voucherRef?: string | null;
  amount: string;
  remarks?: string | null;
}

export interface ExpenseImportResult {
  received: number;
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{ row: number; message: string }>;
  total: string;
}

interface NormalizedRow extends ExpenseImportRow {
  normalizedAmount: string;
  sourceKey: string;
}

function monthDate(month: string): Date | null {
  const match = /^(\d{4})-(\d{2})$/.exec(month.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const monthNumber = Number(match[2]);
  if (monthNumber < 1 || monthNumber > 12) return null;
  return new Date(Date.UTC(year, monthNumber - 1, 1));
}

function normalize(row: ExpenseImportRow): { value?: NormalizedRow; error?: string } {
  const month = monthDate(row.month);
  if (!month) return { error: `Invalid month "${row.month}" (expected YYYY-MM)` };

  if (!MAINTENANCE_EXPENSE_CATEGORIES.includes(row.category as (typeof MAINTENANCE_EXPENSE_CATEGORIES)[number])) {
    return { error: `Unknown category "${row.category}"` };
  }

  let normalizedAmount: string;
  try {
    normalizedAmount = formatMoney(parseMoney(String(row.amount).replace(/,/g, '')));
  } catch {
    return { error: `Invalid amount "${row.amount}"` };
  }

  const voucherRef = row.voucherRef?.trim() || null;
  const vendorPayee = row.vendorPayee?.trim() || null;
  const monthKey = month.toISOString().slice(0, 7);
  const sourceKey = voucherRef || `${monthKey}|${row.category}|${vendorPayee ?? ''}`;

  return {
    value: {
      ...row,
      month: monthKey,
      category: row.category,
      vendorPayee,
      voucherRef,
      amount: normalizedAmount,
      remarks: row.remarks?.trim() || null,
      normalizedAmount,
      sourceKey,
    },
  };
}

/** Bulk upserts parsed expense rows with per-row validation and an audit entry. */
export async function importExpenses(
  service: ServiceContext,
  companyId: string,
  societyId: string,
  rows: readonly ExpenseImportRow[],
  source: ExpenseImportSource,
): Promise<ServiceResult<ExpenseImportResult>> {
  const allowed = authorize(service.context, {
    moduleKey: 'finance-billing',
    resourceKey: 'maintenance-expense',
    action: 'CREATE',
    companyId,
    societyId,
  }).ok;
  if (!allowed) {
    return { ok: false, code: 'PERMISSION_DENIED', message: 'The required permission is not granted within the current data scope' };
  }

  const society = await prisma.society.findFirst({ where: { id: societyId, companyId }, select: { id: true } });
  if (!society) return { ok: false, code: 'NOT_FOUND', message: 'Society not found in the active company' };

  const normalized: NormalizedRow[] = [];
  const errors: ExpenseImportResult['errors'] = [];
  rows.forEach((row, index) => {
    const result = normalize(row);
    if (result.error) errors.push({ row: index + 1, message: result.error });
    else if (result.value) normalized.push(result.value);
  });

  let created = 0;
  let updated = 0;
  let totalMinor = 0n;

  for (let offset = 0; offset < normalized.length; offset += 200) {
    const batch = normalized.slice(offset, offset + 200);
    const keys = batch.map((row) => row.sourceKey);
    const existing = await prisma.maintenanceExpense.findMany({
      where: { companyId, societyId, sourceKey: { in: keys } },
      select: { sourceKey: true },
    });
    const existingKeys = new Set(existing.map((row) => row.sourceKey));

    await prisma.$transaction(
      batch.map((row) => {
        if (existingKeys.has(row.sourceKey)) updated += 1;
        else created += 1;
        totalMinor += parseMoney(row.normalizedAmount);
        return prisma.maintenanceExpense.upsert({
          where: {
            companyId_societyId_sourceKey: { companyId, societyId, sourceKey: row.sourceKey },
          },
          create: {
            id: newId(),
            companyId,
            societyId,
            month: monthDate(row.month)!,
            category: row.category,
            vendorPayee: row.vendorPayee,
            voucherRef: row.voucherRef,
            amount: row.normalizedAmount,
            remarks: row.remarks,
            source,
            sourceKey: row.sourceKey,
            createdBy: service.actorUserId,
            approvalStatus: 'APPROVED',
          },
          update: {
            month: monthDate(row.month)!,
            category: row.category,
            vendorPayee: row.vendorPayee,
            voucherRef: row.voucherRef,
            amount: row.normalizedAmount,
            remarks: row.remarks,
            source,
          },
        });
      }),
    );
  }

  await prisma.expenseImportBatch.create({
    data: {
      id: newId(),
      companyId,
      societyId,
      fileName: `${source}-import`,
      rowCount: rows.length,
      errorCount: errors.length,
      importedBy: service.actorUserId,
      summary: { received: rows.length, created, updated, skipped: errors.length } as never,
    },
  });

  await prisma.auditLog.create({
    data: {
      id: newId(),
      companyId,
      societyId,
      actorUserId: service.actorUserId,
      action: 'MAINTENANCE_EXPENSES_IMPORTED',
      resourceType: 'maintenance-expense',
      resourceId: societyId,
      result: 'SUCCESS',
      reason: `Imported ${normalized.length} expense rows from ${source} (${created} new, ${updated} updated, ${errors.length} skipped)`,
      requestId: service.requestId,
      ipAddress: service.ipAddress ?? null,
      userAgent: service.userAgent ?? null,
      metadata: { source, received: rows.length, created, updated, skipped: errors.length },
    },
  });

  return {
    ok: true,
    value: {
      received: rows.length,
      created,
      updated,
      skipped: errors.length,
      errors: errors.slice(0, 50),
      total: formatMoney(totalMinor),
    },
  };
}
