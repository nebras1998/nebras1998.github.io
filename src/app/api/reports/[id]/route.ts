// src/app/api/reports/[id]/route.ts
// Server-side editing of a report DRAFT only (status === "مسودة").
// Editing an approved report is refused; converting a report to "معتمد" and
// writing reportHash/pdfFileId is ONLY possible via the PDF approval route
// at src/app/api/reports/[id]/pdf/route.ts.

import { NextRequest, NextResponse } from 'next/server';
import { Client, Databases } from 'node-appwrite';
import { DATABASE_ID, REPORTS_COLLECTION_ID } from '@/lib/constants';
import { extractSessionCookie, getSessionAccount, getSessionRole } from '@/lib/server-auth';
import { checkRateLimit, sessionRateLimitKey } from '@/lib/rate-limit';
import type { Report } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_ROLES = ['مدير', 'إداري'];

// Fields a draft may be edited with. Approval/lock fields are explicitly
// excluded so no other route can ever forge an approved report.
const DRAFT_EDITABLE_FIELDS = ['additionalNotes', 'snapshotData'];

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
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

  const { id: reportId } = await context.params;
  if (!reportId) {
    return NextResponse.json({ error: 'معرّف التقرير مفقود' }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'بيانات غير صالحة' }, { status: 400 });
  }

  const rateKey = sessionRateLimitKey(account.email, 'reports-update');
  const rate = checkRateLimit(rateKey, { limit: 30, windowMs: 5 * 60 * 1000 });
  if (rate.limited) {
    return NextResponse.json({ error: 'طلبات كثيرة. حاول لاحقاً.' }, { status: 429 });
  }

  // Only the listed draft fields are writable here.
  const blocked = Object.keys(body).filter((k) => !DRAFT_EDITABLE_FIELDS.includes(k));
  if (blocked.length > 0) {
    return NextResponse.json(
      { error: `الحقول غير مسموح بتعديلها من هذا المسار: ${blocked.join(', ')}` },
      { status: 403 }
    );
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

    const report = (await databases.getDocument(DATABASE_ID, REPORTS_COLLECTION_ID, reportId)) as unknown as Report;
    if (report.status === 'معتمد') {
      return NextResponse.json({ error: 'التقرير مُعتمد ومُقفل. لا يمكن تعديله.' }, { status: 409 });
    }
    if (report.status !== 'مسودة') {
      return NextResponse.json({ error: 'حالة التقرير غير صالحة للتعديل' }, { status: 400 });
    }

    const cleanData: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(body)) {
      if (!key.startsWith('$')) cleanData[key] = value;
    }
    if (Object.keys(cleanData).length === 0) {
      return NextResponse.json(report);
    }

    const updated = await databases.updateDocument(DATABASE_ID, REPORTS_COLLECTION_ID, reportId, cleanData);
    return NextResponse.json(updated);
  } catch (err) {
    const code = (err as { code?: number } | null)?.code;
    if (code === 404) return NextResponse.json({ error: 'التقرير غير موجود' }, { status: 404 });
    if (code === 401) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    console.error('خطأ في تحديث مسودة التقرير:', err);
    return NextResponse.json({ error: 'فشل تحديث التقرير' }, { status: 500 });
  }
}