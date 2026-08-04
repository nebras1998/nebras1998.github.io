import { NextRequest, NextResponse } from 'next/server';
import { getDashboardStats } from '@/lib/services/dashboard-stats';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const sessionCookie = request.cookies
    .getAll()
    .filter((c) => c.name.startsWith('a_session_'))
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');

  if (!sessionCookie) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  }

  try {
    const data = await getDashboardStats(sessionCookie);
    return NextResponse.json(data);
  } catch (err) {
    const code = (err as { code?: number } | null)?.code;
    if (code === 401) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }
    console.error('خطأ في حساب إحصائيات لوحة التحكم:', err);
    return NextResponse.json({ error: 'فشل تحميل الإحصائيات' }, { status: 500 });
  }
}
