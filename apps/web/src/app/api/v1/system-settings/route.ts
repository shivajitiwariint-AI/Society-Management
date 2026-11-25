import { updateSystemSettingSchema } from '@society/validation';
import { guardRequest } from '@/lib/api/guard';
import { apiError, apiSuccess } from '@/lib/api/response';
import { serviceError } from '@/lib/api/service-result';
import { toServiceContext } from '@/lib/api/service-context';
import { updateSystemSetting } from '@/lib/services/system-setting-service';

export const runtime = 'nodejs';

export async function PATCH(request: Request) {
  const guard = await guardRequest(request, {
    moduleKey: 'security-settings', resourceKey: 'system-setting', action: 'MANAGE_SETTINGS', platform: true,
  });
  if (!guard.ok) return guard.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(400, 'VALIDATION_ERROR', 'A JSON body is required', guard.requestId);
  }
  const parsed = updateSystemSettingSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, 'VALIDATION_ERROR', 'Invalid setting payload', guard.requestId, parsed.error.flatten());
  }

  const { key, value, reason } = parsed.data;
  const result = await updateSystemSetting(toServiceContext(guard, request), key, value, reason);
  return result.ok ? apiSuccess(result.value) : serviceError(result, guard.requestId);
}
