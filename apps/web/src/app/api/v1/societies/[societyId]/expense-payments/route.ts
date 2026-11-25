import { z } from 'zod';
import { prisma } from '@society/database';
import { guardRequest } from '@/lib/api/guard';
import { apiError, apiSuccess } from '@/lib/api/response';

export const runtime = 'nodejs';

export async function GET(request: Request, { params }: { params: Promise<{ societyId: string }> }) {
  const { societyId } = await params;
  if (!z.uuid().safeParse(societyId).success) return apiError(400, 'INVALID', 'Invalid society id', 'invalid-society-id');
  const guard = await guardRequest(request, {
    moduleKey: 'finance-billing', resourceKey: 'maintenance-expense', action: 'READ', societyId,
  });
  if (!guard.ok) return guard.response;
  const items = await prisma.expensePayment.findMany({
    where: { companyId: guard.context.activeCompanyId!, societyId, status: 'ACTIVE' },
    orderBy: { paidAt: 'desc' },
    take: 200,
    select: { id: true, expenseId: true, amount: true, paidAt: true, method: true, transactionReference: true },
  });
  return apiSuccess({ items });
}
