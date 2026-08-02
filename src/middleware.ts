import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const APPWRITE_ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';

async function validateSession(sessionCookie: string): Promise<boolean> {
  try {
    const res = await fetch(`${APPWRITE_ENDPOINT}/account`, {
      headers: {
        Cookie: sessionCookie,
        'X-Appwrite-Project': process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!,
      },
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
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
    const loginUrl = pathname.startsWith('/technician')
      ? new URL('/technician/login', request.url)
      : new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const isValid = await validateSession(sessionCookie);
  if (!isValid) {
    const loginUrl = pathname.startsWith('/technician')
      ? new URL('/technician/login', request.url)
      : new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/technician/:path*',
  ],
};
