import { z } from 'zod';
import { prisma } from '@society/database';
import { guardRequest } from '@/lib/api/guard';
import { apiError, apiSuccess } from '@/lib/api/response';
import { serviceError } from '@/lib/api/service-result';
import { toServiceContext } from '@/lib/api/service-context';
import { deleteBuilding } from '@/lib/services/society-service';

export const runtime = 'nodejs';

export async function DELETE(request: Request, { params }: { params: Promise<{ buildingId: string }> }) {
  const { buildingId } = await params;
  if (!z.uuid().safeParse(buildingId).success) {
    return apiError(400, 'INVALID', 'Invalid building id', 'invalid-building-id');
  }
  const record = await prisma.building.findUnique({
    where: { id: buildingId },
    select: { companyId: true, societyId: true },
  });
  if (!record) return apiError(404, 'NOT_FOUND', 'Building not found', 'building-not-found');

  const guard = await guardRequest(request, {
    moduleKey: 'society-foundation', resourceKey: 'building', action: 'UPDATE',
    companyId: record.companyId, societyId: record.societyId,
  });
  if (!guard.ok) return guard.response;

  const result = await deleteBuilding(
    toServiceContext(guard, request), guard.context.activeCompanyId!, record.societyId, buildingId,
  );
  return result.ok ? apiSuccess(result.value) : serviceError(result, guard.requestId);
}
