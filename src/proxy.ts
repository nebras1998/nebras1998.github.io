import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { extractSessionCookie, getSessionAccount, getSessionRole } from '@/lib/server-auth';

// Mirror of the role-gating scheme in AuthGuard.tsx:
// /dashboard/** requires manager/admin, /technician/** requires technician/manager.
const DASHBOARD_ROLES = ['مدير', 'إداري'];
const TECHNICIAN_ROLES = ['فني', 'مدير'];

const UNAUTHORIZED_URL = '/unauthorized';

const APPWRITE_ORIGIN = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT
  ? new URL(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT).origin
  : 'https://fra.cloud.appwrite.io';

const isProd = process.env.NODE_ENV === 'production';

// Strict CSP with a per-request nonce. Next.js extracts the nonce from this
// header during server-side rendering and applies it to its own inline
// `self.__next_f` flight scripts, framework scripts, and page bundles — so no
// 'unsafe-inline' is needed for script-src. In development React requires
// 'unsafe-eval' for enhanced debugging (see Next.js content-security-policy docs).
function buildCsp(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isProd ? '' : " 'unsafe-eval'"}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    `img-src 'self' data: blob: ${APPWRITE_ORIGIN}`,
    "font-src 'self' data: https://fonts.gstatic.com",
    `connect-src 'self' ${APPWRITE_ORIGIN} wss: ws: https://fonts.googleapis.com https://fonts.gstatic.com`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ');
}

function redirectToLogin(request: NextRequest, pathname: string): NextResponse {
  const loginUrl = pathname.startsWith('/technician')
    ? new URL('/technician/login', request.url)
    : new URL('/login', request.url);
  loginUrl.searchParams.set('redirect', pathname);
  return NextResponse.redirect(loginUrl);
}

function withSecurityHeaders(request: NextRequest): NextResponse {
  // Fresh random nonce per request (hex UUID: unpredictable, one-time use).
  const nonce = crypto.randomUUID().replace(/-/g, '');
  const csp = buildCsp(nonce);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.headers.set('Content-Security-Policy', csp);
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'no-referrer');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=()'
  );
  if (isProd) {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Apply the nonce + CSP to every page request first (public pages included).
  const secured = withSecurityHeaders(request);

  const isDashboard = pathname.startsWith('/dashboard');
  const isTechnician = pathname.startsWith('/technician');

  // Non-dashboard/non-technician pages (login, portal, verify, unauthorized...)
  // pass through with security headers applied — no auth redirect.
  if (!isDashboard && !isTechnician) {
    return secured;
  }

  // Allow login pages through unconditionally to prevent redirect loops
  if (pathname === '/login' || pathname === '/technician/login') {
    return secured;
  }

  const sessionCookie = extractSessionCookie(request.cookies.getAll());

  if (!sessionCookie) {
    return redirectToLogin(request, pathname);
  }

  const account = await getSessionAccount(sessionCookie);
  if (!account?.email) {
    return redirectToLogin(request, pathname);
  }

  // The role source of truth is the same employee record AuthGuard reads client-side.
  const role = await getSessionRole(sessionCookie, account.email);

  // Valid session but wrong role for this area -> not permitted, not logged out.
  // Redirect to a clear unauthorized page (never to login, never into a loop).
  if (isDashboard && !DASHBOARD_ROLES.includes(role ?? '')) {
    return NextResponse.redirect(new URL(UNAUTHORIZED_URL, request.url));
  }
  if (isTechnician && !TECHNICIAN_ROLES.includes(role ?? '')) {
    return NextResponse.redirect(new URL(UNAUTHORIZED_URL, request.url));
  }

  return secured;
}

export const config = {
  matcher: [
    {
      source: '/((?!api|_next/static|_next/image|favicon.ico|sw.js|manifest.json|branding).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};