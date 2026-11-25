import { z } from 'zod';
import { prisma } from '@society/database';
import { guardRequest } from '@/lib/api/guard';
import { apiError, apiSuccess } from '@/lib/api/response';
import { serviceError } from '@/lib/api/service-result';
import { toServiceContext } from '@/lib/api/service-context';
import { recordPayment } from '@/lib/services/expense-workflow-service';

export const runtime = 'nodejs';

const schema = z.object({
  amount: z.number().positive(),
  paidAt: z.coerce.date(),
  method: z.string().trim().min(2).max(30).default('OFFLINE'),
  accountRef: z.string().trim().max(120).optional(),
  transactionReference: z.string().trim().max(160).optional(),
}).strict();

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return apiError(400, 'INVALID', 'Invalid expense id', 'invalid-expense-id');

  let body: unknown;
  try { body = await request.json(); } catch { return apiError(400, 'VALIDATION_ERROR', 'A JSON body is required', 'invalid-json'); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return apiError(400, 'VALIDATION_ERROR', 'Invalid payment payload', 'invalid-payload', parsed.error.flatten());

  const expense = await prisma.maintenanceExpense.findUnique({
    where: { id }, select: { companyId: true, societyId: true },
  });
  if (!expense) return apiError(404, 'NOT_FOUND', 'Expense not found', 'expense-not-found');

  const guard = await guardRequest(request, {
    moduleKey: 'finance-billing', resourceKey: 'maintenance-expense', action: 'UPDATE',
    companyId: expense.companyId, societyId: expense.societyId,
  });
  if (!guard.ok) return guard.response;

  const result = await recordPayment(
    toServiceContext(guard, request), guard.context.activeCompanyId!, expense.societyId, id, parsed.data,
  );
  return result.ok ? apiSuccess(result.value) : serviceError(result, guard.requestId);
}
