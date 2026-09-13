// src/app/api/portal/catalog/route.ts
// كتالوج عام لعرض الحجز أونلاين: أنواع العينات + الفحوصات القياسية (أسماء فقط).
// يُمكّننا من منع القراءة المباشرة من المتصفح للمجموعتين (لا ضيف يلمس قاعدة
// البيانات مباشرة بعد الآن)، مع بقاء كل عمليات الوصول عبر الخادم بمفتاح API.
//
// الفحص: حد معدل عام + إرجاع الحقول المحدودة فقط (الاسم والمعرف) لا غير.

import { NextRequest, NextResponse } from 'next/server';
import { Client, Databases, Query } from 'node-appwrite';

import { DATABASE_ID, SAMPLE_TYPES_COLLECTION_ID, STANDARD_TESTS_COLLECTION_ID } from '@/lib/constants';
import { checkRateLimit, rateLimitKey } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CATALOG_WINDOW_MS = 10 * 60 * 1000;
const CATALOG_LIMIT = 60;

export async function GET(request: NextRequest) {
  const rate = checkRateLimit(rateLimitKey(request, 'catalog'), {
    limit: CATALOG_LIMIT,
    windowMs: CATALOG_WINDOW_MS,
  });
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

    const [typesRes, testsRes] = await Promise.all([
      databases.listDocuments(DATABASE_ID, SAMPLE_TYPES_COLLECTION_ID, [
        Query.limit(1000),
        Query.select(['name']),
      ]),
      databases.listDocuments(DATABASE_ID, STANDARD_TESTS_COLLECTION_ID, [
        Query.limit(1000),
        Query.select(['sampleTypeId', 'name']),
      ]),
    ]);

    return NextResponse.json({
      sampleTypes: typesRes.documents.map((d) => ({ $id: d.$id, name: d.name })),
      tests: testsRes.documents.map((d) => ({ $id: d.$id, sampleTypeId: d.sampleTypeId, name: d.name })),
    });
  } catch (err) {
    console.error('خطأ في جلب الكتالوج العام:', err);
    return NextResponse.json({ error: 'فشل تحميل الكتالوج' }, { status: 500 });
  }
}