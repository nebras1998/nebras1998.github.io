import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const sessionCookie = request.cookies.get(
    `a_session_${process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID}`
  );

  // ✅ السماح بمرور صفحة تفاصيل العينة بدون مصادقة (لإظهار شاشة الاختيار)
  if (pathname.startsWith('/dashboard/samples')) {
    return NextResponse.next();
  }

  // السماح بمرور مسارات الفنيين
  if (pathname.startsWith('/technician')) {
    return NextResponse.next();
  }

  // السماح بمرور صفحة تسجيل الدخول
  if (pathname === '/login') {
    return NextResponse.next();
  }

  // أي مسار آخر في dashboard يتطلب جلسة
  if (pathname.startsWith('/dashboard') && !sessionCookie) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/technician/:path*'],
};