// src/app/api/settings/report-template/logo/route.ts
// Server-side logo upload/delete for the report template (مدير/إداري only).
// The REPORTS_BUCKET_ID bucket is locked down to read("users") only, so logo
// writes must go through node-appwrite Storage + APPWRITE_API_KEY.

import { NextRequest, NextResponse } from 'next/server';
import { Client, Storage } from 'node-appwrite';
import { REPORTS_BUCKET_ID } from '@/lib/constants';
import { extractSessionCookie, getSessionAccount, getSessionRole } from '@/lib/server-auth';
import { checkRateLimit, sessionRateLimitKey } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_ROLES = ['مدير', 'إداري'];
const MAX_LOGO_SIZE = 2 * 1024 * 1024;
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];

function createApiKeyClient() {
  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
    .setKey(process.env.APPWRITE_API_KEY!);
  return { storage: new Storage(client) };
}

async function isAuthorized(request: NextRequest) {
  const sessionCookie = extractSessionCookie(request.cookies.getAll());
  if (!sessionCookie) return false;
  const account = await getSessionAccount(sessionCookie);
  if (!account?.email) return false;
  const role = await getSessionRole(sessionCookie, account.email);
  return role !== null && ALLOWED_ROLES.includes(role);
}

// POST /api/settings/report-template/logo — upload the logo (multipart)
export async function POST(request: NextRequest) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
  }

  const sessionCookie = extractSessionCookie(request.cookies.getAll());
  const account = await getSessionAccount(sessionCookie);
  const rate = checkRateLimit(sessionRateLimitKey(account?.email ?? 'unknown', 'logo-upload'), { limit: 10, windowMs: 5 * 60 * 1000 });
  if (rate.limited) {
    return NextResponse.json({ error: 'طلبات كثيرة. حاول لاحقاً.' }, { status: 429 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'بيانات غير صالحة' }, { status: 400 });
  }

  const logo = formData.get('logo');
  if (!(logo instanceof File)) {
    return NextResponse.json({ error: 'الشعار مفقود' }, { status: 400 });
  }
  if (logo.size > MAX_LOGO_SIZE) {
    return NextResponse.json({ error: 'حجم الشعار يتجاوز الحد المسموح (2MB)' }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(logo.type)) {
    return NextResponse.json({ error: 'نوع الملف غير مدعوم. استخدم PNG أو JPG أو WEBP أو SVG' }, { status: 400 });
  }

  try {
    const { storage } = createApiKeyClient();
    const uploaded = await storage.createFile(REPORTS_BUCKET_ID, 'unique()', logo);
    return NextResponse.json({ $id: uploaded.$id }, { status: 201 });
  } catch (err) {
    console.error('خطأ في رفع الشعار:', err);
    return NextResponse.json({ error: 'فشل رفع الشعار' }, { status: 500 });
  }
}

// DELETE /api/settings/report-template/logo?id=<fileId> — delete the logo
export async function DELETE(request: NextRequest) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
  }
  const fileId = new URL(request.url).searchParams.get('id');
  if (!fileId) {
    return NextResponse.json({ error: 'معرّف الشعار مفقود' }, { status: 400 });
  }

  try {
    const { storage } = createApiKeyClient();
    await storage.deleteFile(REPORTS_BUCKET_ID, fileId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const code = (err as { code?: number } | null)?.code;
    if (code === 404) return NextResponse.json({ error: 'الشعار غير موجود' }, { status: 404 });
    console.error('خطأ في حذف الشعار:', err);
    return NextResponse.json({ error: 'فشل حذف الشعار' }, { status: 500 });
  }
}