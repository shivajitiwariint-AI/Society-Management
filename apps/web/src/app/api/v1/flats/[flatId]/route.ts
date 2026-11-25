import { z } from 'zod';
import { prisma } from '@society/database';
import { guardRequest } from '@/lib/api/guard';
import { apiError, apiSuccess } from '@/lib/api/response';
import { serviceError } from '@/lib/api/service-result';
import { toServiceContext } from '@/lib/api/service-context';
import { deleteFlat } from '@/lib/services/society-service';

export const runtime = 'nodejs';

export async function DELETE(request: Request, { params }: { params: Promise<{ flatId: string }> }) {
  const { flatId } = await params;
  if (!z.uuid().safeParse(flatId).success) {
    return apiError(400, 'INVALID', 'Invalid flat id', 'invalid-flat-id');
  }
  const record = await prisma.flat.findUnique({
    where: { id: flatId },
    select: { companyId: true, societyId: true },
  });
  if (!record) return apiError(404, 'NOT_FOUND', 'Flat not found', 'flat-not-found');

  const guard = await guardRequest(request, {
    moduleKey: 'society-foundation', resourceKey: 'flat', action: 'UPDATE',
    companyId: record.companyId, societyId: record.societyId,
  });
  if (!guard.ok) return guard.response;

  const result = await deleteFlat(
    toServiceContext(guard, request), guard.context.activeCompanyId!, record.societyId, flatId,
  );
  return result.ok ? apiSuccess(result.value) : serviceError(result, guard.requestId);
}
