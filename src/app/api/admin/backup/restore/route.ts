// src/app/api/admin/backup/restore/route.ts
// استعادة البيانات من نسخة احتياطية. يتلقى ملف ZIP (بعد فك التشفير إذا كان ملفًا
// مشفرًا، كي تبقى كلمة المرور في العميل فقط) + قائمة المجموعات المحددة +
// ما إذا كان يجب استعادة ملفات التخزين.
// كان الاستعادة يتم بالكامل من المتصفح (حذف القديم + إدراج جديد)؛ الآن تتم
// جميع عمليات الكتابة بجلسة الخادم + مفتاح API، مع فحص دور "مدير/إداري".

import { NextRequest, NextResponse } from 'next/server';
import { Client, Databases, Storage, ID, Query } from 'node-appwrite';
import JSZip from 'jszip';

import { DATABASE_ID, REPORTS_BUCKET_ID } from '@/lib/constants';
import { requireAdmin, isTrustedOrigin } from '@/lib/admin-auth';
import { getAppwriteServerEnv, missingEnvError } from '@/lib/appwrite-env';
import { checkRateLimit, sessionRateLimitKey } from '@/lib/rate-limit';
import { BACKUP_COLLECTIONS } from '@/lib/backup-catalog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RESTORE_WINDOW_MS = 60 * 60 * 1000;
const RESTORE_LIMIT = 3;
const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200 MB

interface RestoreResult {
  collectionsRestored: number;
  documentsInserted: number;
  documentsDeleted: number;
  filesRestored: number;
  filesDeleted: number;
  errors: string[];
}

type RestorableDocument = Record<string, unknown>;

// نسخة من الوثيقة بدون مفاتيح البيانات الوصفية لـ Appwrite ($$id, $createdAt, ...).
function stripDocumentMeta(doc: RestorableDocument): RestorableDocument {
  const clean: RestorableDocument = {};
  for (const [key, value] of Object.entries(doc)) {
    if (!key.startsWith('$')) clean[key] = value;
  }
  return clean;
}

async function deleteAllCollectionDocuments(databases: Databases, collectionId: string): Promise<number> {
  let deleted = 0;
  let hasMore = true;
  while (hasMore) {
    const page = await databases.listDocuments(DATABASE_ID, collectionId, [Query.limit(100)]);
    hasMore = page.documents.length === 100;
    for (const doc of page.documents) {
      await databases.deleteDocument(DATABASE_ID, collectionId, doc.$id);
      deleted += 1;
      await new Promise((r) => setTimeout(r, 200));
    }
  }
  return deleted;
}

export async function POST(request: NextRequest) {
  const guard = await requireAdmin(request);
  if (!guard.ok) return guard.response;

  if (!isTrustedOrigin(request)) {
    return NextResponse.json({ error: 'طلب غير موثوق' }, { status: 403 });
  }

  const rateKey = sessionRateLimitKey(guard.session.email, 'backup-restore');
  const rate = checkRateLimit(rateKey, { limit: RESTORE_LIMIT, windowMs: RESTORE_WINDOW_MS });
  if (rate.limited) {
    return NextResponse.json(
      { error: 'طلبات كثيرة جدًا، حاول لاحقًا' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rate.retryAfterMs / 1000)) } }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'بيانات غير صالحة' }, { status: 400 });
  }

  const file = formData.get('file') as File | null;
  if (!file) {
    return NextResponse.json({ error: 'الملف مفقود' }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'حجم الملف يتجاوز الحد الأقصى (200 MB)' }, { status: 400 });
  }

  let collectionNames: string[] = [];
  try {
    collectionNames = JSON.parse((formData.get('collections') as string) || '[]') as string[];
  } catch {
    return NextResponse.json({ error: 'قائمة المجموعات غير صالحة' }, { status: 400 });
  }
  if (collectionNames.length === 0) {
    return NextResponse.json({ error: 'لم تُحدَّد أي مجموعة للاستعادة' }, { status: 400 });
  }

  const restoreFiles = formData.get('restoreFiles') === 'true';

  const { env, missing } = getAppwriteServerEnv();
  if (missing.length > 0) {
    return NextResponse.json(missingEnvError(missing), { status: 503 });
  }
  const { endpoint, project, apiKey } = env!;

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(await file.arrayBuffer());
  } catch {
    return NextResponse.json({ error: 'تعذر قراءة ملف ZIP' }, { status: 400 });
  }

  const client = new Client()
    .setEndpoint(endpoint)
    .setProject(project)
    .setKey(apiKey);
  const databases = new Databases(client);
  const storage = new Storage(client);

  const result: RestoreResult = {
    collectionsRestored: 0,
    documentsInserted: 0,
    documentsDeleted: 0,
    filesRestored: 0,
    filesDeleted: 0,
    errors: [],
  };

  try {
    for (const name of collectionNames) {
      const col = BACKUP_COLLECTIONS.find((c) => c.name === name);
      if (!col) continue;

      const folder = zip.folder(`database/${name}`);
      if (!folder) continue;
      const jsonFile = folder.file('documents.json');
      if (!jsonFile) continue;

      let documents: Array<Record<string, unknown>>;
      try {
        documents = JSON.parse(await jsonFile.async('text')) as Array<Record<string, unknown>>;
      } catch {
        result.errors.push(`تعذر قراءة بيانات المجموعة ${name}`);
        continue;
      }

      result.collectionsRestored += 1;

      try {
        result.documentsDeleted += await deleteAllCollectionDocuments(databases, col.id);
      } catch (err) {
        console.warn(`تعذر حذف مستندات المجموعة ${name}:`, err);
        result.errors.push(`تعذر حذف البيانات القديمة في ${name}`);
      }

      for (const doc of documents) {
        try {
          await databases.createDocument(DATABASE_ID, col.id, ID.unique(), stripDocumentMeta(doc));
          result.documentsInserted += 1;
          await new Promise((r) => setTimeout(r, 50));
        } catch (err) {
          console.warn(`فشل إدراج مستند في ${name}:`, err);
        }
      }
    }

    if (restoreFiles) {
      const sf = zip.folder('storage/reports');
      if (sf) {
        // النسخ الجديدة تخزّن كل ملف بمعرّفه $id + ملف _manifest.json يحمل
        // الاسم الأصلي؛ تعيد الاستعادة الملفات بمعرّفاتها نفسها كي تبقى كل
        // المراجع (pdfFileId، logoFileId، ملفات الفحوصات) صالحة بعد الاستعادة.
        let nameById: Record<string, string> = {};
        const manifestEntry = sf.file(/.*/).find((e) => (e.name.split('/').pop() ?? '') === '_manifest.json');
        if (manifestEntry) {
          try {
            const manifest = JSON.parse(
              await manifestEntry.async('text')
            ) as { id: string; name: string }[];
            nameById = Object.fromEntries(manifest.map((m) => [m.id, m.name]));
          } catch (err) {
            console.warn('تعذر قراءة قائمة ملفات النسخة:', err);
            result.errors.push('تعذر قراءة قائمة ملفات النسخة');
          }
        }

        const filesList = sf.file(/.*/).filter(
          (e) => (e.name.split('/').pop() ?? '') !== '_manifest.json'
        );
        if (filesList.length > 0) {
          try {
            const existing = await storage.listFiles(REPORTS_BUCKET_ID);
            for (const f of existing.files) {
              await storage.deleteFile(REPORTS_BUCKET_ID, f.$id);
              result.filesDeleted += 1;
            }
          } catch (err) {
            console.warn('تعذر حذف ملفات التخزين القديمة:', err);
            result.errors.push('تعذر حذف الملفات القديمة');
          }

          for (const entry of filesList) {
            try {
              const blob = await entry.async('blob');
              const base = entry.name.split('/').pop() ?? entry.name;
              const hasId = nameById[base] !== undefined;
              await storage.createFile(
                REPORTS_BUCKET_ID,
                hasId ? base : ID.unique(),
                new File([blob], nameById[base] ?? base)
              );
              result.filesRestored += 1;
            } catch (err) {
              console.warn('تعذر استعادة ملف:', err);
            }
          }
        }
      }
    }

    return NextResponse.json({
      ok: true,
      ...result,
      message: 'اكتملت الاستعادة',
    });
  } catch (err) {
    console.error('خطأ عام أثناء الاستعادة:', err);
    return NextResponse.json({ error: 'فشل استعادة البيانات' }, { status: 500 });
  }
}