import { z } from 'zod';
import { prisma } from '@society/database';
import { guardRequest } from '@/lib/api/guard';
import { apiError, apiSuccess } from '@/lib/api/response';
import { serviceError } from '@/lib/api/service-result';
import { toServiceContext } from '@/lib/api/service-context';
import { deleteSociety } from '@/lib/services/society-service';

export const runtime = 'nodejs';

export async function DELETE(request: Request, { params }: { params: Promise<{ societyId: string }> }) {
  const { societyId } = await params;
  if (!z.uuid().safeParse(societyId).success) {
    return apiError(400, 'INVALID', 'Invalid society id', 'invalid-society-id');
  }
  const society = await prisma.society.findUnique({
    where: { id: societyId },
    select: { companyId: true },
  });
  if (!society) return apiError(404, 'NOT_FOUND', 'Society not found', 'society-not-found');

  const guard = await guardRequest(request, {
    moduleKey: 'company', resourceKey: 'society', action: 'UPDATE',
    companyId: society.companyId, societyId,
  });
  if (!guard.ok) return guard.response;

  const result = await deleteSociety(
    toServiceContext(guard, request), guard.context.activeCompanyId!, societyId,
  );
  return result.ok ? apiSuccess(result.value) : serviceError(result, guard.requestId);
}
