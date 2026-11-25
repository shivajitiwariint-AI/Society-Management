import { createHash, createHmac } from 'node:crypto';
import { cookies, headers } from 'next/headers';
import { newId, newToken, timingSafeEqualText } from '@society/shared';
import { loadRequestContext, prisma } from '@society/database';
import type { RequestContext } from '@society/authorization';

const SESSION_COOKIE = 'society_session';
const CSRF_COOKIE = 'society_csrf';
const SESSION_TTL_SECONDS = 60 * 60 * 12;

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** CSRF token is bound to the session token, so it cannot be forged separately. */
function deriveCsrf(sessionToken: string): string {
  const secret = process.env.CSRF_SECRET;
  if (!secret || secret.startsWith('CHANGE_ME')) throw new Error('CSRF_SECRET is not configured');
  return createHmac('sha256', secret).update(sessionToken).digest('base64url');
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  };
}

export interface InitialSessionContext {
  companyId?: string | null;
  societyId?: string | null;
}

/** Issues an opaque session and rotates away a session presented on this request. */
export async function issueSession(userId: string, initialContext?: InitialSessionContext): Promise<void> {
  const token = newToken(48);
  const requestHeaders = await headers();
  const forwarded = requestHeaders.get('x-forwarded-for');
  const ipAddress = forwarded?.split(',')[0]?.trim() ?? null;
  const jar = await cookies();
  const presentedToken = jar.get(SESSION_COOKIE)?.value;
  if (presentedToken) {
    await prisma.session.updateMany({
      where: { tokenHash: hashToken(presentedToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  await prisma.session.create({
    data: {
      id: newId(),
      userId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + SESSION_TTL_SECONDS * 1000),
      activeCompanyId: initialContext?.companyId ?? null,
      activeSocietyId: initialContext?.societyId ?? null,
      ipAddress,
      userAgent: requestHeaders.get('user-agent')?.slice(0, 512) ?? null,
    },
  });

  jar.set(SESSION_COOKIE, token, cookieOptions());
  jar.set(CSRF_COOKIE, deriveCsrf(token), { ...cookieOptions(), httpOnly: false });
}

export async function revokeSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session.updateMany({
      where: { tokenHash: hashToken(token), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
  jar.delete(SESSION_COOKIE);
  jar.delete(CSRF_COOKIE);
}

export async function getSession() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { select: { id: true, email: true, name: true, status: true } } },
  });
  if (!session || session.revokedAt || session.expiresAt <= new Date() || session.user.status !== 'ACTIVE') {
    return null;
  }
  return session;
}

export async function getRequestContext(requestId: string): Promise<RequestContext | null> {
  const session = await getSession();
  if (!session) return null;
  return loadRequestContext(
    session.userId,
    session.activeCompanyId,
    session.activeSocietyId,
    requestId,
  );
}

/** Pre-session CSRF token issued by GET /api/v1/auth/csrf for the login form. */
export async function issueAnonymousCsrf(): Promise<string> {
  const token = newToken(32);
  const jar = await cookies();
  jar.set(CSRF_COOKIE, token, { ...cookieOptions(), httpOnly: false });
  return token;
}

export async function assertLoginCsrf(request: Request): Promise<boolean> {
  const cookieToken = (await cookies()).get(CSRF_COOKIE)?.value;
  const headerToken = request.headers.get('x-csrf-token');
  if (!cookieToken || !headerToken) return false;
  return timingSafeEqualText(cookieToken, headerToken);
}

export async function csrfTokenForClient(): Promise<string> {
  const jar = await cookies();
  const sessionToken = jar.get(SESSION_COOKIE)?.value;
  if (sessionToken) return deriveCsrf(sessionToken);
  return jar.get(CSRF_COOKIE)?.value ?? '';
}

export async function assertCsrf(request: Request): Promise<boolean> {
  const method = request.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return true;
  const jar = await cookies();
  const sessionToken = jar.get(SESSION_COOKIE)?.value;
  const cookieToken = jar.get(CSRF_COOKIE)?.value;
  const headerToken = request.headers.get('x-csrf-token');
  if (!sessionToken || !cookieToken || !headerToken) return false;
  return timingSafeEqualText(deriveCsrf(sessionToken), cookieToken)
    && timingSafeEqualText(cookieToken, headerToken);
}

export async function switchActiveCompany(companyId: string, societyId: string | null): Promise<boolean> {
  const session = await getSession();
  if (!session) return false;

  const company = await prisma.company.findFirst({
    where: { id: companyId, status: 'ACTIVE' },
    select: { id: true },
  });
  if (!company) return false;

  // Platform administrators may work inside any active tenant without a membership.
  const platformRole = await prisma.userRole.findFirst({
    where: {
      userId: session.userId,
      companyId: null,
      societyId: null,
      role: { scopeType: 'PLATFORM' },
    },
    select: { id: true },
  });

  if (!platformRole) {
    const membership = await prisma.userMembership.findFirst({
      where: { userId: session.userId, companyId, status: 'ACTIVE' },
      select: { societyId: true },
    });
    if (!membership) return false;

    if (membership.societyId !== null) {
      // Society-scoped memberships cannot widen themselves to the whole company.
      if (societyId !== membership.societyId) return false;
    } else if (societyId) {
      const society = await prisma.society.findFirst({
        where: { id: societyId, companyId },
        select: { id: true },
      });
      if (!society) return false;
    }
  }

  await prisma.session.update({
    where: { id: session.id },
    data: { activeCompanyId: companyId, activeSocietyId: societyId },
  });
  return true;
}
