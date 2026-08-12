import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { DATABASE_ID, EMPLOYEES_COLLECTION_ID } from '@/lib/constants';

const APPWRITE_ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';

// Mirror of the role-gating scheme in AuthGuard.tsx:
// /dashboard/** requires manager/admin, /technician/** requires technician/manager.
const DASHBOARD_ROLES = ['مدير', 'إداري'];
const TECHNICIAN_ROLES = ['فني', 'مدير'];

const UNAUTHORIZED_URL = '/unauthorized';

async function fetchAccount(sessionCookie: string): Promise<{ email: string } | null> {
  try {
    const res = await fetch(`${APPWRITE_ENDPOINT}/account`, {
      headers: {
        Cookie: sessionCookie,
        'X-Appwrite-Project': process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!,
      },
    });
    if (!res.ok) return null;
    return (await res.json()) as { email: string };
  } catch {
    return null;
  }
}

async function fetchEmployeeRole(sessionCookie: string, email: string): Promise<string | null> {
  try {
    const query = JSON.stringify({ method: 'equal', attribute: 'email', values: [email] });
    const url = new URL(
      `${APPWRITE_ENDPOINT}/databases/${DATABASE_ID}/collections/${EMPLOYEES_COLLECTION_ID}/documents`
    );
    // Same query serialization the Appwrite web SDK uses (queries[0], ...)
    url.searchParams.append('queries[0]', query);
    url.searchParams.append('limit', '1');

    const res = await fetch(url.toString(), {
      headers: {
        Cookie: sessionCookie,
        'X-Appwrite-Project': process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!,
      },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { documents?: Array<{ role?: string }> };
    return data.documents?.[0]?.role ?? null;
  } catch {
    return null;
  }
}

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

  const allCookies = request.cookies.getAll();
  const sessionCookie = allCookies
    .filter(c => c.name.startsWith('a_session_'))
    .map(c => `${c.name}=${c.value}`)
    .join('; ');

  if (!sessionCookie) {
    return redirectToLogin(request, pathname);
  }

  const account = await fetchAccount(sessionCookie);
  if (!account?.email) {
    return redirectToLogin(request, pathname);
  }

  // The role source of truth is the same employee record AuthGuard reads client-side.
  const role = await fetchEmployeeRole(sessionCookie, account.email);

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
