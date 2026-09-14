// src/app/api/finance/payments/route.ts
// Server-side creation of payments (مدير/إداري only, node-appwrite + API key).
// The payments collection is locked down to read("users") only.

import { NextRequest, NextResponse } from 'next/server';
import { Client, Databases, ID } from 'node-appwrite';
import { DATABASE_ID, PAYMENTS_COLLECTION_ID } from '@/lib/constants';
import { extractSessionCookie, getSessionAccount, getSessionRole } from '@/lib/server-auth';
import { checkRateLimit, sessionRateLimitKey } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_ROLES = ['مدير', 'إداري'];

export async function POST(request: NextRequest) {
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

  const rateKey = sessionRateLimitKey(account.email, 'payments-create');
  const rate = checkRateLimit(rateKey, { limit: 20, windowMs: 5 * 60 * 1000 });
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
    if (!key.startsWith('$')) cleanData[key] = value;
  }

  const apiKey = process.env.APPWRITE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'خادم غير مكوّن' }, { status: 503 });
  }

  try {
    const client = new Client()
      .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
      .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
      .setKey(apiKey);
    const databases = new Databases(client);
    const doc = await databases.createDocument(DATABASE_ID, PAYMENTS_COLLECTION_ID, ID.unique(), cleanData);
    return NextResponse.json(doc, { status: 201 });
  } catch (err) {
    console.error('خطأ في إنشاء الدفعة:', err);
    return NextResponse.json({ error: 'فشل إنشاء الدفعة' }, { status: 500 });
  }
}