// src/app/api/admin/backup/reset/route.ts
// إعادة تعيين النظام: حذف جميع مستندات المجموعات + ملفات التخزين عبر مفتاح API
// الخادم. كان الحذف يتم من المتصفح مباشرة (databases.deleteDocument خطوة بخطوة)،
// ما يجعل أي صلاحية حذف مكشوفة لدور "مدير" كافية لتدمير البيانات؛ الآن يشترط
// جلسة صالحة بدور "مدير/إداري" + عبارة التأكيد نصيًا خادمًا + فحص Origin +
// معدَّل منخفض جدًا (محاولتان في الساعة).

import { NextRequest, NextResponse } from 'next/server';
import { Client, Databases, Storage, Query } from 'node-appwrite';

import { DATABASE_ID, REPORTS_BUCKET_ID } from '@/lib/constants';
import { requireAdmin, isTrustedOrigin } from '@/lib/admin-auth';
import { getAppwriteServerEnv, missingEnvError } from '@/lib/appwrite-env';
import { checkRateLimit, sessionRateLimitKey } from '@/lib/rate-limit';
import { ALL_COLLECTION_IDS } from '@/lib/backup-catalog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RESET_WINDOW_MS = 60 * 60 * 1000;
const RESET_LIMIT = 2;
const RESET_PHRASE = 'حذف كل البيانات';

export async function POST(request: NextRequest) {
  const guard = await requireAdmin(request);
  if (!guard.ok) return guard.response;

  if (!isTrustedOrigin(request)) {
    return NextResponse.json({ error: 'طلب غير موثوق' }, { status: 403 });
  }

  const rateKey = sessionRateLimitKey(guard.session.email, 'backup-reset');
  const rate = checkRateLimit(rateKey, { limit: RESET_LIMIT, windowMs: RESET_WINDOW_MS });
  if (rate.limited) {
    return NextResponse.json(
      { error: 'طلبات كثيرة جدًا، حاول لاحقًا' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rate.retryAfterMs / 1000)) } }
    );
  }

  let body: { phrase?: unknown };
  try {
    body = (await request.json()) as { phrase?: unknown };
  } catch {
    return NextResponse.json({ error: 'جسم طلب غير صالح' }, { status: 400 });
  }

  if (body.phrase !== RESET_PHRASE) {
    return NextResponse.json(
      { error: 'عبارة التأكيد غير صحيحة' },
      { status: 400 }
    );
  }

  const { env, missing } = getAppwriteServerEnv();
  if (missing.length > 0) {
    return NextResponse.json(missingEnvError(missing), { status: 503 });
  }
  const { endpoint, project, apiKey } = env!;

  let deletedDocuments = 0;
  let deletedFiles = 0;

  try {
    const client = new Client()
      .setEndpoint(endpoint)
      .setProject(project)
      .setKey(apiKey);
    const databases = new Databases(client);
    const storage = new Storage(client);

    for (const collectionId of ALL_COLLECTION_IDS) {
      let hasMore = true;
      while (hasMore) {
        const page = await databases.listDocuments(DATABASE_ID, collectionId, [
          Query.limit(100),
        ]);
        hasMore = page.documents.length === 100;
        for (const doc of page.documents) {
          await databases.deleteDocument(DATABASE_ID, collectionId, doc.$id);
          deletedDocuments += 1;
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      }
    }

    const filesRes = await storage.listFiles(REPORTS_BUCKET_ID);
    for (const file of filesRes.files) {
      await storage.deleteFile(REPORTS_BUCKET_ID, file.$id);
      deletedFiles += 1;
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    return NextResponse.json({
      ok: true,
      deletedDocuments,
      deletedFiles,
      message: 'تم حذف جميع البيانات بنجاح',
    });
  } catch (err) {
    console.error('خطأ في إعادة تعيين النظام:', err);
    return NextResponse.json({ error: 'فشل حذف البيانات' }, { status: 500 });
  }
}