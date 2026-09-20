// src/app/api/attendance/route.ts
// Server-side GET/POST for the attendance collection (مدير/إداري/فني only).
// The attendance collection is locked down to read("users") only.

import { NextRequest, NextResponse } from 'next/server';
import { Client, Databases, ID, Query } from 'node-appwrite';
import { DATABASE_ID, ATTENDANCE_COLLECTION_ID } from '@/lib/constants';
import { extractSessionCookie, getSessionAccount, getSessionRole } from '@/lib/server-auth';
import { checkRateLimit, sessionRateLimitKey } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_ROLES = ['مدير', 'إداري', 'فني'];

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

// GET /api/attendance — list attendance records (مدير/إداري/فني)
export async function GET(request: NextRequest) {
  const auth = await authenticate(request);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const queries: string[] = [];
  searchParams.forEach((value, key) => {
    if (key !== 'path') queries.push(value);
  });

  try {
    const { databases } = createApiKeyClient();
    const page = await databases.listDocuments(DATABASE_ID, ATTENDANCE_COLLECTION_ID, [
      ...queries.map((q) => {
        try { return JSON.parse(q) as ReturnType<typeof Query.equal>; } catch { return q; }
      }),
      Query.limit(200),
    ]);
    return NextResponse.json({ documents: page.documents, total: page.total });
  } catch (err) {
    console.error('خطأ في جلب الحضور:', err);
    return NextResponse.json({ error: 'فشل جلب الحضور' }, { status: 500 });
  }
}

// POST /api/attendance — create an attendance record (مدير/إداري/فني)
export async function POST(request: NextRequest) {
  const auth = await authenticate(request);
  if (!auth.ok) return auth.response;

  const rateKey = sessionRateLimitKey(auth.session.email, 'attendance-create');
  const rate = checkRateLimit(rateKey, { limit: 30, windowMs: 5 * 60 * 1000 });
  if (rate.limited) {
    return NextResponse.json({ error: 'طلبات كثيرة. حاول لاحقاً.' }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'بيانات غير صالحة' }, { status: 400 });
  }

  const cleanData: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (!key.startsWith('$') && key !== 'documentId') cleanData[key] = value;
  }

  try {
    const { databases } = createApiKeyClient();
    const doc = await databases.createDocument(DATABASE_ID, ATTENDANCE_COLLECTION_ID, ID.unique(), cleanData);
    return NextResponse.json(doc, { status: 201 });
  } catch (err) {
    const code = (err as { code?: number } | null)?.code;
    if (code === 409) return NextResponse.json({ error: 'رقم سجل الحضور موجود بالفعل' }, { status: 409 });
    console.error('خطأ في إنشاء سجل الحضور:', err);
    return NextResponse.json({ error: 'فشل إنشاء سجل الحضور' }, { status: 500 });
  }
}