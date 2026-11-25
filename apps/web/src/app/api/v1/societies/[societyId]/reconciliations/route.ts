import { z } from 'zod';
import { prisma } from '@society/database';
import { guardRequest } from '@/lib/api/guard';
import { apiError, apiSuccess } from '@/lib/api/response';
import { serviceError } from '@/lib/api/service-result';
import { toServiceContext } from '@/lib/api/service-context';
import { reconcilePayment } from '@/lib/services/expense-workflow-service';

export const runtime = 'nodejs';

const createSchema = z.object({
  paymentId: z.uuid(),
  bankTransactionId: z.uuid(),
  amount: z.number().positive(),
  reason: z.string().trim().max(500).optional(),
}).strict();

export async function GET(request: Request, { params }: { params: Promise<{ societyId: string }> }) {
  const { societyId } = await params;
  if (!z.uuid().safeParse(societyId).success) return apiError(400, 'INVALID', 'Invalid society id', 'invalid-society-id');
  const guard = await guardRequest(request, {
    moduleKey: 'finance-billing', resourceKey: 'maintenance-expense', action: 'READ', societyId,
  });
  if (!guard.ok) return guard.response;
  const items = await prisma.reconciliationRecord.findMany({
    where: { companyId: guard.context.activeCompanyId!, societyId },
    orderBy: { createdAt: 'desc' },
    take: 200,
    select: { id: true, paymentId: true, bankTransactionId: true, amount: true, status: true, reason: true, createdAt: true },
  });
  return apiSuccess({ items });
}

export async function POST(request: Request, { params }: { params: Promise<{ societyId: string }> }) {
  const { societyId } = await params;
  if (!z.uuid().safeParse(societyId).success) return apiError(400, 'INVALID', 'Invalid society id', 'invalid-society-id');
  let body: unknown;
  try { body = await request.json(); } catch { return apiError(400, 'VALIDATION_ERROR', 'A JSON body is required', 'invalid-json'); }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return apiError(400, 'VALIDATION_ERROR', 'Invalid reconciliation payload', 'invalid-payload', parsed.error.flatten());
  const guard = await guardRequest(request, {
    moduleKey: 'finance-billing', resourceKey: 'maintenance-expense', action: 'UPDATE', societyId,
  });
  if (!guard.ok) return guard.response;
  const result = await reconcilePayment(toServiceContext(guard, request), guard.context.activeCompanyId!, societyId, parsed.data);
  return result.ok ? apiSuccess(result.value, 201) : serviceError(result, guard.requestId);
}
