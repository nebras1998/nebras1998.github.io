// src/app/api/employees/me/route.ts
// Self-service endpoint: a logged-in employee may update ONLY their own
// non-sensitive personal fields (phone, qualification, certifications,
// notes, name). Role / status / email can never be modified here — those
// are reserved for manager/admin via PATCH /api/employees/[id].

import { NextRequest, NextResponse } from 'next/server';
import { Client, Databases, Query } from 'node-appwrite';
import { DATABASE_ID, EMPLOYEES_COLLECTION_ID } from '@/lib/constants';
import { extractSessionCookie, getSessionAccount } from '@/lib/server-auth';
import { checkRateLimit, sessionRateLimitKey } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Explicit allow-list: the ONLY fields a user may update about themselves.
const ALLOWED_SELF_FIELDS = ['name', 'phone', 'qualification', 'certifications', 'notes'];

export async function PATCH(request: NextRequest) {
  const sessionCookie = extractSessionCookie(request.cookies.getAll());
  if (!sessionCookie) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  }

  const account = await getSessionAccount(sessionCookie);
  if (!account?.email) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  }

  const rateKey = sessionRateLimitKey(account.email, 'employees-me');
  const rate = checkRateLimit(rateKey, { limit: 10, windowMs: 5 * 60 * 1000 });
  if (rate.limited) {
    return NextResponse.json({ error: 'طلبات كثيرة. حاول لاحقاً.' }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'بيانات غير صالحة' }, { status: 400 });
  }

  // Reject any attempt to write role / status / email / employeeNumber.
  const blocked = Object.keys(body).filter(
    (k) => !ALLOWED_SELF_FIELDS.includes(k)
  );
  if (blocked.length > 0) {
    return NextResponse.json(
      { error: `الحقول غير مسموحة للتعديل الذاتي: ${blocked.join(', ')}` },
      { status: 403 }
    );
  }

  try {
    const client = new Client()
      .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
      .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
      .setKey(process.env.APPWRITE_API_KEY!);
    const databases = new Databases(client);

    const res = await databases.listDocuments(DATABASE_ID, EMPLOYEES_COLLECTION_ID, [
      Query.equal('email', account.email),
      Query.limit(1),
      Query.select(['$id']),
    ]);
    const target = res.documents[0] as { $id: string } | undefined;
    if (!target) {
      return NextResponse.json({ error: 'سجل الموظف غير موجود' }, { status: 404 });
    }

    const cleanData: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(body)) {
      if (!key.startsWith('$')) cleanData[key] = value;
    }
    if (Object.keys(cleanData).length === 0) {
      return NextResponse.json({ ok: true });
    }

    const updated = await databases.updateDocument(DATABASE_ID, EMPLOYEES_COLLECTION_ID, target.$id, cleanData);
    return NextResponse.json(updated);
  } catch (err) {
    console.error('خطأ في تحديث بياناتي:', err);
    return NextResponse.json({ error: 'فشل تحديث البيانات' }, { status: 500 });
  }
}