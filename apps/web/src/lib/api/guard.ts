import { authorize, type AuthorizationRequest, type RequestContext } from '@society/authorization';
import { newId } from '@society/shared';
import { recordAudit } from '@society/database';
import { apiError } from './response';
import { assertCsrf, getRequestContext, getSession } from '../auth/session';
import { logger } from '../logger';

type GuardSuccess = { ok: true; context: RequestContext; requestId: string; actorUserId: string };
type GuardFailure = { ok: false; response: ReturnType<typeof apiError> };

/**
 * Every protected Route Handler uses this guard: CSRF, authentication,
 * server-derived tenant context, RBAC, entitlement and audit (SRS 14).
 */
export async function guardRequest(
  request: Request,
  policy?: Omit<AuthorizationRequest, never>,
): Promise<GuardSuccess | GuardFailure> {
  const requestId = request.headers.get('x-request-id')?.slice(0, 64) || newId();
  if (!(await assertCsrf(request))) {
    return { ok: false, response: apiError(403, 'CSRF_INVALID', 'CSRF token is invalid or missing', requestId) };
  }

  const session = await getSession();
  if (!session) {
    return { ok: false, response: apiError(401, 'UNAUTHENTICATED', 'Sign in is required', requestId) };
  }
  const context = await getRequestContext(requestId);
  if (!context) {
    return { ok: false, response: apiError(401, 'UNAUTHENTICATED', 'Session is no longer valid', requestId) };
  }

  if (policy) {
    const decision = authorize(context, policy);
    if (!decision.ok) {
      await recordAudit({
        companyId: context.activeCompanyId,
        societyId: policy.societyId ?? context.activeSocietyId,
        actorUserId: session.userId,
        action: `${policy.moduleKey}:${policy.resourceKey}:${policy.action}`,
        resourceType: policy.resourceKey,
        result: 'DENIED',
        reason: decision.error.reason,
        requestId,
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
        userAgent: request.headers.get('user-agent') ?? null,
      });
      logger.warn({ requestId, reason: decision.error.reason, userId: session.userId }, 'authorization denied');
      return {
        ok: false,
        response: apiError(403, decision.error.reason, decision.error.message, requestId),
      };
    }
  }

  return { ok: true, context, requestId, actorUserId: session.userId };
}
