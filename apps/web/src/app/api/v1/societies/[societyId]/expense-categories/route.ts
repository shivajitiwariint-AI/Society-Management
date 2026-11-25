import { z } from 'zod';
import { prisma } from '@society/database';
import { guardRequest } from '@/lib/api/guard';
import { apiError, apiSuccess } from '@/lib/api/response';
import { serviceError } from '@/lib/api/service-result';
import { toServiceContext } from '@/lib/api/service-context';
import { listExpenseCategories, seedExpenseCategories } from '@/lib/services/expense-workflow-service';

export const runtime = 'nodejs';

export async function GET(request: Request, { params }: { params: Promise<{ societyId: string }> }) {
  const { societyId } = await params;
  if (!z.uuid().safeParse(societyId).success) return apiError(400, 'INVALID', 'Invalid society id', 'invalid-society-id');
  const guard = await guardRequest(request, {
    moduleKey: 'finance-billing', resourceKey: 'maintenance-expense', action: 'READ', societyId,
  });
  if (!guard.ok) return guard.response;
  const result = await listExpenseCategories(toServiceContext(guard, request), guard.context.activeCompanyId!, societyId);
  return result.ok ? apiSuccess(result.value) : serviceError(result, guard.requestId);
}

export async function POST(request: Request, { params }: { params: Promise<{ societyId: string }> }) {
  const { societyId } = await params;
  if (!z.uuid().safeParse(societyId).success) return apiError(400, 'INVALID', 'Invalid society id', 'invalid-society-id');
  const guard = await guardRequest(request, {
    moduleKey: 'finance-billing', resourceKey: 'maintenance-expense', action: 'UPDATE', societyId,
  });
  if (!guard.ok) return guard.response;
  const result = await seedExpenseCategories(toServiceContext(guard, request), guard.context.activeCompanyId!, societyId);
  return result.ok ? apiSuccess(result.value) : serviceError(result, guard.requestId);
}
