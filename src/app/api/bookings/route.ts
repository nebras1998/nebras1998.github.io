// src/app/api/bookings/route.ts
// Server-side GET/POST for bookings (dashboard, manager/admin only) plus status
// update + delete in [id]/route.ts. The PUBLIC create path stays exclusively at
// /api/portal/book — this POST is the authenticated manager/admin dashboard
// create (sequential bookingNumber), it is NOT a duplicate public endpoint.

import { NextRequest, NextResponse } from 'next/server';
import { Client, Databases, Query } from 'node-appwrite';
import { DATABASE_ID, BOOKINGS_COLLECTION_ID } from '@/lib/constants';
import { extractSessionCookie, getSessionAccount, getSessionRole } from '@/lib/server-auth';
import { getAppwriteServerEnv, missingEnvError } from '@/lib/appwrite-env';
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

// POST /api/bookings — create a booking from the dashboard (director/employee only).
export async function POST(request: NextRequest) {
  const auth = await authenticate(request);
  if (!auth.ok) return auth.response;

  const rateKey = sessionRateLimitKey(auth.session.email, 'bookings-create');
  const rate = checkRateLimit(rateKey, { limit: 15, windowMs: 5 * 60 * 1000 });
  if (rate.limited) {
    return NextResponse.json({ error: 'طلبات كثيرة. حاول لاحقاً.' }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'بيانات غير صالحة' }, { status: 400 });
  }

  const documentId = typeof body.documentId === 'string' ? body.documentId : '';
  if (!documentId) {
    return NextResponse.json({ error: 'رقم الحجز مفقود' }, { status: 400 });
  }

  const cleanData: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (!key.startsWith('$') && key !== 'documentId') cleanData[key] = value;
  }

  try {
    const { databases } = createApiKeyClient();
    const doc = await databases.createDocument(DATABASE_ID, BOOKINGS_COLLECTION_ID, documentId, cleanData);
    return NextResponse.json(doc, { status: 201 });
  } catch (err) {
    const code = (err as { code?: number } | null)?.code;
    if (code === 409) return NextResponse.json({ error: 'رقم الحجز موجود بالفعل' }, { status: 409 });
    console.error('خطأ في إنشاء الحجز:', err);
    return NextResponse.json({ error: 'فشل إنشاء الحجز' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const auth = await authenticate(request);
  if (!auth.ok) return auth.response;

  const { env, missing } = getAppwriteServerEnv();
  if (missing.length > 0) {
    return NextResponse.json(missingEnvError(missing), { status: 503 });
  }
  const { endpoint, project, apiKey } = env!;

  const { searchParams } = new URL(request.url);
  const queries: string[] = [];
  const search = searchParams.get('search');
  if (search) {
    queries.push(Query.search('clientName', search));
  }
  const limit = searchParams.get('limit');
  if (limit) {
    queries.push(Query.limit(Number(limit)));
  }
  const offset = searchParams.get('offset');
  if (offset) {
    queries.push(Query.offset(Number(offset)));
  }
  const orderAttrs = searchParams.getAll('order');
  for (const raw of orderAttrs) {
    const desc = raw.startsWith('-');
    const attr = desc ? raw.slice(1) : raw;
    queries.push(desc ? Query.orderDesc(attr) : Query.orderAsc(attr));
  }

  try {
    const client = new Client()
      .setEndpoint(endpoint)
      .setProject(project)
      .setKey(apiKey);
    const databases = new Databases(client);
    const res = await databases.listDocuments(DATABASE_ID, BOOKINGS_COLLECTION_ID, queries);
    return NextResponse.json(res);
  } catch (err) {
    console.error('خطأ في جلب الحجوزات:', err);
    return NextResponse.json({ error: 'فشل جلب الحجوزات' }, { status: 500 });
  }
}
