import type { guardRequest } from './guard';
import type { ServiceContext } from '@/lib/services/company-service';

type SuccessfulGuard = Extract<Awaited<ReturnType<typeof guardRequest>>, { ok: true }>;

/** Maps a verified route guard result into the service-layer context. */
export function toServiceContext(guard: SuccessfulGuard, request: Request): ServiceContext {
  return {
    context: guard.context,
    actorUserId: guard.actorUserId,
    requestId: guard.requestId,
    ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
    userAgent: request.headers.get('user-agent') ?? null,
  };
}
