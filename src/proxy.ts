import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { extractSessionCookie, getSessionAccount, getSessionRole } from '@/lib/server-auth';

// Mirror of the role-gating scheme in AuthGuard.tsx:
// /dashboard/** requires manager/admin, /technician/** requires technician/manager.
const DASHBOARD_ROLES = ['مدير', 'إداري'];
const TECHNICIAN_ROLES = ['فني', 'مدير'];

const UNAUTHORIZED_URL = '/unauthorized';

function redirectToLogin(request: NextRequest, pathname: string): NextResponse {
  const loginUrl = pathname.startsWith('/technician')
    ? new URL('/technician/login', request.url)
    : new URL('/login', request.url);
  loginUrl.searchParams.set('redirect', pathname);
  return NextResponse.redirect(loginUrl);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow login pages through unconditionally to prevent redirect loops
  if (pathname === '/login' || pathname === '/technician/login') {
    return NextResponse.next();
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

  const isDashboard = pathname.startsWith('/dashboard');
  const isTechnician = pathname.startsWith('/technician');

  // Valid session but wrong role for this area -> not permitted, not logged out.
  // Redirect to a clear unauthorized page (never to login, never into a loop).
  if (isDashboard && !DASHBOARD_ROLES.includes(role ?? '')) {
    return NextResponse.redirect(new URL(UNAUTHORIZED_URL, request.url));
  }
  if (isTechnician && !TECHNICIAN_ROLES.includes(role ?? '')) {
    return NextResponse.redirect(new URL(UNAUTHORIZED_URL, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/technician/:path*',
  ],
};