// src/app/api/employees/[id]/route.ts
// Server-side PATCH/DELETE for a single employee document.
// Uses node-appwrite with APPWRITE_API_KEY for the actual write so that the
// public Appwrite collection (read("users") only after the lock-down) can never
// be written from the browser directly.

import { NextRequest, NextResponse } from 'next/server';
import { Client, Databases, ID } from 'node-appwrite';
import {
  DATABASE_ID,
  EMPLOYEES_COLLECTION_ID,
  NOTIFICATIONS_COLLECTION_ID,
} from '@/lib/constants';
import { extractSessionCookie, getSessionAccount, getSessionRole } from '@/lib/server-auth';
import { checkRateLimit, sessionRateLimitKey } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_ROLES = ['مدير', 'إداري'];
const ROLE_VALUES = ['فني', 'مدير', 'إداري'];

function createApiKeyClient() {
  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
    .setKey(process.env.APPWRITE_API_KEY!);
  return { databases: new Databases(client) };
}

async function authenticate(request: NextRequest) {
  const sessionCookie = extractSessionCookie(request.cookies.getAll());
  if (!sessionCookie) {
    return { ok: false as const, response: NextResponse.json({ error: 'غير مصرح' }, { status: 401 }) };
  }
  const account = await getSessionAccount(sessionCookie);
  if (!account?.email) {
    return { ok: false as const, response: NextResponse.json({ error: 'غير مصرح' }, { status: 401 }) };
  }
  const role = await getSessionRole(sessionCookie, account.email);
  if (!role || !ALLOWED_ROLES.includes(role)) {
    return { ok: false as const, response: NextResponse.json({ error: 'غير مصرح' }, { status: 403 }) };
  }
  return { ok: true as const, session: { email: account.email, role, sessionCookie } };
}

// PATCH /api/employees/[id] — update an employee (manager/admin only).
// A user may never change their OWN role/status. Role changes by manager/admin
// are allowed for OTHER employees only and are audited in notifications.
export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await authenticate(request);
  if (!auth.ok) return auth.response;

  const { id: employeeId } = await context.params;
  if (!employeeId) {
    return NextResponse.json({ error: 'معرّف الموظف مفقود' }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'بيانات غير صالحة' }, { status: 400 });
  }

  const rateKey = sessionRateLimitKey(auth.session.email, 'employees-update');
  const rate = checkRateLimit(rateKey, { limit: 30, windowMs: 5 * 60 * 1000 });
  if (rate.limited) {
    return NextResponse.json({ error: 'طلبات كثيرة. حاول لاحقاً.' }, { status: 429 });
  }

  const { databases } = createApiKeyClient();

  try {
    const target = await databases.getDocument(DATABASE_ID, EMPLOYEES_COLLECTION_ID, employeeId);
    const targetEmail = (target as { email?: string }).email;

    // Block self-modification of role/status (privilege escalation).
    if (targetEmail === auth.session.email) {
      if (body.role !== undefined || body.status !== undefined || body.email !== undefined) {
        return NextResponse.json(
          { error: 'لا يمكنك تعديل الدور/الحالة/البريد الخاص بك. استخدم /api/employees/me للحقول الشخصية.' },
          { status: 403 }
        );
      }
    }

    // Role changes require an explicit manager/admin approver and never below
    // the caller's own privilege level.
    if (body.role !== undefined) {
      if (typeof body.role !== 'string' || !ROLE_VALUES.includes(body.role)) {
        return NextResponse.json({ error: 'قيمة دور غير صالحة' }, { status: 400 });
      }
      const previousRole = (target as { role?: string }).role ?? 'فني';
      if (previousRole === body.role) {
        delete body.role;
      } else {
        try {
          await databases.createDocument(DATABASE_ID, NOTIFICATIONS_COLLECTION_ID, ID.unique(), {
            type: 'تغيير_دور',
            message: `تم تغيير دور الموظف ${(target as { name?: string }).name ?? targetEmail} من "${previousRole}" إلى "${body.role}" بواسطة ${auth.session.email}`,
            relatedId: employeeId,
            employeeId: employeeId,
            employeeName: (target as { name?: string }).name ?? targetEmail,
            isRead: false,
          });
        } catch { /* audit log is best-effort */ }
      }
    }

    // Strip $-prefixed metadata keys.
    const cleanData: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(body)) {
      if (!key.startsWith('$')) cleanData[key] = value;
    }

    if (Object.keys(cleanData).length === 0) {
      const doc = await databases.getDocument(DATABASE_ID, EMPLOYEES_COLLECTION_ID, employeeId);
      return NextResponse.json(doc);
    }

    const updated = await databases.updateDocument(DATABASE_ID, EMPLOYEES_COLLECTION_ID, employeeId, cleanData);
    return NextResponse.json(updated);
  } catch (err) {
    const code = (err as { code?: number } | null)?.code;
    if (code === 404) return NextResponse.json({ error: 'الموظف غير موجود' }, { status: 404 });
    if (code === 401) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    console.error('خطأ في تحديث الموظف:', err);
    return NextResponse.json({ error: 'فشل تحديث الموظف' }, { status: 500 });
  }
}

// DELETE /api/employees/[id] — delete an employee (manager/admin only).
// A user may never delete themselves while they are logged in.
export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await authenticate(request);
  if (!auth.ok) return auth.response;

  const { id: employeeId } = await context.params;
  if (!employeeId) {
    return NextResponse.json({ error: 'معرّف الموظف مفقود' }, { status: 400 });
  }

  const rateKey = sessionRateLimitKey(auth.session.email, 'employees-delete');
  const rate = checkRateLimit(rateKey, { limit: 10, windowMs: 5 * 60 * 1000 });
  if (rate.limited) {
    return NextResponse.json({ error: 'طلبات كثيرة. حاول لاحقاً.' }, { status: 429 });
  }

  try {
    const { databases } = createApiKeyClient();
    const target = await databases.getDocument(DATABASE_ID, EMPLOYEES_COLLECTION_ID, employeeId);
    const targetEmail = (target as { email?: string }).email;

    if (targetEmail === auth.session.email) {
      return NextResponse.json({ error: 'لا يمكنك حذف حسابك الخاص أثناء تسجيل الدخول.' }, { status: 403 });
    }

    await databases.deleteDocument(DATABASE_ID, EMPLOYEES_COLLECTION_ID, employeeId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const code = (err as { code?: number } | null)?.code;
    if (code === 404) return NextResponse.json({ error: 'الموظف غير موجود' }, { status: 404 });
    if (code === 401) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    console.error('خطأ في حذف الموظف:', err);
    return NextResponse.json({ error: 'فشل حذف الموظف' }, { status: 500 });
  }
}