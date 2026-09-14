// src/app/api/reports/route.ts
// Server-side creation of report drafts. The reports collection is locked down
// to read("users") after the fix, so draft creation must use node-appwrite +
// APPWRITE_API_KEY. Only the draft (status "مسودة") may be created here — the
// final approval (status "معتمد" + reportHash + pdfFileId) happens ONLY in
// src/app/api/reports/[id]/pdf/route.ts.

import { NextRequest, NextResponse } from 'next/server';
import { Client, Databases, ID } from 'node-appwrite';
import { DATABASE_ID, REPORTS_COLLECTION_ID } from '@/lib/constants';
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

  const rateKey = sessionRateLimitKey(account.email, 'reports-create');
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

  const testId = typeof body.testId === 'string' ? body.testId : '';
  const reportNumber = typeof body.reportNumber === 'string' ? body.reportNumber : '';
  const snapshotData = typeof body.snapshotData === 'string' ? body.snapshotData : '';

  if (!testId || !reportNumber) {
    return NextResponse.json({ error: 'testId و reportNumber مطلوبان' }, { status: 400 });
  }

  // Drafts only. Approval fields are written exclusively by the PDF route.
  const data: Record<string, unknown> = {
    testId,
    reportNumber,
    status: 'مسودة',
    snapshotData,
  };

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
    const doc = await databases.createDocument(DATABASE_ID, REPORTS_COLLECTION_ID, ID.unique(), data);
    return NextResponse.json(doc, { status: 201 });
  } catch (err) {
    const code = (err as { code?: number } | null)?.code;
    if (code === 401) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    console.error('خطأ في إنشاء مسودة التقرير:', err);
    return NextResponse.json({ error: 'فشل إنشاء التقرير' }, { status: 500 });
  }
}