// src/app/api/notifications/route.ts
// Server-side CRUD for notifications (مدير/إداري/فني only, node-appwrite + API key).

import { NextRequest, NextResponse } from 'next/server';
import { Client, Databases, ID } from 'node-appwrite';
import { DATABASE_ID, NOTIFICATIONS_COLLECTION_ID } from '@/lib/constants';
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

// GET /api/notifications — list notifications
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
    const page = await databases.listDocuments(DATABASE_ID, NOTIFICATIONS_COLLECTION_ID, [
      ...queries.map((q) => {
        try { return JSON.parse(q) as ReturnType<typeof import('node-appwrite').Query.equal>; } catch { return q; }
      }),
    ]);
    return NextResponse.json({ documents: page.documents, total: page.total });
  } catch (err) {
    console.error('خطأ في جلب التنبيهات:', err);
    return NextResponse.json({ error: 'فشل جلب التنبيهات' }, { status: 500 });
  }
}

// POST /api/notifications — create notification
export async function POST(request: NextRequest) {
  const auth = await authenticate(request);
  if (!auth.ok) return auth.response;

  const rateKey = sessionRateLimitKey(auth.session.email, 'notifications-create');
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
  cleanData.isRead = false;

  try {
    const { databases } = createApiKeyClient();
    const doc = await databases.createDocument(DATABASE_ID, NOTIFICATIONS_COLLECTION_ID, ID.unique(), cleanData);
    return NextResponse.json(doc, { status: 201 });
  } catch (err) {
    console.error('خطأ في إنشاء التنبيه:', err);
    return NextResponse.json({ error: 'فشل إنشاء التنبيه' }, { status: 500 });
  }
}