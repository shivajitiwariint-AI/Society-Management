import { z } from 'zod';
import { prisma } from '@society/database';
import { guardRequest } from '@/lib/api/guard';
import { apiError, apiSuccess } from '@/lib/api/response';
import { serviceError } from '@/lib/api/service-result';
import { toServiceContext } from '@/lib/api/service-context';
import { deleteFloor } from '@/lib/services/society-service';

export const runtime = 'nodejs';

export async function DELETE(request: Request, { params }: { params: Promise<{ floorId: string }> }) {
  const { floorId } = await params;
  if (!z.uuid().safeParse(floorId).success) {
    return apiError(400, 'INVALID', 'Invalid floor id', 'invalid-floor-id');
  }
  const record = await prisma.floor.findUnique({
    where: { id: floorId },
    select: { companyId: true, societyId: true },
  });
  if (!record) return apiError(404, 'NOT_FOUND', 'Floor not found', 'floor-not-found');

  const guard = await guardRequest(request, {
    moduleKey: 'society-foundation', resourceKey: 'floor', action: 'UPDATE',
    companyId: record.companyId, societyId: record.societyId,
  });
  if (!guard.ok) return guard.response;

  const result = await deleteFloor(
    toServiceContext(guard, request), guard.context.activeCompanyId!, record.societyId, floorId,
  );
  return result.ok ? apiSuccess(result.value) : serviceError(result, guard.requestId);
}
