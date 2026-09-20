// src/app/api/files/[id]/route.ts
// Server-side DELETE of a single file in the reports bucket (مدير/إداري/فني only).

import { NextRequest, NextResponse } from 'next/server';
import { Client, Storage } from 'node-appwrite';
import { REPORTS_BUCKET_ID } from '@/lib/constants';
import { extractSessionCookie, getSessionAccount, getSessionRole } from '@/lib/server-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_ROLES = ['مدير', 'إداري', 'فني'];

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

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
  }
  const { id } = await context.params;

  try {
    const { storage } = createApiKeyClient();
    await storage.deleteFile(REPORTS_BUCKET_ID, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const code = (err as { code?: number } | null)?.code;
    if (code === 404) return NextResponse.json({ error: 'الملف غير موجود' }, { status: 404 });
    console.error('خطأ في حذف الملف:', err);
    return NextResponse.json({ error: 'فشل حذف الملف' }, { status: 500 });
  }
}