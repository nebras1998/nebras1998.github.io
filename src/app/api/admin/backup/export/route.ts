// src/app/api/admin/backup/export/route.ts
// تصدير نسخة احتياطية كاملة (كل المجموعات + ملفات التخزين) عبر مفتاح API الخادم.
// كان التصدير يتم من المتصفح بقراءة مباشرة عبر REST، ما جعله يعتمد على صلاحيات
// قراءة عامة ("any") للمجموعات ومكشفًا لكل بيانات النظام للعميل؛ الآن يتم بجلسة
// الخادم + مفتاح APPWRITE_API_KEY ودور "مدير/إداري" فقط.

import { NextRequest, NextResponse } from 'next/server';
import { Client, Databases, Storage, Query } from 'node-appwrite';
import JSZip from 'jszip';

import { DATABASE_ID, REPORTS_BUCKET_ID } from '@/lib/constants';
import { requireAdmin, isTrustedOrigin } from '@/lib/admin-auth';
import { getAppwriteServerEnv, missingEnvError } from '@/lib/appwrite-env';
import { checkRateLimit, sessionRateLimitKey } from '@/lib/rate-limit';
import { BACKUP_COLLECTIONS } from '@/lib/backup-catalog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const EXPORT_WINDOW_MS = 15 * 60 * 1000;
const EXPORT_LIMIT = 5;

export async function GET(request: NextRequest) {
  const guard = await requireAdmin(request);
  if (!guard.ok) return guard.response;

  // CSRF defense: cross-origin requests (which send an Origin header) must come
  // from a trusted origin. Same-origin GET requests carry no Origin header in
  // browsers, so the check is only enforced when an Origin is actually present.
  if (request.headers.get('origin') && !isTrustedOrigin(request)) {
    return NextResponse.json({ error: 'طلب غير موثوق' }, { status: 403 });
  }

  const rateKey = sessionRateLimitKey(guard.session.email, 'backup-export');
  const rate = checkRateLimit(rateKey, { limit: EXPORT_LIMIT, windowMs: EXPORT_WINDOW_MS });
  if (rate.limited) {
    return NextResponse.json(
      { error: 'طلبات كثيرة جدًا، حاول لاحقًا' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rate.retryAfterMs / 1000)) } }
    );
  }

  const { env, missing } = getAppwriteServerEnv();
  if (missing.length > 0) {
    return NextResponse.json(missingEnvError(missing), { status: 503 });
  }
  const { endpoint, project, apiKey } = env!;

  try {
    const client = new Client()
      .setEndpoint(endpoint)
      .setProject(project)
      .setKey(apiKey);
    const databases = new Databases(client);
    const storage = new Storage(client);

    const zip = new JSZip();
    const dbFolder = zip.folder('database');

    for (const collection of BACKUP_COLLECTIONS) {
      const documents: unknown[] = [];
      let offset = 0;
      let hasMore = true;
      while (hasMore) {
        const page = await databases.listDocuments(DATABASE_ID, collection.id, [
          Query.limit(100),
          Query.offset(offset),
        ]);
        documents.push(...page.documents);
        offset += page.documents.length;
        hasMore = page.documents.length === 100;
      }
      if (documents.length > 0) {
        dbFolder?.folder(collection.name)?.file(
          'documents.json',
          JSON.stringify(documents, null, 2)
        );
      }
    }

    try {
      const filesRes = await storage.listFiles(REPORTS_BUCKET_ID);
      if (filesRes.files.length > 0) {
        const storageFolder = zip.folder('storage/reports');
        if (storageFolder) {
          const manifest: { id: string; name: string }[] = [];
          for (const file of filesRes.files) {
            const content: ArrayBuffer = await storage.getFileDownload(REPORTS_BUCKET_ID, file.$id);
            storageFolder.file(file.$id, Buffer.from(content));
            manifest.push({ id: file.$id, name: file.name || file.$id });
          }
          // Manifest يخزّن اسم كل ملف بمعرّفه، ليعيد الاستعادة الملفات بأرقامها
          // التعريفية نفسها فتبقى مراجع pdfFileId/logoFileId/ملفات الفحوصات صالحة.
          storageFolder.file('_manifest.json', JSON.stringify(manifest));
        }
      }
    } catch (err) {
      console.warn('تعذر تصدير ملفات التخزين:', err);
    }

    const buffer = Buffer.from(
      await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 9 } })
    );

    const filename = `backup-${new Date().toISOString().replace(/[:.]/g, '-')}.zip`;
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(buffer.length),
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('خطأ في تصدير النسخة الاحتياطية:', err);
    return NextResponse.json({ error: 'فشل إنشاء النسخة الاحتياطية' }, { status: 500 });
  }
}