import { NextRequest, NextResponse } from 'next/server';
import { Client, Databases, ID, Query } from 'node-appwrite';
import {
  DATABASE_ID,
  SAMPLE_TYPES_COLLECTION_ID,
  STANDARD_TESTS_COLLECTION_ID,
  BOOKINGS_COLLECTION_ID,
} from '@/lib/constants';
import { rateLimitKey, checkRateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Abuse protection: in-memory per-IP rate limit (5 attempts / 10 minutes). انظر
// src/lib/rate-limit.ts لتفاصيل التحليل الصارم للعناوين وحدود التنفيذ المعروفة
// (تتعامل النقطة العامة غير المُوثَّقة، فأفضل عنصر رادع هو IP صالح الشكل
// وأيضاً تدوير الصلاحيات خلف proxy يُوثِّق الهيدرات). المسارات الحساسة
// (مثل اعتماد التقارير) تَستعمل مفتاح جلسة بدل IP.
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

const PHONE_RE = /^\+?[0-9]{9,15}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function normalizePhone(value: string): string {
  return value.replace(/[\s()-]/g, '');
}

function badRequest(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 400 });
}

function createServerDatabases(): Databases | null {
  const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
  const project = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
  const apiKey = process.env.APPWRITE_API_KEY;
  if (!endpoint || !project || !apiKey) return null;
  const client = new Client()
    .setEndpoint(endpoint)
    .setProject(project)
    .setKey(apiKey);
  return new Databases(client);
}

// توليد رقم حجز تسلسلي {BOOK-YYYY-NNNN}. عند تعذّر قراءة آخر رقم (خطأ عابر في
// القراءة)، نتراجع إلى رقمٍ عشوائي مع التحقق من عدم كونه مستخدماً حالياً،
// لتجنّب تعارض الأرقام الناتج عن التراجع العشوائي غير المحقَّق.
async function generateBookingNumber(databases: Databases): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `BOOK-${year}-`;

  async function sequentialNext(): Promise<number | null> {
    const res = await databases.listDocuments(DATABASE_ID, BOOKINGS_COLLECTION_ID, [
      Query.startsWith('bookingNumber', prefix),
      Query.orderDesc('bookingNumber'),
      Query.limit(1),
      Query.select(['bookingNumber']),
    ]);
    let next = 1;
    if (res.documents.length > 0) {
      const last = (res.documents[0].bookingNumber as string)?.split('-').pop();
      if (last && /^\d+$/.test(last)) next = parseInt(last, 10) + 1;
    }
    return next;
  }

  const maxRandomAttempts = 8;

  try {
    const next = await sequentialNext();
    return `${prefix}${String(next).padStart(4, '0')}`;
  } catch {
    // قراءة آخر رقم فشلت؛ جرّب رقماً عشوائياً ليس مستخدماً حالياً.
    for (let attempt = 0; attempt < maxRandomAttempts; attempt++) {
      const candidate = `${prefix}${String(Math.floor(Math.random() * 9000) + 1000)}`;
      try {
        const check = await databases.listDocuments(DATABASE_ID, BOOKINGS_COLLECTION_ID, [
          Query.equal('bookingNumber', candidate),
          Query.limit(1),
          Query.select(['bookingNumber']),
        ]);
        if (check.documents.length === 0) return candidate;
      } catch {
        // إن تعذّر حتى التحقق من التعارض، أعد المحاولة برقمٍ عشوائي مختلف.
      }
    }
    throw new Error('تعذر توليد رقم حجز فريد');
  }
}

export async function POST(request: NextRequest) {
  if (checkRateLimit(rateLimitKey(request, 'book'), { limit: RATE_LIMIT_MAX, windowMs: RATE_LIMIT_WINDOW_MS }).limited) {
    return NextResponse.json(
      { error: 'محاولات كثيرة جداً. يرجى الانتظار 10 دقائق قبل إعادة المحاولة.' },
      { status: 429 }
    );
  }

  const databases = createServerDatabases();
  if (!databases) {
    console.error('[booking] APPWRITE_API_KEY is not configured on the server.');
    return NextResponse.json(
      { error: 'خدمة الحجز غير متوفرة حالياً. يرجى المحاولة لاحقاً.' },
      { status: 500 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return badRequest('بيانات الطلب غير صالحة.');
  }

  const clientName = typeof body.clientName === 'string' ? body.clientName.trim() : '';
  const clientPhone = typeof body.clientPhone === 'string' ? body.clientPhone.trim() : '';
  const clientEmail = typeof body.clientEmail === 'string' ? body.clientEmail.trim() : '';
  const sampleType = typeof body.sampleType === 'string' ? body.sampleType.trim() : '';
  const preferredDate = typeof body.preferredDate === 'string' ? body.preferredDate.trim() : '';
  const projectName = typeof body.projectName === 'string' ? body.projectName.trim() : '';
  const notes = typeof body.notes === 'string' ? body.notes.trim() : '';

  const requestedTestsRaw = Array.isArray(body.requestedTests)
    ? (body.requestedTests as unknown[]).filter((t): t is string => typeof t === 'string')
    : [];

  if (!clientName) return badRequest('الاسم مطلوب.');
  if (clientName.length > 100) return badRequest('الاسم طويل جداً.');
  if (!clientPhone) return badRequest('رقم الهاتف مطلوب.');
  const normalizedPhone = normalizePhone(clientPhone);
  if (!PHONE_RE.test(normalizedPhone)) return badRequest('رقم الهاتف غير صالح.');
  if (clientEmail && !EMAIL_RE.test(clientEmail)) return badRequest('البريد الإلكتروني غير صالح.');
  if (!sampleType) return badRequest('نوع العينة مطلوب.');
  if (preferredDate) {
    if (!DATE_RE.test(preferredDate)) return badRequest('تاريخ غير صالح.');
    const today = new Date().toISOString().split('T')[0];
    if (preferredDate < today) return badRequest('لا يمكن تحديد تاريخ في الماضي.');
  }
  if (requestedTestsRaw.length > 20) return badRequest('عدد الفحوصات المطلوبة كبير جداً.');
  if (projectName.length > 200) return badRequest('اسم المشروع طويل جداً.');
  if (notes.length > 1000) return badRequest('الملاحظات طويلة جداً.');

  try {
    const typeRes = await databases.listDocuments(DATABASE_ID, SAMPLE_TYPES_COLLECTION_ID, [
      Query.equal('name', sampleType),
      Query.limit(1),
      Query.select(['name']),
    ]);
    if (typeRes.documents.length === 0) {
      return badRequest('نوع العينة المحدد غير موجود في الكتالوج.');
    }
    const sampleTypeId = typeRes.documents[0].$id;

    if (requestedTestsRaw.length > 0) {
      const testsRes = await databases.listDocuments(DATABASE_ID, STANDARD_TESTS_COLLECTION_ID, [
        Query.equal('sampleTypeId', sampleTypeId),
        Query.limit(100),
        Query.select(['name']),
      ]);
      const validNames = new Set<string>(testsRes.documents.map((d) => d.name as string));
      for (const testName of requestedTestsRaw) {
        if (!validNames.has(testName)) {
          return badRequest(`الفحص المحدد غير موجود في الكتالوج: ${testName}`);
        }
      }
    }

    const bookingNumber = await generateBookingNumber(databases);

    const created = await databases.createDocument(
      DATABASE_ID,
      BOOKINGS_COLLECTION_ID,
      ID.unique(),
      {
        bookingNumber,
        clientName,
        clientPhone: normalizedPhone,
        clientEmail: clientEmail || undefined,
        sampleType,
        preferredDate: preferredDate || undefined,
        projectName: projectName || undefined,
        notes: notes || undefined,
        requestedTests: requestedTestsRaw.length > 0 ? JSON.stringify(requestedTestsRaw) : undefined,
        status: 'معلق',
        source: 'أونلاين',
      }
    );

    return NextResponse.json({ id: created.$id, bookingNumber });
  } catch (err) {
    console.error('[booking] فشل إنشاء الحجز:', err);
    return NextResponse.json({ error: 'فشل حفظ الطلب. يرجى المحاولة لاحقاً.' }, { status: 500 });
  }
}
