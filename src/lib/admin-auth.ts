// src/lib/admin-auth.ts
// تحقق خادمي مشترك لمسارات النسخ الاحتياطي الحساسة: يتطلب جلسة صالحة
// لدور "مدير/إداري" + فحص أصل الطلب (Origin) للحماية من CSRF.
//
// ملاحظة: كعكات الجلسة تُرسل بسمة SameSite=Strict عبر api/auth/session،
// لذا فلن تُرفق كعكة الجلسة أصلاً في الطلب العابر للمواقع؛ فحص Origin
// أدناه طبقة دفاع إضافية للمسارات المدمرة.

import { NextRequest, NextResponse } from 'next/server';
import { extractSessionCookie, getSessionAccount, getSessionRole } from '@/lib/server-auth';

const ALLOWED_ROLES = ['مدير', 'إداري'];

export interface AdminSession {
  email: string;
  role: string;
  sessionCookie: string;
}

export type AdminGuardResult =
  | { ok: true; session: AdminSession }
  | { ok: false; response: NextResponse };

export async function requireAdmin(request: NextRequest): Promise<AdminGuardResult> {
  const sessionCookie = extractSessionCookie(request.cookies.getAll());
  if (!sessionCookie) {
    return { ok: false, response: NextResponse.json({ error: 'غير مصرح' }, { status: 401 }) };
  }
  const account = await getSessionAccount(sessionCookie);
  if (!account?.email) {
    return { ok: false, response: NextResponse.json({ error: 'غير مصرح' }, { status: 401 }) };
  }
  const role = await getSessionRole(sessionCookie, account.email);
  if (!role || !ALLOWED_ROLES.includes(role)) {
    return { ok: false, response: NextResponse.json({ error: 'غير مصرح' }, { status: 403 }) };
  }
  return { ok: true, session: { email: account.email, role, sessionCookie } };
}

// فحص أصل الطلب: يقبل الطلب الذي يأتي من نفس المضيف الذي استضافه الخادم
// أو من النطاق العام المكوّن (APP_PUBLIC_URL) في الإنتاج.
export function isTrustedOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  const host = request.headers.get('host');
  if (!host) return false;

  const publicBase = process.env.APP_PUBLIC_URL;
  if (publicBase) {
    try {
      if (new URL(origin).toString().replace(/\/$/, '') === publicBase.replace(/\/$/, '')) return true;
    } catch {
      // تجاهل وتراجع للمقارنة بالمضيف
    }
  }

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}