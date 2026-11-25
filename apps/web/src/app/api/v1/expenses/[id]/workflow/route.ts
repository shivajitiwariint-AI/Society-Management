import { z } from 'zod';
import { prisma } from '@society/database';
import { guardRequest } from '@/lib/api/guard';
import { apiError, apiSuccess } from '@/lib/api/response';
import { serviceError } from '@/lib/api/service-result';
import { toServiceContext } from '@/lib/api/service-context';
import { cancelExpense, decideExpense, submitExpense } from '@/lib/services/expense-workflow-service';

export const runtime = 'nodejs';

const schema = z.object({
  action: z.enum(['SUBMIT', 'APPROVE', 'REJECT', 'CANCEL']),
  comments: z.string().trim().max(500).optional(),
  reason: z.string().trim().max(500).optional(),
}).strict();

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return apiError(400, 'INVALID', 'Invalid expense id', 'invalid-expense-id');

  let body: unknown;
  try { body = await request.json(); } catch { return apiError(400, 'VALIDATION_ERROR', 'A JSON body is required', 'invalid-json'); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return apiError(400, 'VALIDATION_ERROR', 'Invalid workflow payload', 'invalid-payload', parsed.error.flatten());

  const expense = await prisma.maintenanceExpense.findUnique({
    where: { id }, select: { companyId: true, societyId: true },
  });
  if (!expense) return apiError(404, 'NOT_FOUND', 'Expense not found', 'expense-not-found');

  const guard = await guardRequest(request, {
    moduleKey: 'finance-billing', resourceKey: 'maintenance-expense', action: 'READ',
    companyId: expense.companyId, societyId: expense.societyId,
  });
  if (!guard.ok) return guard.response;

  const service = toServiceContext(guard, request);
  const companyId = guard.context.activeCompanyId!;
  const { action, comments, reason } = parsed.data;

  const result = action === 'SUBMIT'
    ? await submitExpense(service, companyId, expense.societyId, id, comments)
    : action === 'CANCEL'
      ? await cancelExpense(service, companyId, expense.societyId, id, reason ?? '')
      : await decideExpense(service, companyId, expense.societyId, id, action, { comments, reason });

  return result.ok ? apiSuccess(result.value) : apiError(
    result.code === 'NOT_FOUND' ? 404 : result.code === 'VALIDATION_ERROR' ? 400 : 403,
    result.code, result.message, guard.requestId,
  );
}
