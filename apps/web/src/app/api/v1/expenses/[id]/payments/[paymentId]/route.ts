import { z } from 'zod';
import { prisma } from '@society/database';
import { guardRequest } from '@/lib/api/guard';
import { apiError, apiSuccess } from '@/lib/api/response';
import { serviceError } from '@/lib/api/service-result';
import { toServiceContext } from '@/lib/api/service-context';
import { reversePayment } from '@/lib/services/expense-workflow-service';

export const runtime = 'nodejs';

const schema = z.object({ reason: z.string().trim().min(3).max(500) }).strict();

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string; paymentId: string }> }) {
  const { id, paymentId } = await params;
  if (!z.uuid().safeParse(id).success || !z.uuid().safeParse(paymentId).success) {
    return apiError(400, 'INVALID', 'Invalid ids', 'invalid-ids');
  }
  let body: unknown;
  try { body = await request.json(); } catch { return apiError(400, 'VALIDATION_ERROR', 'A JSON body with a reason is required', 'invalid-json'); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return apiError(400, 'VALIDATION_ERROR', 'A reversal reason is required', 'invalid-payload');

  const payment = await prisma.expensePayment.findFirst({
    where: { id: paymentId, expenseId: id }, select: { companyId: true, societyId: true },
  });
  if (!payment) return apiError(404, 'NOT_FOUND', 'Payment not found', 'payment-not-found');

  const guard = await guardRequest(request, {
    moduleKey: 'finance-billing', resourceKey: 'maintenance-expense', action: 'REFUND',
    companyId: payment.companyId, societyId: payment.societyId,
  });
  if (!guard.ok) return guard.response;

  const result = await reversePayment(
    toServiceContext(guard, request), guard.context.activeCompanyId!, payment.societyId, paymentId, parsed.data.reason,
  );
  return result.ok ? apiSuccess(result.value) : serviceError(result, guard.requestId);
}
