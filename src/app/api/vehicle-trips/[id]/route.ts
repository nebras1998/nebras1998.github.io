// src/app/api/vehicle-trips/[id]/route.ts
// Server-side PATCH/DELETE for a single vehicle trip (مدير/إداري/فني only).

import { NextRequest, NextResponse } from 'next/server';
import { Client, Databases } from 'node-appwrite';
import { DATABASE_ID, VEHICLE_TRIPS_COLLECTION_ID } from '@/lib/constants';
import { extractSessionCookie, getSessionAccount, getSessionRole } from '@/lib/server-auth';

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
    const updated = await databases.updateDocument(DATABASE_ID, VEHICLE_TRIPS_COLLECTION_ID, id, cleanData);
    return NextResponse.json(updated);
  } catch (err) {
    const code = (err as { code?: number } | null)?.code;
    if (code === 404) return NextResponse.json({ error: 'الرحلة غير موجودة' }, { status: 404 });
    console.error('خطأ في تحديث الرحلة:', err);
    return NextResponse.json({ error: 'فشل تحديث الرحلة' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
  }
  const { id } = await context.params;

  try {
    const { databases } = createApiKeyClient();
    await databases.deleteDocument(DATABASE_ID, VEHICLE_TRIPS_COLLECTION_ID, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const code = (err as { code?: number } | null)?.code;
    if (code === 404) return NextResponse.json({ error: 'الرحلة غير موجودة' }, { status: 404 });
    console.error('خطأ في حذف الرحلة:', err);
    return NextResponse.json({ error: 'فشل حذف الرحلة' }, { status: 500 });
  }
}