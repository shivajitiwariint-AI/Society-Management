import { authorize } from '@society/authorization';
import { newId } from '@society/shared';
import { prisma } from '@society/database';
import type { ServiceContext, ServiceResult } from './company-service';

/** Updates a global platform setting with an audited reason. */
export async function updateSystemSetting(
  service: ServiceContext,
  key: string,
  value: unknown,
  reason: string,
): Promise<ServiceResult<{ key: string }>> {
  const decision = authorize(service.context, {
    moduleKey: 'security-settings', resourceKey: 'system-setting', action: 'MANAGE_SETTINGS', platform: true,
  });
  if (!decision.ok) return { ok: false, code: 'PERMISSION_DENIED', message: decision.error.message };

  const setting = await prisma.systemSetting.findUnique({ where: { key }, select: { key: true, isSecret: true } });
  if (!setting) return { ok: false, code: 'NOT_FOUND', message: 'Setting not found' };
  if (setting.isSecret) {
    return { ok: false, code: 'INVALID', message: 'Secret settings cannot be edited from this screen' };
  }

  await prisma.$transaction(async (tx) => {
    await tx.systemSetting.update({
      where: { key },
      data: { value: value as never, updatedBy: service.actorUserId },
    });
    await tx.auditLog.create({
      data: {
        id: newId(),
        actorUserId: service.actorUserId,
        action: 'SYSTEM_SETTING_UPDATED',
        resourceType: 'system-setting',
        resourceId: key,
        result: 'SUCCESS',
        reason,
        requestId: service.requestId,
        ipAddress: service.ipAddress ?? null,
        userAgent: service.userAgent ?? null,
      },
    });
  });

  return { ok: true, value: { key } };
}
