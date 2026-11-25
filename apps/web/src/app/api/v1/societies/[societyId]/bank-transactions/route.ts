import { z } from 'zod';
import { guardRequest } from '@/lib/api/guard';
import { apiError, apiSuccess } from '@/lib/api/response';
import { serviceError } from '@/lib/api/service-result';
import { toServiceContext } from '@/lib/api/service-context';
import { createBankTransaction, listBankTransactions } from '@/lib/services/expense-workflow-service';

export const runtime = 'nodejs';

const createSchema = z.object({
  transactionDate: z.coerce.date(),
  description: z.string().trim().max(300).optional(),
  reference: z.string().trim().max(160).optional(),
  amount: z.number().positive(),
  accountRef: z.string().trim().max(120).optional(),
}).strict();

export async function GET(request: Request, { params }: { params: Promise<{ societyId: string }> }) {
  const { societyId } = await params;
  if (!z.uuid().safeParse(societyId).success) return apiError(400, 'INVALID', 'Invalid society id', 'invalid-society-id');
  const guard = await guardRequest(request, {
    moduleKey: 'finance-billing', resourceKey: 'maintenance-expense', action: 'READ', societyId,
  });
  if (!guard.ok) return guard.response;
  const result = await listBankTransactions(toServiceContext(guard, request), guard.context.activeCompanyId!, societyId);
  return result.ok ? apiSuccess(result.value) : serviceError(result, guard.requestId);
}

export async function POST(request: Request, { params }: { params: Promise<{ societyId: string }> }) {
  const { societyId } = await params;
  if (!z.uuid().safeParse(societyId).success) return apiError(400, 'INVALID', 'Invalid society id', 'invalid-society-id');
  let body: unknown;
  try { body = await request.json(); } catch { return apiError(400, 'VALIDATION_ERROR', 'A JSON body is required', 'invalid-json'); }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return apiError(400, 'VALIDATION_ERROR', 'Invalid bank transaction', 'invalid-payload', parsed.error.flatten());
  const guard = await guardRequest(request, {
    moduleKey: 'finance-billing', resourceKey: 'maintenance-expense', action: 'UPDATE', societyId,
  });
  if (!guard.ok) return guard.response;
  const result = await createBankTransaction(toServiceContext(guard, request), guard.context.activeCompanyId!, societyId, parsed.data);
  return result.ok ? apiSuccess(result.value, 201) : serviceError(result, guard.requestId);
}
