// src/app/api/employees/route.ts
// Server-side CRUD for employees collection. All writes go through node-appwrite
// with APPWRITE_API_KEY, so the public Appwrite collection permissions (read-only
// for users) cannot be bypassed from the browser.

import { NextRequest, NextResponse } from 'next/server';
import { Client, Databases, Query } from 'node-appwrite';
import {
  DATABASE_ID,
  EMPLOYEES_COLLECTION_ID,
} from '@/lib/constants';
import { extractSessionCookie, getSessionAccount, getSessionRole } from '@/lib/server-auth';
import { checkRateLimit, sessionRateLimitKey } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_ROLES = ['مدير', 'إداري'];

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

// GET /api/employees — list employees (manager/admin only)
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
    const page = await databases.listDocuments(DATABASE_ID, EMPLOYEES_COLLECTION_ID, [
      ...queries.map((q) => {
        try { return JSON.parse(q) as ReturnType<typeof Query.equal>; } catch { return q; }
      }),
      Query.limit(200),
    ]);
    return NextResponse.json({ documents: page.documents, total: page.total });
  } catch (err) {
    console.error('خطأ في جلب الموظفين:', err);
    return NextResponse.json({ error: 'فشل جلب الموظفين' }, { status: 500 });
  }
}

// POST /api/employees — create employee (manager/admin only)
export async function POST(request: NextRequest) {
  const auth = await authenticate(request);
  if (!auth.ok) return auth.response;

  const rateKey = sessionRateLimitKey(auth.session.email, 'employees-create');
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

  const documentId = body.documentId as string;
  if (!documentId) {
    return NextResponse.json({ error: 'رقم الموظف مفقود' }, { status: 400 });
  }

  // Only manager/admin can set role on creation
  const roleValue = body.role as string | undefined;
  if (roleValue && !ALLOWED_ROLES.includes(roleValue) && roleValue !== 'فني') {
    return NextResponse.json({ error: 'دور غير صالح' }, { status: 400 });
  }

  // Strip $-prefixed metadata keys
  const cleanData: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (!key.startsWith('$') && key !== 'documentId') cleanData[key] = value;
  }

  try {
    const { databases } = createApiKeyClient();
    const doc = await databases.createDocument(DATABASE_ID, EMPLOYEES_COLLECTION_ID, documentId, cleanData);
    return NextResponse.json(doc, { status: 201 });
  } catch (err) {
    const code = (err as { code?: number } | null)?.code;
    if (code === 409) return NextResponse.json({ error: 'رقم الموظف موجود بالفعل' }, { status: 409 });
    console.error('خطأ في إنشاء الموظف:', err);
    return NextResponse.json({ error: 'فشل إنشاء الموظف' }, { status: 500 });
  }
}
