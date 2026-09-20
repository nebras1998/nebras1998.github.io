// src/app/api/files/route.ts
// Server-side file listing + upload for the REPORTS_BUCKET_ID storage bucket
// (مدير/إداري/فني only, node-appwrite Storage + API key).
// The bucket is locked down to read("users") only, so all writes must go
// through this route (or the report PDF approval route).

import { NextRequest, NextResponse } from 'next/server';
import { Client, Storage } from 'node-appwrite';
import { REPORTS_BUCKET_ID } from '@/lib/constants';
import { extractSessionCookie, getSessionAccount, getSessionRole } from '@/lib/server-auth';
import { checkRateLimit, sessionRateLimitKey } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_ROLES = ['مدير', 'إداري', 'فني'];
const MAX_FILE_SIZE = 15 * 1024 * 1024;

function createApiKeyClient() {
  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
    .setKey(process.env.APPWRITE_API_KEY!);
  return { storage: new Storage(client) };
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

// GET /api/files — list files in the reports bucket
export async function GET(request: NextRequest) {
  const auth = await authenticate(request);
  if (!auth.ok) return auth.response;

  try {
    const { storage } = createApiKeyClient();
    const result = await storage.listFiles(REPORTS_BUCKET_ID);
    return NextResponse.json(result);
  } catch (err) {
    console.error('خطأ في جلب الملفات:', err);
    return NextResponse.json({ error: 'فشل جلب الملفات' }, { status: 500 });
  }
}

// POST /api/files — upload a report PDF file (represents a test report)
export async function POST(request: NextRequest) {
  const auth = await authenticate(request);
  if (!auth.ok) return auth.response;

  const rateKey = sessionRateLimitKey(auth.session.email, 'files-upload');
  const rate = checkRateLimit(rateKey, { limit: 15, windowMs: 5 * 60 * 1000 });
  if (rate.limited) {
    return NextResponse.json({ error: 'طلبات كثيرة. حاول لاحقاً.' }, { status: 429 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'بيانات غير صالحة' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'الملف مفقود' }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'حجم الملف يتجاوز الحد المسموح (15MB)' }, { status: 400 });
  }

  try {
    const { storage } = createApiKeyClient();
    const uploaded = await storage.createFile(REPORTS_BUCKET_ID, 'unique()', file);
    return NextResponse.json(uploaded, { status: 201 });
  } catch (err) {
    console.error('خطأ في رفع الملف:', err);
    return NextResponse.json({ error: 'فشل رفع الملف' }, { status: 500 });
  }
}