import { randomBytes } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Early navigation filter and per-request CSP nonce source.
 * It is NOT the authorization boundary: every page and API re-checks
 * authentication, entitlement and RBAC server-side.
 */

function contentSecurityPolicy(nonce: string): string {
  const isDev = process.env.NODE_ENV === 'development';
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ');
}

export function proxy(request: NextRequest) {
  // A fresh, unpredictable nonce is required for every response (SRS 15).
  const nonce = randomBytes(16).toString('base64');
  const csp = contentSecurityPolicy(nonce);

  const hasSessionCookie = Boolean(request.cookies.get('society_session')?.value);
  const path = request.nextUrl.pathname;
  const protectedPath = ['/dashboard', '/companies', '/admin/users', '/platform/users']
    .some((prefix) => path.startsWith(prefix));

  let response: NextResponse;
  if (protectedPath && !hasSessionCookie) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    response = NextResponse.redirect(url);
  } else {
    // NOTE: we deliberately do NOT redirect away from the login portals when a
    // session cookie is present. Cookie presence is not proof of a valid
    // session: after a company is deleted (or a session is revoked), the cookie
    // can outlive the database row. The app layout then sends the user to
    // /login, and bouncing back to /dashboard here would loop forever
    // (ERR_TOO_MANY_REDIRECTS). Session validity is checked server-side in
    // getSession(); the login page simply renders so the user can sign in again.
    // Next.js reads the nonce from the request CSP header and applies it to
    // framework scripts/styles during server rendering.
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-nonce', nonce);
    requestHeaders.set('Content-Security-Policy', csp);
    response = NextResponse.next({ request: { headers: requestHeaders } });
  }

  response.headers.set('Content-Security-Policy', csp);
  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
