import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // إذا كان المسار يبدأ بـ /technician، نسمح بالمرور (التحقق سيكون داخل الصفحة)
  if (pathname.startsWith('/technician')) {
    return NextResponse.next();
  }

  // أي مسار آخر نتركه يمر بشكل طبيعي
  return NextResponse.next();
}

export const config = {
  matcher: ['/technician/:path*'],
};