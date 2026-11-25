import { authorize } from '@society/authorization';
import { formatMoney, MAINTENANCE_EXPENSE_CATEGORIES, newId, parseMoney } from '@society/shared';
import { prisma } from '@society/database';
import type {
  CreateMaintenanceExpenseInput,
  MaintenanceExpenseQuery,
  UpdateMaintenanceExpenseInput,
} from '@society/validation';
import type { ServiceContext, ServiceResult } from './company-service';

type ExpenseAction = 'CREATE' | 'READ' | 'UPDATE' | 'DELETE';

function permitted(service: ServiceContext, companyId: string, societyId: string, action: ExpenseAction): boolean {
  return authorize(service.context, {
    moduleKey: 'finance-billing',
    resourceKey: 'maintenance-expense',
    action,
    companyId,
    societyId,
  }).ok;
}

function denied<T>(): ServiceResult<T> {
  return { ok: false, code: 'PERMISSION_DENIED', message: 'The required permission is not granted within the current data scope' };
}

function monthDate(month: string): Date {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Date(Date.UTC(year!, monthNumber! - 1, 1));
}

function monthKey(date: Date): string {
  return date.toISOString().slice(0, 7);
}

function financialYear(month: string): string {
  const [year, monthNumber] = month.split('-').map(Number);
  const start = monthNumber! >= 4 ? year! : year! - 1;
  return `${start}-${String(start + 1).slice(-2)}`;
}

export interface ExpenseView {
  id: string;
  month: string;
  category: string;
  vendorPayee: string | null;
  vendorRecordId: string | null;
  voucherRef: string | null;
  amount: string;
  remarks: string | null;
  source: string;
  attachmentCount: number;
  createdAt: string;
  approvalStatus: string;
  paymentStatus: string;
  reconciliationStatus: string;
  paidAmount: string;
  createdBy: string | null;
}

interface ExpenseSummary {
  total: string;
  averageMonthly: string;
  monthCount: number;
  categoryCount: number;
  byCategory: Array<{ category: string; total: string }>;
  byVendor: Array<{ vendor: string; total: string }>;
  monthly: Array<{ month: string; total: string; categories: Record<string, string> }>;
  yearly: Array<{ year: string; total: string; categories: Record<string, string> }>;
  pendingApprovalAmount: string;
  rejectedAmount: string;
  paidAmount: string;
  unpaidAmount: string;
  partiallyPaidAmount: string;
  unreconciledAmount: string;
  actualTotal: string;
  sampleTotal: string;
}

export interface ExpenseListView {
  items: ExpenseView[];
  total: number;
  page: number;
  pageSize: number;
  summary: ExpenseSummary;
}

function toView(row: {
  id: string;
  month: Date;
  category: string;
  vendorPayee: string | null;
  vendorRecordId: string | null;
  voucherRef: string | null;
  amount: { toString(): string };
  remarks: string | null;
  source: string;
  createdAt: Date;
  approvalStatus?: string | null;
  paymentStatus?: string | null;
  reconciliationStatus?: string | null;
  paidAmount?: { toString(): string } | null;
  createdBy?: string | null;
  _count?: { attachments: number };
}): ExpenseView {
  return {
    id: row.id,
    month: monthKey(row.month),
    category: row.category,
    vendorPayee: row.vendorPayee,
    vendorRecordId: row.vendorRecordId,
    voucherRef: row.voucherRef,
    amount: row.amount.toString(),
    remarks: row.remarks,
    source: row.source,
    attachmentCount: row._count?.attachments ?? 0,
    createdAt: row.createdAt.toISOString(),
    approvalStatus: row.approvalStatus ?? 'DRAFT',
    paymentStatus: row.paymentStatus ?? 'UNPAID',
    reconciliationStatus: row.reconciliationStatus ?? 'NOT_RECONCILED',
    paidAmount: row.paidAmount?.toString() ?? '0.00',
    createdBy: row.createdBy ?? null,
  };
}

type SummaryRow = {
  month: Date;
  category: string;
  amount: { toString(): string };
  vendorPayee?: string | null;
  approvalStatus?: string | null;
  paymentStatus?: string | null;
  reconciliationStatus?: string | null;
  source?: string | null;
};

function buildSummary(rows: ReadonlyArray<SummaryRow>): ExpenseSummary {
  const categoryTotals = new Map<string, bigint>();
  const vendorTotals = new Map<string, bigint>();
  const monthTotals = new Map<string, { total: bigint; categories: Map<string, bigint> }>();
  const yearTotals = new Map<string, { total: bigint; categories: Map<string, bigint> }>();
  let grandTotal = 0n;
  let pendingApproval = 0n;
  let rejected = 0n;
  let paid = 0n;
  let unpaid = 0n;
  let partiallyPaid = 0n;
  let unreconciled = 0n;
  let actual = 0n;
  let sample = 0n;

  for (const row of rows) {
    const amount = parseMoney(row.amount.toString());
    const month = monthKey(row.month);
    const year = financialYear(month);
    grandTotal += amount;
    categoryTotals.set(row.category, (categoryTotals.get(row.category) ?? 0n) + amount);
    vendorTotals.set(row.vendorPayee ?? 'Unknown', (vendorTotals.get(row.vendorPayee ?? 'Unknown') ?? 0n) + amount);

    if (row.approvalStatus === 'SUBMITTED') pendingApproval += amount;
    if (row.approvalStatus === 'REJECTED') rejected += amount;
    if (row.paymentStatus === 'PAID') paid += amount;
    if (row.paymentStatus === 'UNPAID') unpaid += amount;
    if (row.paymentStatus === 'PARTIALLY_PAID') partiallyPaid += amount;
    if (row.reconciliationStatus !== 'RECONCILED') unreconciled += amount;
    if (row.source === 'SAMPLE') sample += amount;
    else actual += amount;

    const monthly = monthTotals.get(month) ?? { total: 0n, categories: new Map<string, bigint>() };
    monthly.total += amount;
    monthly.categories.set(row.category, (monthly.categories.get(row.category) ?? 0n) + amount);
    monthTotals.set(month, monthly);

    const yearly = yearTotals.get(year) ?? { total: 0n, categories: new Map<string, bigint>() };
    yearly.total += amount;
    yearly.categories.set(row.category, (yearly.categories.get(row.category) ?? 0n) + amount);
    yearTotals.set(year, yearly);
  }

  const stringifyCategories = (categories: Map<string, bigint>): Record<string, string> =>
    Object.fromEntries([...categories].map(([category, total]) => [category, formatMoney(total)]));

  return {
    total: formatMoney(grandTotal),
    averageMonthly:
      monthTotals.size === 0
        ? '0.00'
        : formatMoney((grandTotal + BigInt(monthTotals.size) / 2n) / BigInt(monthTotals.size)),
    monthCount: monthTotals.size,
    categoryCount: categoryTotals.size,
    byCategory: MAINTENANCE_EXPENSE_CATEGORIES
      .filter((category) => categoryTotals.has(category))
      .map((category) => ({ category, total: formatMoney(categoryTotals.get(category)!) })),
    byVendor: [...vendorTotals.entries()]
      .sort(([, a], [, b]) => (a > b ? -1 : a < b ? 1 : 0))
      .map(([vendor, total]) => ({ vendor, total: formatMoney(total) })),
    pendingApprovalAmount: formatMoney(pendingApproval),
    rejectedAmount: formatMoney(rejected),
    paidAmount: formatMoney(paid),
    unpaidAmount: formatMoney(unpaid),
    partiallyPaidAmount: formatMoney(partiallyPaid),
    unreconciledAmount: formatMoney(unreconciled),
    actualTotal: formatMoney(actual),
    sampleTotal: formatMoney(sample),
    monthly: [...monthTotals.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, value]) => ({ month, total: formatMoney(value.total), categories: stringifyCategories(value.categories) })),
    yearly: [...yearTotals.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([year, value]) => ({ year, total: formatMoney(value.total), categories: stringifyCategories(value.categories) })),
  };
}

async function assertSociety(companyId: string, societyId: string): Promise<boolean> {
  const society = await prisma.society.findFirst({ where: { id: societyId, companyId }, select: { id: true } });
  return society !== null;
}

export async function listExpenses(
  service: ServiceContext,
  companyId: string,
  societyId: string,
  query: MaintenanceExpenseQuery,
): Promise<ServiceResult<ExpenseListView>> {
  if (!permitted(service, companyId, societyId, 'READ')) return denied();
  if (!(await assertSociety(companyId, societyId))) {
    return { ok: false, code: 'NOT_FOUND', message: 'Society not found in the active company' };
  }

  const where = {
    companyId,
    societyId,
    ...(query.monthFrom ? { month: { gte: monthDate(query.monthFrom) } } : {}),
    ...(query.monthTo ? { month: { ...(query.monthFrom ? { gte: monthDate(query.monthFrom) } : {}), lte: monthDate(query.monthTo) } } : {}),
    ...(query.category ? { category: query.category } : {}),
    ...(query.source ? { source: query.source } : {}),
    ...(query.search
      ? {
          OR: [
            { vendorPayee: { contains: query.search } },
            { voucherRef: { contains: query.search } },
            { remarks: { contains: query.search } },
          ],
        }
      : {}),
  };

  const rows = await prisma.maintenanceExpense.findMany({
    where,
    orderBy: [{ month: 'desc' }, { category: 'asc' }, { createdAt: 'desc' }],
    include: { _count: { select: { attachments: true } } },
  });
  const offset = (query.page - 1) * query.pageSize;

  return {
    ok: true,
    value: {
      items: rows.slice(offset, offset + query.pageSize).map(toView),
      total: rows.length,
      page: query.page,
      pageSize: query.pageSize,
      summary: buildSummary(rows),
    },
  };
}

export async function createExpense(
  service: ServiceContext,
  companyId: string,
  societyId: string,
  input: CreateMaintenanceExpenseInput,
): Promise<ServiceResult<{ id: string }>> {
  if (!permitted(service, companyId, societyId, 'CREATE')) return denied();
  if (!(await assertSociety(companyId, societyId))) {
    return { ok: false, code: 'NOT_FOUND', message: 'Society not found in the active company' };
  }

  const id = newId();
  await prisma.$transaction(async (tx) => {
    await tx.maintenanceExpense.create({
      data: {
        id,
        companyId,
        societyId,
        month: monthDate(input.month),
        category: input.category,
        vendorPayee: input.vendorPayee || null,
        vendorRecordId: input.vendorRecordId || null,
        voucherRef: input.voucherRef || null,
        amount: input.amount.toFixed(2),
        remarks: input.remarks || null,
        source: 'MANUAL',
        createdBy: service.actorUserId,
        approvalStatus: 'DRAFT',
      },
    });
    await tx.auditLog.create({
      data: {
        id: newId(),
        companyId,
        societyId,
        actorUserId: service.actorUserId,
        action: 'MAINTENANCE_EXPENSE_CREATED',
        resourceType: 'maintenance-expense',
        resourceId: id,
        result: 'SUCCESS',
        reason: `${input.category} for ${input.month} recorded`,
        requestId: service.requestId,
        ipAddress: service.ipAddress ?? null,
        userAgent: service.userAgent ?? null,
      },
    });
  });

  return { ok: true, value: { id } };
}

export async function updateExpense(
  service: ServiceContext,
  companyId: string,
  societyId: string,
  expenseId: string,
  input: UpdateMaintenanceExpenseInput,
): Promise<ServiceResult<{ id: string }>> {
  if (!permitted(service, companyId, societyId, 'UPDATE')) return denied();

  const existing = await prisma.maintenanceExpense.findFirst({
    where: { id: expenseId, companyId, societyId },
    select: { id: true },
  });
  if (!existing) return { ok: false, code: 'NOT_FOUND', message: 'Expense not found in the active society' };

  await prisma.$transaction(async (tx) => {
    await tx.maintenanceExpense.update({
      where: { id: expenseId },
      data: {
        ...(input.month !== undefined ? { month: monthDate(input.month) } : {}),
        ...(input.category !== undefined ? { category: input.category } : {}),
        ...(input.vendorPayee !== undefined ? { vendorPayee: input.vendorPayee || null } : {}),
        ...(input.vendorRecordId !== undefined ? { vendorRecordId: input.vendorRecordId || null } : {}),
        ...(input.voucherRef !== undefined ? { voucherRef: input.voucherRef || null } : {}),
        ...(input.amount !== undefined ? { amount: input.amount.toFixed(2) } : {}),
        ...(input.remarks !== undefined ? { remarks: input.remarks || null } : {}),
      },
    });
    await tx.auditLog.create({
      data: {
        id: newId(),
        companyId,
        societyId,
        actorUserId: service.actorUserId,
        action: 'MAINTENANCE_EXPENSE_UPDATED',
        resourceType: 'maintenance-expense',
        resourceId: expenseId,
        result: 'SUCCESS',
        reason: 'Maintenance expense record updated',
        requestId: service.requestId,
        ipAddress: service.ipAddress ?? null,
        userAgent: service.userAgent ?? null,
      },
    });
  });

  return { ok: true, value: { id: expenseId } };
}

export async function deleteExpense(
  service: ServiceContext,
  companyId: string,
  societyId: string,
  expenseId: string,
): Promise<ServiceResult<{ id: string }>> {
  if (!permitted(service, companyId, societyId, 'DELETE')) return denied();

  const existing = await prisma.maintenanceExpense.findFirst({
    where: { id: expenseId, companyId, societyId },
    select: { id: true },
  });
  if (!existing) return { ok: false, code: 'NOT_FOUND', message: 'Expense not found in the active society' };

  await prisma.$transaction(async (tx) => {
    await tx.maintenanceExpense.delete({ where: { id: expenseId } });
    await tx.auditLog.create({
      data: {
        id: newId(),
        companyId,
        societyId,
        actorUserId: service.actorUserId,
        action: 'MAINTENANCE_EXPENSE_DELETED',
        resourceType: 'maintenance-expense',
        resourceId: expenseId,
        result: 'SUCCESS',
        reason: 'Maintenance expense record deleted',
        requestId: service.requestId,
        ipAddress: service.ipAddress ?? null,
        userAgent: service.userAgent ?? null,
      },
    });
  });

  return { ok: true, value: { id: expenseId } };
}
