// src/app/api/admin/backup/export/route.ts
// تصدير نسخة احتياطية كاملة (كل المجموعات + ملفات التخزين) عبر مفتاح API الخادم.
// كان التصدير يتم من المتصفح بقراءة مباشرة عبر REST، ما جعله يعتمد على صلاحيات
// قراءة عامة ("any") للمجموعات ومكشفًا لكل بيانات النظام للعميل؛ الآن يتم بجلسة
// الخادم + مفتاح APPWRITE_API_KEY ودور "مدير/إداري" فقط.

import { NextRequest, NextResponse } from 'next/server';
import { Client, Databases, Storage, Query } from 'node-appwrite';
import JSZip from 'jszip';

import { DATABASE_ID, REPORTS_BUCKET_ID } from '@/lib/constants';
import { requireAdmin } from '@/lib/admin-auth';
import { checkRateLimit, sessionRateLimitKey } from '@/lib/rate-limit';
import { ALL_COLLECTIONS } from '@/lib/backup-catalog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const EXPORT_WINDOW_MS = 15 * 60 * 1000;
const EXPORT_LIMIT = 5;

export async function GET(request: NextRequest) {
  const guard = await requireAdmin(request);
  if (!guard.ok) return guard.response;

  const rateKey = sessionRateLimitKey(guard.session.email, 'backup-export');
  const rate = checkRateLimit(rateKey, { limit: EXPORT_LIMIT, windowMs: EXPORT_WINDOW_MS });
  if (rate.limited) {
    return NextResponse.json(
      { error: 'طلبات كثيرة جدًا، حاول لاحقًا' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rate.retryAfterMs / 1000)) } }
    );
  }

  const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
  const project = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
  const apiKey = process.env.APPWRITE_API_KEY;
  if (!endpoint || !project || !apiKey) {
    return NextResponse.json({ error: 'خادم غير مكوّن' }, { status: 503 });
  }

  try {
    const client = new Client()
      .setEndpoint(endpoint)
      .setProject(project)
      .setKey(apiKey);
    const databases = new Databases(client);
    const storage = new Storage(client);

    const zip = new JSZip();
    const dbFolder = zip.folder('database');

    for (const collection of ALL_COLLECTIONS) {
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
        for (const file of filesRes.files) {
          const content: ArrayBuffer = await storage.getFileDownload(REPORTS_BUCKET_ID, file.$id);
          storageFolder?.file(file.name || file.$id, Buffer.from(content));
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