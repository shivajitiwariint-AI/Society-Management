import { z } from 'zod';
import {
  EXPENSE_ATTACHMENT_KINDS,
  EXPENSE_ATTACHMENT_MAX_BYTES,
  EXPENSE_ATTACHMENT_MIME_TYPES,
  newId,
  type ExpenseAttachmentKind,
} from '@society/shared';
import { prisma } from '@society/database';
import { guardRequest } from '@/lib/api/guard';
import { apiError, apiSuccess } from '@/lib/api/response';

export const runtime = 'nodejs';

type Params = { params: Promise<{ id: string }> };
type ExpenseAction = 'READ' | 'UPDATE';

async function expenseGuard(request: Request, id: string, action: ExpenseAction) {
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
  const { id } = await params;
  const guard = await expenseGuard(request, id, 'READ');
  if (!guard.ok) return guard.response;

  const attachments = await prisma.expenseAttachment.findMany({
    where: { expenseId: id, companyId: guard.expense.companyId, societyId: guard.expense.societyId },
    orderBy: { createdAt: 'desc' },
    select: { id: true, fileName: true, mimeType: true, size: true, kind: true, uploadedBy: true, createdAt: true },
  });
  return apiSuccess({ items: attachments });
}

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const guard = await expenseGuard(request, id, 'UPDATE');
  if (!guard.ok) return guard.response;

  const form = await request.formData();
  const file = form.get('file');
  const rawKind = String(form.get('kind') ?? 'BILL');
  if (!file || typeof file === 'string') {
    return apiError(400, 'VALIDATION_ERROR', 'A file is required', guard.requestId);
  }
  if (!EXPENSE_ATTACHMENT_KINDS.includes(rawKind as ExpenseAttachmentKind)) {
    return apiError(400, 'VALIDATION_ERROR', 'Invalid document kind', guard.requestId);
  }
  if (!EXPENSE_ATTACHMENT_MIME_TYPES.includes(file.type as (typeof EXPENSE_ATTACHMENT_MIME_TYPES)[number])) {
    return apiError(400, 'VALIDATION_ERROR', 'Only PDF, images, Excel and CSV files are allowed', guard.requestId);
  }
  if (file.size > EXPENSE_ATTACHMENT_MAX_BYTES) {
    return apiError(400, 'VALIDATION_ERROR', 'File exceeds 10 MB', guard.requestId);
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const attachment = await prisma.expenseAttachment.create({
    data: {
      id: newId(),
      companyId: guard.expense.companyId,
      societyId: guard.expense.societyId,
      expenseId: id,
      fileName: file.name.slice(0, 255),
      mimeType: file.type,
      size: file.size,
      kind: rawKind,
      data: bytes,
      uploadedBy: guard.actorUserId,
    },
    select: { id: true, fileName: true, mimeType: true, size: true, kind: true, createdAt: true },
  });

  await prisma.auditLog.create({
    data: {
      id: newId(),
      companyId: guard.expense.companyId,
      societyId: guard.expense.societyId,
      actorUserId: guard.actorUserId,
      action: 'EXPENSE_DOCUMENT_UPLOADED',
      resourceType: 'expense-attachment',
      resourceId: attachment.id,
      result: 'SUCCESS',
      reason: `Uploaded ${rawKind} document ${file.name}`,
      requestId: guard.requestId,
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
      userAgent: request.headers.get('user-agent') ?? null,
    },
  });

  return apiSuccess(attachment, 201);
}
