import { z } from 'zod';
import { newId } from '@society/shared';
import { prisma } from '@society/database';
import { guardRequest } from '@/lib/api/guard';
import { apiError, apiSuccess } from '@/lib/api/response';

export const runtime = 'nodejs';

type Params = { params: Promise<{ id: string; attachmentId: string }> };

async function expenseGuard(request: Request, id: string, action: 'READ' | 'UPDATE') {
  if (!z.uuid().safeParse(id).success) {
    return { ok: false as const, response: apiError(400, 'INVALID', 'Invalid expense id', 'invalid-expense-id') };
  }
  const expense = await prisma.maintenanceExpense.findUnique({
    where: { id },
    select: { id: true, companyId: true, societyId: true },
  });
  if (!expense) {
    return { ok: false as const, response: apiError(404, 'NOT_FOUND', 'Expense not found', 'expense-not-found') };
  }
  const guard = await guardRequest(request, {
    moduleKey: 'finance-billing',
    resourceKey: 'maintenance-expense',
    action,
    companyId: expense.companyId,
    societyId: expense.societyId,
  });
  return guard.ok ? { ...guard, expense } : guard;
}

export async function GET(request: Request, { params }: Params) {
  const { id, attachmentId } = await params;
  if (!z.uuid().safeParse(attachmentId).success) {
    return apiError(400, 'INVALID', 'Invalid attachment id', 'invalid-attachment-id');
  }
  const guard = await expenseGuard(request, id, 'READ');
  if (!guard.ok) return guard.response;

  const attachment = await prisma.expenseAttachment.findFirst({
    where: { id: attachmentId, expenseId: id, companyId: guard.expense.companyId, societyId: guard.expense.societyId },
    select: { fileName: true, mimeType: true, data: true },
  });
  if (!attachment) return apiError(404, 'NOT_FOUND', 'Document not found', 'attachment-not-found');

  const safeName = attachment.fileName.replace(/["\r\n]/g, '_');
  return new Response(new Uint8Array(attachment.data), {
    headers: {
      'content-type': attachment.mimeType,
      'content-disposition': `attachment; filename="${safeName}"`,
      'cache-control': 'private, no-store',
    },
  });
}

export async function DELETE(request: Request, { params }: Params) {
  const { id, attachmentId } = await params;
  if (!z.uuid().safeParse(attachmentId).success) {
    return apiError(400, 'INVALID', 'Invalid attachment id', 'invalid-attachment-id');
  }
  const guard = await expenseGuard(request, id, 'UPDATE');
  if (!guard.ok) return guard.response;

  const attachment = await prisma.expenseAttachment.findFirst({
    where: { id: attachmentId, expenseId: id, companyId: guard.expense.companyId, societyId: guard.expense.societyId },
    select: { id: true, fileName: true },
  });
  if (!attachment) return apiError(404, 'NOT_FOUND', 'Document not found', 'attachment-not-found');

  await prisma.expenseAttachment.delete({ where: { id: attachment.id } });
  await prisma.auditLog.create({
    data: {
      id: newId(),
      companyId: guard.expense.companyId,
      societyId: guard.expense.societyId,
      actorUserId: guard.actorUserId,
      action: 'EXPENSE_DOCUMENT_DELETED',
      resourceType: 'expense-attachment',
      resourceId: attachment.id,
      result: 'SUCCESS',
      reason: `Deleted document ${attachment.fileName}`,
      requestId: guard.requestId,
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
      userAgent: request.headers.get('user-agent') ?? null,
    },
  });
  return apiSuccess({ ok: true });
}
