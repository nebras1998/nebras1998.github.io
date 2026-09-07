import { NextRequest, NextResponse } from 'next/server';
import { getDashboardStats } from '@/lib/services/dashboard-stats';
import { extractSessionCookie, getSessionAccount, getSessionRole } from '@/lib/server-auth';

export const dynamic = 'force-dynamic';

// العودة 401 للموظفين غير المسموح لهم بدور "مدير/إداري".
// هذه الإحصائيات تشمل بيانات مالية (paidAmount للفواتير) فلا بد من فحص الدور
// خادمًا وليس فقط وجود كعكة جلسة صالحة.
const ALLOWED_ROLES = ['مدير', 'إداري'];

export async function GET(request: NextRequest) {
  const sessionCookie = extractSessionCookie(request.cookies.getAll());

  if (!sessionCookie) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  }

  const account = await getSessionAccount(sessionCookie);
  if (!account?.email) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  }

  const role = await getSessionRole(sessionCookie, account.email);
  if (!ALLOWED_ROLES.includes(role ?? '')) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
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
