import { authorize } from '@society/authorization';
import { newId } from '@society/shared';
import { prisma } from '@society/database';
import type { ServiceContext, ServiceResult } from './company-service';

const MODULE = 'finance-billing';
const RESOURCE = 'maintenance-expense';

function permitted(service: ServiceContext, action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'REJECT' | 'REFUND', companyId: string, societyId: string): boolean {
  return authorize(service.context, {
    moduleKey: MODULE, resourceKey: RESOURCE, action, companyId, societyId,
  }).ok;
}

function denied<T>(message = 'The required permission is not granted within the current data scope'): ServiceResult<T> {
  return { ok: false, code: 'PERMISSION_DENIED', message };
}

async function loadExpense(companyId: string, societyId: string, expenseId: string) {
  return prisma.maintenanceExpense.findFirst({
    where: { id: expenseId, companyId, societyId },
    select: {
      id: true, createdBy: true, approvalStatus: true, paymentStatus: true,
      amount: true, paidAmount: true, source: true,
    },
  });
}

async function recordApproval(input: {
  service: ServiceContext;
  companyId: string;
  societyId: string;
  expenseId: string;
  action: string;
  comments?: string | null;
  reason?: string | null;
}) {
  await prisma.expenseApproval.create({
    data: {
      id: newId(),
      companyId: input.companyId,
      societyId: input.societyId,
      expenseId: input.expenseId,
      action: input.action,
      actorUserId: input.service.actorUserId,
      comments: input.comments ?? null,
      reason: input.reason ?? null,
    },
  });
  await prisma.auditLog.create({
    data: {
      id: newId(),
      companyId: input.companyId,
      societyId: input.societyId,
      actorUserId: input.service.actorUserId,
      action: `EXPENSE_${input.action}`,
      resourceType: 'maintenance-expense',
      resourceId: input.expenseId,
      result: 'SUCCESS',
      reason: input.reason ?? input.comments ?? `${input.action} recorded`,
      requestId: input.service.requestId,
      ipAddress: input.service.ipAddress ?? null,
      userAgent: input.service.userAgent ?? null,
    },
  });
}

export async function submitExpense(
  service: ServiceContext, companyId: string, societyId: string, expenseId: string, comments?: string,
): Promise<ServiceResult<{ id: string; approvalStatus: string }>> {
  if (!permitted(service, 'CREATE', companyId, societyId)) return denied();
  const expense = await loadExpense(companyId, societyId, expenseId);
  if (!expense) return { ok: false, code: 'NOT_FOUND', message: 'Expense not found' };
  if (!['DRAFT', 'REJECTED'].includes(expense.approvalStatus)) {
    return { ok: false, code: 'INVALID', message: 'Only draft or rejected expenses can be submitted' };
  }
  await prisma.$transaction(async () => {
    await prisma.maintenanceExpense.update({
      where: { id: expenseId },
      data: {
        approvalStatus: 'SUBMITTED',
        submittedAt: new Date(),
        rejectionReason: null,
        createdBy: expense.createdBy ?? service.actorUserId,
      },
    });
    await recordApproval({ service, companyId, societyId, expenseId, action: 'SUBMIT', comments });
  });
  return { ok: true, value: { id: expenseId, approvalStatus: 'SUBMITTED' } };
}

export async function decideExpense(
  service: ServiceContext,
  companyId: string,
  societyId: string,
  expenseId: string,
  decision: 'APPROVE' | 'REJECT',
  input: { comments?: string; reason?: string },
): Promise<ServiceResult<{ id: string; approvalStatus: string }>> {
  const actionPermission = decision === 'APPROVE' ? 'APPROVE' : 'REJECT';
  if (!permitted(service, actionPermission, companyId, societyId)) return denied();
  const expense = await loadExpense(companyId, societyId, expenseId);
  if (!expense) return { ok: false, code: 'NOT_FOUND', message: 'Expense not found' };
  if (expense.approvalStatus !== 'SUBMITTED') {
    return { ok: false, code: 'INVALID', message: 'Only submitted expenses can be approved or rejected' };
  }
  // Separation of duties: the maker/submitter can never decide their own expense.
  if (expense.createdBy && expense.createdBy === service.actorUserId) {
    return { ok: false, code: 'SELF_APPROVAL', message: 'You cannot approve or reject your own expense' };
  }
  if (decision === 'REJECT' && !input.reason?.trim()) {
    return { ok: false, code: 'VALIDATION_ERROR', message: 'A rejection reason is required' };
  }

  const nextStatus = decision === 'APPROVE' ? 'APPROVED' : 'REJECTED';
  await prisma.$transaction(async () => {
    await prisma.maintenanceExpense.update({
      where: { id: expenseId },
      data: decision === 'APPROVE'
        ? { approvalStatus: nextStatus, approvedAt: new Date(), approvedBy: service.actorUserId, rejectionReason: null }
        : { approvalStatus: nextStatus, rejectionReason: input.reason?.trim() ?? null, approvedBy: null, approvedAt: null },
    });
    await recordApproval({
      service, companyId, societyId, expenseId, action: decision,
      comments: input.comments, reason: input.reason,
    });
  });
  return { ok: true, value: { id: expenseId, approvalStatus: nextStatus } };
}

export async function cancelExpense(
  service: ServiceContext, companyId: string, societyId: string, expenseId: string, reason: string,
): Promise<ServiceResult<{ id: string; approvalStatus: string }>> {
  if (!permitted(service, 'UPDATE', companyId, societyId)) return denied();
  const expense = await loadExpense(companyId, societyId, expenseId);
  if (!expense) return { ok: false, code: 'NOT_FOUND', message: 'Expense not found' };
  if (!['DRAFT', 'SUBMITTED', 'REJECTED'].includes(expense.approvalStatus)) {
    return { ok: false, code: 'INVALID', message: 'This expense cannot be cancelled' };
  }
  if (!reason.trim()) return { ok: false, code: 'VALIDATION_ERROR', message: 'A cancellation reason is required' };
  await prisma.$transaction(async () => {
    await prisma.maintenanceExpense.update({
      where: { id: expenseId },
      data: { approvalStatus: 'CANCELLED', rejectionReason: reason.trim() },
    });
    await recordApproval({ service, companyId, societyId, expenseId, action: 'CANCEL', reason });
  });
  return { ok: true, value: { id: expenseId, approvalStatus: 'CANCELLED' } };
}

export async function recordPayment(
  service: ServiceContext,
  companyId: string,
  societyId: string,
  expenseId: string,
  input: {
    amount: number;
    paidAt: Date;
    method: string;
    accountRef?: string;
    transactionReference?: string;
  },
): Promise<ServiceResult<{ id: string; paymentStatus: string }>> {
  if (!permitted(service, 'UPDATE', companyId, societyId)) return denied();
  const expense = await loadExpense(companyId, societyId, expenseId);
  if (!expense) return { ok: false, code: 'NOT_FOUND', message: 'Expense not found' };
  if (expense.approvalStatus !== 'APPROVED') {
    return { ok: false, code: 'INVALID', message: 'Only approved expenses can be paid' };
  }
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    return { ok: false, code: 'VALIDATION_ERROR', message: 'Payment amount must be positive' };
  }
  const outstanding = Number(expense.amount) - Number(expense.paidAmount);
  if (input.amount > outstanding + 0.005) {
    return { ok: false, code: 'VALIDATION_ERROR', message: `Payment exceeds the outstanding amount (₹${outstanding.toFixed(2)})` };
  }
  const newPaid = Number(expense.paidAmount) + input.amount;
  const paymentStatus = newPaid >= Number(expense.amount) - 0.005 ? 'PAID' : 'PARTIALLY_PAID';

  await prisma.$transaction(async () => {
    await prisma.expensePayment.create({
      data: {
        id: newId(), companyId, societyId, expenseId,
        amount: input.amount.toFixed(2),
        paidAt: input.paidAt,
        method: input.method,
        accountRef: input.accountRef ?? null,
        transactionReference: input.transactionReference ?? null,
        recordedBy: service.actorUserId,
      },
    });
    await prisma.maintenanceExpense.update({
      where: { id: expenseId },
      data: { paidAmount: newPaid.toFixed(2), paymentStatus },
    });
    await prisma.auditLog.create({
      data: {
        id: newId(), companyId, societyId, actorUserId: service.actorUserId,
        action: 'EXPENSE_PAYMENT_RECORDED', resourceType: 'expense-payment', resourceId: expenseId,
        result: 'SUCCESS', reason: `Recorded payment of ₹${input.amount.toFixed(2)}`,
        requestId: service.requestId, ipAddress: service.ipAddress ?? null, userAgent: service.userAgent ?? null,
      },
    });
  });
  return { ok: true, value: { id: expenseId, paymentStatus } };
}

export async function reversePayment(
  service: ServiceContext, companyId: string, societyId: string, paymentId: string, reason: string,
): Promise<ServiceResult<{ id: string; paymentStatus: string }>> {
  if (!permitted(service, 'REFUND', companyId, societyId)) return denied();
  if (!reason.trim()) return { ok: false, code: 'VALIDATION_ERROR', message: 'A reversal reason is required' };
  const payment = await prisma.expensePayment.findFirst({
    where: { id: paymentId, companyId, societyId, status: 'ACTIVE' },
    select: { id: true, expenseId: true, amount: true },
  });
  if (!payment) return { ok: false, code: 'NOT_FOUND', message: 'Active payment not found' };
  const expense = await loadExpense(companyId, societyId, payment.expenseId);
  if (!expense) return { ok: false, code: 'NOT_FOUND', message: 'Expense not found' };

  const newPaid = Math.max(0, Number(expense.paidAmount) - Number(payment.amount));
  const paymentStatus = newPaid <= 0.005 ? 'UNPAID' : newPaid >= Number(expense.amount) - 0.005 ? 'PAID' : 'PARTIALLY_PAID';
  await prisma.$transaction(async () => {
    await prisma.expensePayment.update({
      where: { id: paymentId },
      data: { status: 'REVERSED', reversalReason: reason.trim() },
    });
    await prisma.maintenanceExpense.update({
      where: { id: payment.expenseId },
      data: { paidAmount: newPaid.toFixed(2), paymentStatus },
    });
    await prisma.auditLog.create({
      data: {
        id: newId(), companyId, societyId, actorUserId: service.actorUserId,
        action: 'EXPENSE_PAYMENT_REVERSED', resourceType: 'expense-payment', resourceId: paymentId,
        result: 'SUCCESS', reason, requestId: service.requestId,
        ipAddress: service.ipAddress ?? null, userAgent: service.userAgent ?? null,
      },
    });
  });
  return { ok: true, value: { id: payment.expenseId, paymentStatus } };
}

const DEFAULT_CATEGORIES: Array<{ name: string; monthlyBase: string }> = [
  { name: 'Common Area Electricity', monthlyBase: '18000.00' },
  { name: 'Plumbing & Sanitary Repairs', monthlyBase: '4500.00' },
  { name: 'Lift Maintenance / AMC', monthlyBase: '12000.00' },
  { name: 'Garbage Collection', monthlyBase: '8500.00' },
  { name: 'Housekeeping', monthlyBase: '25000.00' },
  { name: 'Security Services', monthlyBase: '35000.00' },
  { name: 'Water / STP / Pump Maintenance', monthlyBase: '9000.00' },
  { name: 'DG / Generator Maintenance', monthlyBase: '6500.00' },
  { name: 'Fire Safety & Equipment', monthlyBase: '2500.00' },
  { name: 'Common Area Repairs', monthlyBase: '5000.00' },
  { name: 'Pest Control', monthlyBase: '1800.00' },
  { name: 'Miscellaneous Society Expenses', monthlyBase: '3000.00' },
];

export async function listBankTransactions(service: ServiceContext, companyId: string, societyId: string) {
  if (!permitted(service, 'READ', companyId, societyId)) return denied();
  const items = await prisma.bankTransaction.findMany({
    where: { companyId, societyId },
    orderBy: { transactionDate: 'desc' },
    take: 200,
    select: {
      id: true, transactionDate: true, description: true, reference: true,
      amount: true, accountRef: true, source: true,
    },
  });
  return { ok: true as const, value: items };
}

export async function createBankTransaction(
  service: ServiceContext,
  companyId: string,
  societyId: string,
  input: {
    transactionDate: Date;
    description?: string;
    reference?: string;
    amount: number;
    accountRef?: string;
  },
) {
  if (!permitted(service, 'UPDATE', companyId, societyId)) return denied();
  const record = await prisma.bankTransaction.create({
    data: {
      id: newId(), companyId, societyId,
      transactionDate: input.transactionDate,
      description: input.description ?? null,
      reference: input.reference ?? null,
      amount: input.amount.toFixed(2),
      accountRef: input.accountRef ?? null,
      source: 'MANUAL',
      importedBy: service.actorUserId,
    },
    select: { id: true },
  });
  await prisma.auditLog.create({
    data: {
      id: newId(), companyId, societyId, actorUserId: service.actorUserId,
      action: 'BANK_TRANSACTION_RECORDED', resourceType: 'bank-transaction', resourceId: record.id,
      result: 'SUCCESS', reason: 'Bank statement transaction recorded',
      requestId: service.requestId, ipAddress: service.ipAddress ?? null, userAgent: service.userAgent ?? null,
    },
  });
  return { ok: true as const, value: record };
}

export async function reconcilePayment(
  service: ServiceContext,
  companyId: string,
  societyId: string,
  input: { paymentId: string; bankTransactionId: string; amount: number; reason?: string },
) {
  if (!permitted(service, 'UPDATE', companyId, societyId)) return denied();
  const payment = await prisma.expensePayment.findFirst({
    where: { id: input.paymentId, companyId, societyId, status: 'ACTIVE' },
    select: { id: true, expenseId: true, amount: true },
  });
  if (!payment) return { ok: false as const, code: 'NOT_FOUND' as const, message: 'Payment not found' };
  const bank = await prisma.bankTransaction.findFirst({
    where: { id: input.bankTransactionId, companyId, societyId },
    select: { id: true },
  });
  if (!bank) return { ok: false as const, code: 'NOT_FOUND' as const, message: 'Bank transaction not found' };
  if (Math.abs(Number(payment.amount) - input.amount) > 0.005) {
    return { ok: false as const, code: 'INVALID' as const, message: 'Match amount must equal the payment amount' };
  }
  await prisma.$transaction(async () => {
    await prisma.reconciliationRecord.create({
      data: {
        id: newId(), companyId, societyId, expenseId: payment.expenseId,
        paymentId: payment.id, bankTransactionId: bank.id,
        amount: input.amount.toFixed(2), status: 'MATCHED',
        matchedBy: service.actorUserId, reason: input.reason ?? null,
      },
    });
    await prisma.maintenanceExpense.update({
      where: { id: payment.expenseId },
      data: { reconciliationStatus: 'RECONCILED' },
    });
    await prisma.auditLog.create({
      data: {
        id: newId(), companyId, societyId, actorUserId: service.actorUserId,
        action: 'EXPENSE_RECONCILED', resourceType: 'expense-payment', resourceId: payment.id,
        result: 'SUCCESS', reason: input.reason ?? 'Payment matched to bank transaction',
        requestId: service.requestId, ipAddress: service.ipAddress ?? null, userAgent: service.userAgent ?? null,
      },
    });
  });
  return { ok: true as const, value: { id: payment.id } };
}

export async function seedExpenseCategories(
  service: ServiceContext, companyId: string, societyId: string,
): Promise<ServiceResult<{ created: number }>> {
  if (!permitted(service, 'MANAGE_SETTINGS' as 'UPDATE', companyId, societyId)) return denied();
  const existing = await prisma.expenseCategory.count({ where: { companyId, societyId } });
  if (existing > 0) return { ok: true, value: { created: 0 } };
  await prisma.expenseCategory.createMany({
    data: DEFAULT_CATEGORIES.map((category) => ({
      id: newId(), companyId, societyId, name: category.name, monthlyBase: category.monthlyBase,
    })),
  });
  return { ok: true, value: { created: DEFAULT_CATEGORIES.length } };
}

export async function listExpenseCategories(service: ServiceContext, companyId: string, societyId: string) {
  if (!permitted(service, 'READ', companyId, societyId)) return denied();
  const items = await prisma.expenseCategory.findMany({
    where: { companyId, societyId },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, monthlyBase: true, isActive: true },
  });
  return { ok: true as const, value: items };
}
