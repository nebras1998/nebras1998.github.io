// src/app/api/clients/[id]/route.ts
// Server-side PATCH/DELETE for a single client (مدير/إداري only).

import { NextRequest, NextResponse } from 'next/server';
import { Client, Databases, Query } from 'node-appwrite';
import {
  DATABASE_ID,
  CLIENTS_COLLECTION_ID,
  PROJECTS_COLLECTION_ID,
  SAMPLES_COLLECTION_ID,
  INVOICES_COLLECTION_ID,
} from '@/lib/constants';
import { extractSessionCookie, getSessionAccount, getSessionRole } from '@/lib/server-auth';

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

async function isAuthorized(request: NextRequest) {
  const sessionCookie = extractSessionCookie(request.cookies.getAll());
  if (!sessionCookie) return false;
  const account = await getSessionAccount(sessionCookie);
  if (!account?.email) return false;
  const role = await getSessionRole(sessionCookie, account.email);
  return role !== null && ALLOWED_ROLES.includes(role);
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
  }
  const { id } = await context.params;

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
  if (Object.keys(cleanData).length === 0) {
    return NextResponse.json({ error: 'لا توجد حقول للتحديث' }, { status: 400 });
  }

  try {
    const { databases } = createApiKeyClient();
    const updated = await databases.updateDocument(DATABASE_ID, CLIENTS_COLLECTION_ID, id, cleanData);
    return NextResponse.json(updated);
  } catch (err) {
    const code = (err as { code?: number } | null)?.code;
    if (code === 404) return NextResponse.json({ error: 'العميل غير موجود' }, { status: 404 });
    console.error('خطأ في تحديث العميل:', err);
    return NextResponse.json({ error: 'فشل تحديث العميل' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
  }
  const { id } = await context.params;

  try {
    const { databases } = createApiKeyClient();
    const [projects, samples, invoices] = await Promise.all([
      databases.listDocuments(DATABASE_ID, PROJECTS_COLLECTION_ID, [Query.equal('clientId', id), Query.limit(1)]),
      databases.listDocuments(DATABASE_ID, SAMPLES_COLLECTION_ID, [Query.equal('clientId', id), Query.limit(1)]),
      databases.listDocuments(DATABASE_ID, INVOICES_COLLECTION_ID, [Query.equal('clientId', id), Query.limit(1)]),
    ]);
    if (projects.total > 0) {
      return NextResponse.json({ error: `لا يمكن حذف العميل لأن لديه ${projects.total} مشروع/مشاريع مرتبطة` }, { status: 409 });
    }
    if (samples.total > 0) {
      return NextResponse.json({ error: `لا يمكن حذف العميل لأن لديه ${samples.total} عينة مرتبطة` }, { status: 409 });
    }
    if (invoices.total > 0) {
      return NextResponse.json({ error: `لا يمكن حذف العميل لأن لديه ${invoices.total} فاتورة مرتبطة` }, { status: 409 });
    }
    await databases.deleteDocument(DATABASE_ID, CLIENTS_COLLECTION_ID, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const code = (err as { code?: number } | null)?.code;
    if (code === 404) return NextResponse.json({ error: 'العميل غير موجود' }, { status: 404 });
    console.error('خطأ في حذف العميل:', err);
    return NextResponse.json({ error: 'فشل حذف العميل' }, { status: 500 });
  }
}
