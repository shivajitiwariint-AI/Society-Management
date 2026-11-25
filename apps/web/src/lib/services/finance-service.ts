import { authorize, type RequestContext } from '@society/authorization';
import { newId, type ModuleKey } from '@society/shared';
import { prisma, recordAudit, type Prisma } from '@society/database';
import type {
  ApprovePaymentInput,
  CreateAccountInput,
  CreateChargeInput,
  CreateInvoiceInput,
  CreateJournalInput,
  CreatePaymentInput,
  CreateRefundInput,
  LockPeriodInput,
  PostJournalInput,
  UpdateAccountInput,
  UpdateChargeInput,
} from '@society/validation';
import type { ServiceContext, ServiceResult } from './company-service';

type ResourceAction = 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'REJECT' | 'REFUND' | 'POST' | 'REVERSE' | 'LOCK' | 'EXPORT';

function denied<T>(): ServiceResult<T> {
  return { ok: false, code: 'PERMISSION_DENIED', message: 'The required permission is not granted within the current data scope' };
}
function invalid<T>(message: string): ServiceResult<T> {
  return { ok: false, code: 'INVALID', message };
}
function conflict<T>(message: string): ServiceResult<T> {
  return { ok: false, code: 'CONFLICT', message };
}
function notFound<T>(message: string): ServiceResult<T> {
  return { ok: false, code: 'NOT_FOUND', message };
}

function permit(
  service: ServiceContext,
  companyId: string,
  societyId: string,
  moduleKey: ModuleKey,
  resourceKey: string,
  action: ResourceAction,
): boolean {
  return authorize(service.context, {
    moduleKey,
    resourceKey,
    action: action as never,
    companyId,
    societyId,
  }).ok;
}

async function societyExists(companyId: string, societyId: string): Promise<boolean> {
  return (await prisma.society.findFirst({ where: { id: societyId, companyId }, select: { id: true } })) !== null;
}

async function audit(
  service: ServiceContext,
  companyId: string,
  societyId: string,
  action: string,
  resourceType: string,
  resourceId: string,
  reason: string,
  tx?: Prisma.TransactionClient,
): Promise<void> {
  const client = tx ?? prisma;
  await client.auditLog.create({
    data: {
      id: newId(),
      companyId,
      societyId,
      actorUserId: service.actorUserId,
      action,
      resourceType,
      resourceId,
      result: 'SUCCESS',
      reason,
      requestId: service.requestId,
      ipAddress: service.ipAddress ?? null,
      userAgent: service.userAgent ?? null,
    },
  });
}

function decimal(value: { toString(): string }): number {
  return Number(value.toString());
}

function date(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

async function periodLocked(companyId: string, societyId: string, periodKey: string | null): Promise<boolean> {
  if (!periodKey) return false;
  const row = await prisma.financialPeriod.findUnique({
    where: { companyId_societyId_periodKey: { companyId, societyId, periodKey } },
    select: { locked: true },
  });
  return row?.locked ?? false;
}

// ---------------------------------------------------------------------------
// Charge types and chart of accounts
// ---------------------------------------------------------------------------

export async function listCharges(service: ServiceContext, companyId: string, societyId: string) {
  if (!permit(service, companyId, societyId, 'finance-billing', 'charge-type', 'READ')) return denied();
  if (!(await societyExists(companyId, societyId))) return notFound('Society not found in the active company');
  const rows = await prisma.billingCharge.findMany({
    where: { companyId, societyId },
    orderBy: { code: 'asc' },
  });
  return {
    ok: true as const,
    value: rows.map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      chargeType: row.chargeType,
      amount: row.amount.toString(),
      frequency: row.frequency,
      isActive: row.isActive,
    })),
  };
}

export async function createCharge(service: ServiceContext, companyId: string, societyId: string, input: CreateChargeInput) {
  if (!permit(service, companyId, societyId, 'finance-billing', 'charge-type', 'CREATE')) return denied();
  if (!(await societyExists(companyId, societyId))) return notFound('Society not found in the active company');
  const id = newId();
  try {
    await prisma.$transaction(async (tx) => {
      await tx.billingCharge.create({
        data: {
          id,
          companyId,
          societyId,
          code: input.code.toUpperCase(),
          name: input.name,
          chargeType: input.chargeType,
          amount: input.amount.toFixed(2),
          frequency: input.frequency,
        },
      });
      await audit(service, companyId, societyId, 'CHARGE_TYPE_CREATED', 'charge-type', id, input.name, tx);
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unique constraint')) return conflict('Charge code already exists in this society');
    throw error;
  }
  return { ok: true as const, value: { id } };
}

export async function updateCharge(service: ServiceContext, companyId: string, societyId: string, id: string, input: UpdateChargeInput) {
  if (!permit(service, companyId, societyId, 'finance-billing', 'charge-type', 'UPDATE')) return denied();
  const existing = await prisma.billingCharge.findFirst({ where: { id, companyId, societyId }, select: { id: true } });
  if (!existing) return notFound('Charge type not found in the active society');
  await prisma.billingCharge.update({
    where: { id },
    data: {
      code: input.code?.toUpperCase(),
      name: input.name,
      chargeType: input.chargeType,
      amount: input.amount?.toFixed(2),
      frequency: input.frequency,
      isActive: input.isActive,
    },
  });
  await audit(service, companyId, societyId, 'CHARGE_TYPE_UPDATED', 'charge-type', id, 'Charge type updated');
  return { ok: true as const, value: { id } };
}

export async function listAccounts(service: ServiceContext, companyId: string, societyId: string) {
  if (!permit(service, companyId, societyId, 'accounting', 'account', 'READ')) return denied();
  if (!(await societyExists(companyId, societyId))) return notFound('Society not found in the active company');
  const rows = await prisma.account.findMany({ where: { companyId, societyId }, orderBy: { code: 'asc' } });
  return {
    ok: true as const,
    value: rows.map((row) => ({ id: row.id, code: row.code, name: row.name, accountType: row.accountType, isActive: row.isActive })),
  };
}

export async function createAccount(service: ServiceContext, companyId: string, societyId: string, input: CreateAccountInput) {
  if (!permit(service, companyId, societyId, 'accounting', 'account', 'CREATE')) return denied();
  if (!(await societyExists(companyId, societyId))) return notFound('Society not found in the active company');
  const id = newId();
  try {
    await prisma.$transaction(async (tx) => {
      await tx.account.create({
        data: { id, companyId, societyId, code: input.code.toUpperCase(), name: input.name, accountType: input.accountType },
      });
      await audit(service, companyId, societyId, 'ACCOUNT_CREATED', 'account', id, input.name, tx);
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unique constraint')) return conflict('Account code already exists in this society');
    throw error;
  }
  return { ok: true as const, value: { id } };
}

export async function updateAccount(service: ServiceContext, companyId: string, societyId: string, id: string, input: UpdateAccountInput) {
  if (!permit(service, companyId, societyId, 'accounting', 'account', 'UPDATE')) return denied();
  const existing = await prisma.account.findFirst({ where: { id, companyId, societyId }, select: { id: true } });
  if (!existing) return notFound('Account not found in the active society');
  await prisma.account.update({
    where: { id },
    data: { code: input.code?.toUpperCase(), name: input.name, accountType: input.accountType, isActive: input.isActive },
  });
  await audit(service, companyId, societyId, 'ACCOUNT_UPDATED', 'account', id, 'Account updated');
  return { ok: true as const, value: { id } };
}

export async function setPeriodLock(service: ServiceContext, companyId: string, societyId: string, input: LockPeriodInput) {
  if (!permit(service, companyId, societyId, 'accounting', 'period-close', input.locked ? 'LOCK' : 'REVERSE')) return denied();
  if (!(await societyExists(companyId, societyId))) return notFound('Society not found in the active company');
  await prisma.$transaction(async (tx) => {
    await tx.financialPeriod.upsert({
      where: { companyId_societyId_periodKey: { companyId, societyId, periodKey: input.periodKey } },
      create: {
        id: newId(),
        companyId,
        societyId,
        periodKey: input.periodKey,
        locked: input.locked,
        lockedBy: input.locked ? service.actorUserId : null,
        lockedAt: input.locked ? new Date() : null,
      },
      update: {
        locked: input.locked,
        lockedBy: input.locked ? service.actorUserId : null,
        lockedAt: input.locked ? new Date() : null,
      },
    });
    await audit(service, companyId, societyId, input.locked ? 'PERIOD_LOCKED' : 'PERIOD_REOPENED', 'period-close', input.periodKey, input.reason, tx);
  });
  return { ok: true as const, value: { periodKey: input.periodKey, locked: input.locked } };
}

export async function listPeriods(service: ServiceContext, companyId: string, societyId: string) {
  if (!permit(service, companyId, societyId, 'accounting', 'period-close', 'READ')) return denied();
  const rows = await prisma.financialPeriod.findMany({ where: { companyId, societyId }, orderBy: { periodKey: 'desc' } });
  return { ok: true as const, value: rows.map((row) => ({ periodKey: row.periodKey, locked: row.locked, lockedAt: row.lockedAt?.toISOString() ?? null })) };
}

// ---------------------------------------------------------------------------
// Invoices
// ---------------------------------------------------------------------------

export async function listInvoices(service: ServiceContext, companyId: string, societyId: string) {
  if (!permit(service, companyId, societyId, 'finance-billing', 'invoice', 'READ')) return denied();
  if (!(await societyExists(companyId, societyId))) return notFound('Society not found in the active company');
  const rows = await prisma.invoice.findMany({
    where: { companyId, societyId },
    include: { resident: { select: { name: true } }, flat: { select: { number: true } }, items: true },
    orderBy: { issueDate: 'desc' },
    take: 200,
  });
  return {
    ok: true as const,
    value: rows.map((row) => ({
      id: row.id,
      invoiceNumber: row.invoiceNumber,
      resident: row.resident?.name ?? null,
      flat: row.flat?.number ?? null,
      issueDate: row.issueDate.toISOString().slice(0, 10),
      dueDate: row.dueDate.toISOString().slice(0, 10),
      periodKey: row.periodKey,
      totalAmount: row.totalAmount.toString(),
      paidAmount: row.paidAmount.toString(),
      status: row.status,
      itemCount: row.items.length,
    })),
  };
}

function nextNumber(prefix: string, existing: string[]): string {
  let max = 0;
  for (const value of existing) {
    const match = value.match(/(\d+)$/);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `${prefix}-${String(max + 1).padStart(5, '0')}`;
}

export async function createInvoice(service: ServiceContext, companyId: string, societyId: string, input: CreateInvoiceInput) {
  if (!permit(service, companyId, societyId, 'finance-billing', 'invoice', 'CREATE')) return denied();
  if (!(await societyExists(companyId, societyId))) return notFound('Society not found in the active company');
  if (await periodLocked(companyId, societyId, input.periodKey ?? null)) return invalid('The billing period is locked');

  if (input.residentId) {
    const resident = await prisma.resident.findFirst({ where: { id: input.residentId, companyId, societyId }, select: { id: true } });
    if (!resident) return notFound('Resident not found in the active society');
    if (input.periodKey) {
      const duplicate = await prisma.invoice.findFirst({
        where: { companyId, societyId, residentId: input.residentId, periodKey: input.periodKey },
        select: { id: true },
      });
      if (duplicate) return conflict('An invoice already exists for this resident and period');
    }
  }
  if (input.flatId) {
    const flat = await prisma.flat.findFirst({ where: { id: input.flatId, companyId, societyId }, select: { id: true } });
    if (!flat) return notFound('Flat not found in the active society');
  }

  const id = newId();
  const total = input.items.reduce((sum, item) => sum + Number((item.quantity * item.unitAmount).toFixed(2)), 0);
  try {
    await prisma.$transaction(async (tx) => {
      const existingNumbers = await tx.invoice.findMany({
        where: { companyId, societyId },
        select: { invoiceNumber: true },
      });
      const invoiceNumber = input.invoiceNumber ?? nextNumber('INV', existingNumbers.map((row) => row.invoiceNumber));
      const invoice = await tx.invoice.create({
        data: {
          id,
          companyId,
          societyId,
          invoiceNumber,
          residentId: input.residentId || null,
          flatId: input.flatId || null,
          issueDate: date(input.issueDate),
          dueDate: date(input.dueDate),
          periodKey: input.periodKey || null,
          totalAmount: total.toFixed(2),
          status: 'ISSUED',
          notes: input.notes || null,
          createdBy: service.actorUserId,
        },
      });
      await tx.invoiceItem.createMany({
        data: input.items.map((item) => ({
          id: newId(),
          companyId,
          societyId,
          invoiceId: invoice.id,
          description: item.description,
          quantity: item.quantity.toFixed(2),
          unitAmount: item.unitAmount.toFixed(2),
          amount: (item.quantity * item.unitAmount).toFixed(2),
          chargeCode: item.chargeCode || null,
        })),
      });
      await audit(service, companyId, societyId, 'INVOICE_CREATED', 'invoice', id, invoiceNumber, tx);
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unique constraint')) return conflict('Invoice number already exists in this society');
    throw error;
  }
  return { ok: true as const, value: { id, totalAmount: total.toFixed(2) } };
}

export async function cancelInvoice(service: ServiceContext, companyId: string, societyId: string, id: string, reason: string) {
  if (!permit(service, companyId, societyId, 'finance-billing', 'invoice', 'REJECT')) return denied();
  const invoice = await prisma.invoice.findFirst({ where: { id, companyId, societyId }, select: { id: true, paidAmount: true } });
  if (!invoice) return notFound('Invoice not found in the active society');
  if (decimal(invoice.paidAmount) > 0) return invalid('A paid invoice cannot be cancelled; record a refund first');
  await prisma.invoice.update({ where: { id }, data: { status: 'CANCELLED' } });
  await audit(service, companyId, societyId, 'INVOICE_CANCELLED', 'invoice', id, reason);
  return { ok: true as const, value: { id } };
}

export async function getDues(service: ServiceContext, companyId: string, societyId: string) {
  if (!permit(service, companyId, societyId, 'finance-billing', 'dues-report', 'READ')) return denied();
  if (!(await societyExists(companyId, societyId))) return notFound('Society not found in the active company');
  const invoices = await prisma.invoice.findMany({
    where: { companyId, societyId, status: { in: ['ISSUED', 'PARTIALLY_PAID', 'OVERDUE'] } },
    include: { resident: { select: { name: true } } },
    orderBy: { dueDate: 'asc' },
  });
  let totalDues = 0;
  const rows = invoices.map((invoice) => {
    const due = Number((decimal(invoice.totalAmount) - decimal(invoice.paidAmount)).toFixed(2));
    totalDues += due;
    return {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      resident: invoice.resident?.name ?? null,
      dueDate: invoice.dueDate.toISOString().slice(0, 10),
      due: due.toFixed(2),
      status: invoice.status,
    };
  });
  return { ok: true as const, value: { totalDues: totalDues.toFixed(2), rows } };
}

// ---------------------------------------------------------------------------
// Payments, receipts and refunds (offline-first; no gateway integration)
// ---------------------------------------------------------------------------

export async function listPayments(service: ServiceContext, companyId: string, societyId: string) {
  if (!permit(service, companyId, societyId, 'payments-receipts', 'payment', 'READ')) return denied();
  const rows = await prisma.payment.findMany({
    where: { companyId, societyId },
    include: { invoice: { select: { invoiceNumber: true } }, resident: { select: { name: true } } },
    orderBy: { paidAt: 'desc' },
    take: 200,
  });
  return {
    ok: true as const,
    value: rows.map((row) => ({
      id: row.id,
      receiptNumber: row.receiptNumber,
      invoiceNumber: row.invoice?.invoiceNumber ?? null,
      resident: row.resident?.name ?? null,
      amount: row.amount.toString(),
      method: row.method,
      reference: row.reference,
      status: row.status,
      paidAt: row.paidAt.toISOString(),
    })),
  };
}

export async function createPayment(service: ServiceContext, companyId: string, societyId: string, input: CreatePaymentInput) {
  if (!permit(service, companyId, societyId, 'payments-receipts', 'payment', 'CREATE')) return denied();
  if (!(await societyExists(companyId, societyId))) return notFound('Society not found in the active company');

  let invoice: { id: string; totalAmount: { toString(): string }; paidAmount: { toString(): string }; status: string } | null = null;
  if (input.invoiceId) {
    invoice = await prisma.invoice.findFirst({
      where: { id: input.invoiceId, companyId, societyId },
      select: { id: true, totalAmount: true, paidAmount: true, status: true },
    });
    if (!invoice) return notFound('Invoice not found in the active society');
    if (invoice.status === 'CANCELLED') return invalid('Payments cannot be recorded against a cancelled invoice');
    const outstanding = Number((decimal(invoice.totalAmount) - decimal(invoice.paidAmount)).toFixed(2));
    if (input.amount > outstanding) return invalid(`Amount exceeds the outstanding balance of ${outstanding.toFixed(2)}`);
  }
  if (input.residentId) {
    const resident = await prisma.resident.findFirst({ where: { id: input.residentId, companyId, societyId }, select: { id: true } });
    if (!resident) return notFound('Resident not found in the active society');
  }

  const id = newId();
  try {
    await prisma.$transaction(async (tx) => {
      const existingNumbers = await tx.payment.findMany({ where: { companyId, societyId, receiptNumber: { not: null } }, select: { receiptNumber: true } });
      const receiptNumber = input.receiptNumber ?? nextNumber('RCP', existingNumbers.map((row) => row.receiptNumber ?? ''));
      await tx.payment.create({
        data: {
          id,
          companyId,
          societyId,
          invoiceId: input.invoiceId || null,
          residentId: input.residentId || null,
          receiptNumber,
          amount: input.amount.toFixed(2),
          method: input.method,
          reference: input.reference || null,
          status: 'PENDING',
          paidAt: input.paidAt ? new Date(input.paidAt) : new Date(),
          createdBy: service.actorUserId,
        },
      });
      await audit(service, companyId, societyId, 'PAYMENT_RECORDED', 'payment', id, receiptNumber, tx);
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unique constraint')) return conflict('Receipt number already exists in this society');
    throw error;
  }
  return { ok: true as const, value: { id, status: 'PENDING' } };
}

export async function approvePayment(service: ServiceContext, companyId: string, societyId: string, id: string, input: ApprovePaymentInput) {
  const action = input.action === 'APPROVE' ? 'APPROVE' : 'REJECT';
  if (!permit(service, companyId, societyId, 'payments-receipts', 'payment', action)) return denied();
  const payment = await prisma.payment.findFirst({ where: { id, companyId, societyId }, select: { id: true, invoiceId: true, amount: true, status: true } });
  if (!payment) return notFound('Payment not found in the active society');
  if (payment.status !== 'PENDING') return invalid('Only pending payments can be approved or rejected');

  if (action === 'APPROVE') {
    if (await periodLocked(companyId, societyId, new Date().toISOString().slice(0, 7))) return invalid('The accounting period is locked');
  }

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id },
      data: {
        status: action === 'APPROVE' ? 'APPROVED' : 'REVERSED',
        approvedBy: service.actorUserId,
        approvedAt: new Date(),
      },
    });
    if (action === 'APPROVE' && payment.invoiceId) {
      const invoice = await tx.invoice.findFirst({
        where: { id: payment.invoiceId, companyId, societyId },
        select: { id: true, totalAmount: true, paidAmount: true },
      });
      if (invoice) {
        const paid = Number((decimal(invoice.paidAmount) + decimal(payment.amount)).toFixed(2));
        const total = decimal(invoice.totalAmount);
        await tx.invoice.update({
          where: { id: invoice.id },
          data: { paidAmount: paid.toFixed(2), status: paid >= total ? 'PAID' : 'PARTIALLY_PAID' },
        });
      }
    }
    await audit(service, companyId, societyId, action === 'APPROVE' ? 'PAYMENT_APPROVED' : 'PAYMENT_REJECTED', 'payment', id, input.reason, tx);
  });
  return { ok: true as const, value: { id, status: action === 'APPROVE' ? 'APPROVED' : 'REVERSED' } };
}

export async function reconcilePayment(service: ServiceContext, companyId: string, societyId: string, id: string, reference: string) {
  if (!permit(service, companyId, societyId, 'payments-receipts', 'reconciliation', 'APPROVE')) return denied();
  const payment = await prisma.payment.findFirst({ where: { id, companyId, societyId }, select: { id: true, status: true } });
  if (!payment) return notFound('Payment not found in the active society');
  if (payment.status !== 'APPROVED') return invalid('Only approved payments can be reconciled');
  await prisma.payment.update({ where: { id }, data: { status: 'RECONCILED', reference } });
  await audit(service, companyId, societyId, 'PAYMENT_RECONCILED', 'reconciliation', id, 'Offline payment reconciled');
  return { ok: true as const, value: { id } };
}

export async function createRefund(service: ServiceContext, companyId: string, societyId: string, paymentId: string, input: CreateRefundInput) {
  if (!permit(service, companyId, societyId, 'payments-receipts', 'refund', 'REFUND')) return denied();
  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, companyId, societyId },
    select: { id: true, amount: true, status: true, invoiceId: true },
  });
  if (!payment) return notFound('Payment not found in the active society');
  if (!['APPROVED', 'RECONCILED'].includes(payment.status)) return invalid('Refunds require an approved or reconciled payment');
  const alreadyRefunded = await prisma.refund.aggregate({
    where: { companyId, societyId, paymentId, status: { in: ['PENDING', 'APPROVED'] } },
    _sum: { amount: true },
  });
  const remaining = Number((decimal(payment.amount) - Number(alreadyRefunded._sum.amount?.toString() ?? '0')).toFixed(2));
  if (input.amount > remaining) return invalid(`Refund amount exceeds the refundable balance of ${remaining.toFixed(2)}`);

  const id = newId();
  await prisma.$transaction(async (tx) => {
    await tx.refund.create({
      data: {
        id,
        companyId,
        societyId,
        paymentId,
        amount: input.amount.toFixed(2),
        reason: input.reason,
        createdBy: service.actorUserId,
      },
    });
    await audit(service, companyId, societyId, 'REFUND_REQUESTED', 'refund', id, input.reason, tx);
  });
  return { ok: true as const, value: { id, status: 'PENDING' } };
}

export async function approveRefund(service: ServiceContext, companyId: string, societyId: string, id: string, approve: boolean) {
  if (!permit(service, companyId, societyId, 'payments-receipts', 'refund', approve ? 'APPROVE' : 'REJECT')) return denied();
  const refund = await prisma.refund.findFirst({
    where: { id, companyId, societyId },
    select: { id: true, paymentId: true, amount: true, status: true },
  });
  if (!refund) return notFound('Refund not found in the active society');
  if (refund.status !== 'PENDING') return invalid('Only pending refunds can be decided');

  await prisma.$transaction(async (tx) => {
    await tx.refund.update({
      where: { id },
      data: {
        status: approve ? 'APPROVED' : 'REJECTED',
        approvedBy: service.actorUserId,
        approvedAt: new Date(),
      },
    });
    if (approve) {
      await tx.payment.update({ where: { id: refund.paymentId }, data: { status: 'REFUNDED' } });
      const payment = await tx.payment.findFirst({ where: { id: refund.paymentId }, select: { invoiceId: true } });
      if (payment?.invoiceId) {
        const invoice = await tx.invoice.findFirst({ where: { id: payment.invoiceId }, select: { id: true, totalAmount: true, paidAmount: true } });
        if (invoice) {
          const paid = Math.max(0, Number((decimal(invoice.paidAmount) - decimal(refund.amount)).toFixed(2)));
          await tx.invoice.update({
            where: { id: invoice.id },
            data: { paidAmount: paid.toFixed(2), status: paid === 0 ? 'ISSUED' : 'PARTIALLY_PAID' },
          });
        }
      }
    }
    await audit(service, companyId, societyId, approve ? 'REFUND_APPROVED' : 'REFUND_REJECTED', 'refund', id, 'Refund decision recorded', tx);
  });
  return { ok: true as const, value: { id } };
}

export async function listRefunds(service: ServiceContext, companyId: string, societyId: string) {
  if (!permit(service, companyId, societyId, 'payments-receipts', 'refund', 'READ')) return denied();
  const rows = await prisma.refund.findMany({ where: { companyId, societyId }, orderBy: { createdAt: 'desc' }, take: 200 });
  return { ok: true as const, value: rows.map((row) => ({
    id: row.id,
    paymentId: row.paymentId,
    amount: row.amount.toString(),
    reason: row.reason,
    status: row.status,
  })) };
}

// ---------------------------------------------------------------------------
// Accounting journals
// ---------------------------------------------------------------------------

export async function listJournals(service: ServiceContext, companyId: string, societyId: string) {
  if (!permit(service, companyId, societyId, 'accounting', 'journal-entry', 'READ')) return denied();
  const rows = await prisma.journalEntry.findMany({
    where: { companyId, societyId },
    include: { lines: { include: { account: { select: { code: true, name: true } } } } },
    orderBy: { entryDate: 'desc' },
    take: 200,
  });
  return { ok: true as const, value: rows.map((row) => ({
    id: row.id,
    entryNumber: row.entryNumber,
    entryDate: row.entryDate.toISOString().slice(0, 10),
    description: row.description,
    periodKey: row.periodKey,
    status: row.status,
    lines: row.lines.map((line) => ({
      id: line.id,
      account: `${line.account.code} ${line.account.name}`,
      debit: line.debit.toString(),
      credit: line.credit.toString(),
    })),
  })) };
}

export async function createJournal(service: ServiceContext, companyId: string, societyId: string, input: CreateJournalInput) {
  if (!permit(service, companyId, societyId, 'accounting', 'journal-entry', 'CREATE')) return denied();
  if (!(await societyExists(companyId, societyId))) return notFound('Society not found in the active company');
  if (await periodLocked(companyId, societyId, input.periodKey ?? null)) return invalid('The accounting period is locked');
  const accountIds = [...new Set(input.lines.map((line) => line.accountId))];
  const accounts = await prisma.account.findMany({
    where: { id: { in: accountIds }, companyId, societyId, isActive: true },
    select: { id: true },
  });
  if (accounts.length !== accountIds.length) return notFound('One or more accounts are not active in this society');

  const id = newId();
  try {
    await prisma.$transaction(async (tx) => {
      const existingNumbers = await tx.journalEntry.findMany({ where: { companyId, societyId }, select: { entryNumber: true } });
      const entryNumber = input.entryNumber ?? nextNumber('JV', existingNumbers.map((row) => row.entryNumber));
      const entry = await tx.journalEntry.create({
        data: {
          id,
          companyId,
          societyId,
          entryNumber,
          entryDate: date(input.entryDate),
          description: input.description,
          periodKey: input.periodKey || null,
          createdBy: service.actorUserId,
        },
      });
      await tx.journalLine.createMany({
        data: input.lines.map((line) => ({
          id: newId(),
          companyId,
          societyId,
          journalEntryId: entry.id,
          accountId: line.accountId,
          debit: line.debit.toFixed(2),
          credit: line.credit.toFixed(2),
          narrative: line.narrative || null,
        })),
      });
      await audit(service, companyId, societyId, 'JOURNAL_CREATED', 'journal-entry', id, entryNumber, tx);
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unique constraint')) return conflict('Journal number already exists in this society');
    throw error;
  }
  return { ok: true as const, value: { id } };
}

export async function postJournal(service: ServiceContext, companyId: string, societyId: string, id: string, input: PostJournalInput) {
  if (!permit(service, companyId, societyId, 'accounting', 'journal-entry', 'POST')) return denied();
  const entry = await prisma.journalEntry.findFirst({
    where: { id, companyId, societyId },
    select: { id: true, status: true, periodKey: true, lines: { select: { debit: true, credit: true } } },
  });
  if (!entry) return notFound('Journal entry not found in the active society');
  if (entry.status !== 'DRAFT') return invalid('Only draft journals can be posted');
  if (await periodLocked(companyId, societyId, entry.periodKey)) return invalid('The accounting period is locked');
  const debit = entry.lines.reduce((sum, line) => sum + decimal(line.debit), 0);
  const credit = entry.lines.reduce((sum, line) => sum + decimal(line.credit), 0);
  if (debit.toFixed(2) !== credit.toFixed(2)) return invalid('Debits must equal credits before posting');

  await prisma.journalEntry.update({
    where: { id },
    data: { status: 'POSTED', postedBy: service.actorUserId, postedAt: new Date() },
  });
  await audit(service, companyId, societyId, 'JOURNAL_POSTED', 'journal-entry', id, input.reason);
  return { ok: true as const, value: { id } };
}

export async function reverseJournal(service: ServiceContext, companyId: string, societyId: string, id: string, reason: string) {
  if (!permit(service, companyId, societyId, 'accounting', 'journal-entry', 'REVERSE')) return denied();
  const entry = await prisma.journalEntry.findFirst({
    where: { id, companyId, societyId },
    select: { id: true, status: true, periodKey: true, entryNumber: true, description: true, entryDate: true, lines: true },
  });
  if (!entry) return notFound('Journal entry not found in the active society');
  if (entry.status !== 'POSTED') return invalid('Only posted journals can be reversed');
  if (entry.periodKey && await periodLocked(companyId, societyId, entry.periodKey)) return invalid('The accounting period is locked');

  const reversalId = newId();
  await prisma.$transaction(async (tx) => {
    const reversal = await tx.journalEntry.create({
      data: {
        id: reversalId,
        companyId,
        societyId,
        entryNumber: nextNumber(`REV-${entry.entryNumber}`, []),
        entryDate: new Date(),
        description: `Reversal: ${entry.description}`,
        periodKey: new Date().toISOString().slice(0, 7),
        status: 'POSTED',
        reversalOf: entry.id,
        createdBy: service.actorUserId,
        postedBy: service.actorUserId,
        postedAt: new Date(),
      },
    });
    await tx.journalLine.createMany({
      data: entry.lines.map((line) => ({
        id: newId(),
        companyId,
        societyId,
        journalEntryId: reversal.id,
        accountId: line.accountId,
        debit: line.credit.toString(),
        credit: line.debit.toString(),
        narrative: 'Reversal entry',
      })),
    });
    await tx.journalEntry.update({ where: { id }, data: { status: 'REVERSED' } });
    await audit(service, companyId, societyId, 'JOURNAL_REVERSED', 'journal-entry', id, reason, tx);
  });
  return { ok: true as const, value: { id: reversalId } };
}

export async function getTrialBalance(service: ServiceContext, companyId: string, societyId: string, periodKey?: string) {
  if (!permit(service, companyId, societyId, 'accounting', 'financial-report', 'READ')) return denied();
  const lines = await prisma.journalLine.findMany({
    where: {
      companyId,
      societyId,
      journalEntry: {
        status: 'POSTED',
        ...(periodKey ? { periodKey } : {}),
      },
    },
    include: { account: { select: { code: true, name: true, accountType: true } } },
  });
  const balances = new Map<string, { code: string; name: string; accountType: string; debit: number; credit: number }>();
  for (const line of lines) {
    const current = balances.get(line.accountId) ?? {
      code: line.account.code,
      name: line.account.name,
      accountType: line.account.accountType,
      debit: 0,
      credit: 0,
    };
    current.debit += decimal(line.debit);
    current.credit += decimal(line.credit);
    balances.set(line.accountId, current);
  }
  const rows = [...balances.values()].map((row) => ({
    ...row,
    debit: row.debit.toFixed(2),
    credit: row.credit.toFixed(2),
    balance: (row.debit - row.credit).toFixed(2),
  }));
  return {
    ok: true as const,
    value: {
      periodKey: periodKey ?? 'ALL',
      rows,
      totalDebit: rows.reduce((sum, row) => sum + Number(row.debit), 0).toFixed(2),
      totalCredit: rows.reduce((sum, row) => sum + Number(row.credit), 0).toFixed(2),
    },
  };
}
