import { newId } from '@society/shared';
import { loginSchema } from '@society/validation';
import { prisma, recordAudit } from '@society/database';
import { apiError, apiSuccess } from '@/lib/api/response';
import { verifyPassword } from '@/lib/auth/password';
import { assertLoginCsrf, issueSession } from '@/lib/auth/session';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;
const INVALID_CREDENTIALS = 'Invalid email or password';

export async function POST(request: Request) {
  const requestId = request.headers.get('x-request-id')?.slice(0, 64) || newId();
  const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
  const userAgent = request.headers.get('user-agent') ?? null;

  if (!(await assertLoginCsrf(request))) {
    return apiError(403, 'CSRF_INVALID', 'CSRF token is invalid or missing', requestId);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(400, 'VALIDATION_ERROR', 'A JSON body is required', requestId);
  }
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, 'VALIDATION_ERROR', 'Invalid sign-in request', requestId, parsed.error.flatten());
  }

  const { email, password, loginIntent = 'COMPANY' } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });
  const requestMeta = { ipAddress, userAgent, requestId };

  if (user?.lockedUntil && user.lockedUntil > new Date()) {
    await recordAudit({ ...requestMeta, actorUserId: user.id, action: 'LOGIN_BLOCKED', resourceType: 'session', result: 'DENIED', reason: 'account_locked' });
    return apiError(429, 'RATE_LIMITED', 'Account temporarily locked. Try again later.', requestId);
  }

  if (!user || user.status !== 'ACTIVE') {
    await recordAudit({ ...requestMeta, action: 'LOGIN_FAILURE', resourceType: 'session', result: 'FAILURE', reason: 'invalid_credentials' });
    return apiError(401, 'UNAUTHENTICATED', INVALID_CREDENTIALS, requestId);
  }

  let passwordValid = false;
  try {
    passwordValid = await verifyPassword(user.passwordHash, password);
  } catch (error) {
    logger.error({ requestId, error: String(error) }, 'password verification failed');
  }

  if (!passwordValid) {
    const attempts = user.failedLoginAttempts + 1;
    const lockedUntil = attempts >= MAX_FAILED_ATTEMPTS ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null;
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: lockedUntil ? 0 : attempts, lockedUntil },
    });
    await prisma.loginHistory.create({
      data: { userId: user.id, email, result: 'FAILURE', ipAddress, userAgent },
    });
    await recordAudit({ ...requestMeta, actorUserId: user.id, action: 'LOGIN_FAILURE', resourceType: 'session', result: 'FAILURE', reason: 'invalid_credentials', metadata: { attempts } });
    return apiError(401, 'UNAUTHENTICATED', INVALID_CREDENTIALS, requestId);
  }

  const activeMembership = loginIntent === 'COMPANY'
    ? await prisma.userMembership.findFirst({
        where: {
          userId: user.id,
          status: 'ACTIVE',
          company: { is: { status: 'ACTIVE' } },
        },
        orderBy: { createdAt: 'asc' },
        select: { companyId: true, societyId: true },
      })
    : null;
  const platformAssignment = loginIntent === 'PLATFORM'
    ? await prisma.userRole.findFirst({
        where: {
          userId: user.id,
          companyId: null,
          societyId: null,
          role: { is: { scopeType: 'PLATFORM' } },
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        select: { id: true },
      })
    : null;

  if ((loginIntent === 'COMPANY' && !activeMembership) || (loginIntent === 'PLATFORM' && !platformAssignment)) {
    await prisma.loginHistory.create({
      data: { userId: user.id, email, result: 'FAILURE', ipAddress, userAgent },
    });
    await recordAudit({
      ...requestMeta,
      actorUserId: user.id,
      action: 'LOGIN_FAILURE',
      resourceType: 'session',
      result: 'DENIED',
      reason: 'login_portal_mismatch',
      metadata: { loginIntent },
    });
    return apiError(401, 'UNAUTHENTICATED', INVALID_CREDENTIALS, requestId);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
  });
  await prisma.loginHistory.create({
    data: { userId: user.id, email, result: 'SUCCESS', ipAddress, userAgent },
  });
  await recordAudit({
    ...requestMeta,
    actorUserId: user.id,
    action: 'LOGIN_SUCCESS',
    resourceType: 'session',
    result: 'SUCCESS',
    metadata: { loginIntent },
  });
  await issueSession(
    user.id,
    activeMembership
      ? { companyId: activeMembership.companyId, societyId: activeMembership.societyId }
      : undefined,
  );

  return apiSuccess({ ok: true });
}
