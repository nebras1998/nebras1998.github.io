import { Client, Databases, Query } from 'appwrite';
import { createHash } from 'node:crypto';
import {
  DATABASE_ID,
  INVOICES_COLLECTION_ID,
  SAMPLES_COLLECTION_ID,
} from '@/lib/constants';
import type { DashboardStats } from '@/types';

const PAGE_SIZE = 100;

export const CACHE_TTL_MS = 5 * 60 * 1000;

type InvoiceAggregate = { paidAmount?: number; issueDate?: string };
type SampleAggregate = { type: string };

// قرار التصميم بخصوص التخزين المؤقت:
// التخزين المؤقت داخل الذاكرة هو "أفضل جهد" لكل مثيل خادم. في حالة النشر على منصات
// serverless متعددة المثيلات قد يكون لكل مثيل ذاكرة تخزين مؤقت خاصة به، لكن هذا لا يؤثر
// على صحة البيانات لأن الحساب يُنفَّذ بالكامل عبر تقسيم الصفحات (pagination) فيكون الأثر
// الوحيد محتملًا هو الأداء وليس فقدان البيانات. الخريطة مفصولة حسب هوية المستخدم (بصمة
// من جلسة Appwrite) حتى لا تتسرب بيانات مستخدم إلى مستخدم آخر.
const cacheMap = new Map<string, { data: DashboardStats; expiresAt: number }>();

function createDatabases(sessionCookie: string): Databases {
  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
    .setCookie(sessionCookie);

  return new Databases(client);
}

async function fetchAllDocuments<T>(
  databases: Databases,
  collectionId: string,
  select: string[]
): Promise<T[]> {
  const all: T[] = [];
  let offset = 0;
  for (;;) {
    const res = await databases.listDocuments(DATABASE_ID, collectionId, [
      Query.limit(PAGE_SIZE),
      Query.offset(offset),
      Query.select(select),
    ]);
    all.push(...(res.documents as unknown as T[]));
    offset += PAGE_SIZE;
    if (offset >= res.total) break;
  }
  return all;
}

export async function computeDashboardStats(sessionCookie: string): Promise<DashboardStats> {
  const databases = createDatabases(sessionCookie);

  const [invoices, samples] = await Promise.all([
    fetchAllDocuments<InvoiceAggregate>(databases, INVOICES_COLLECTION_ID, ['paidAmount', 'issueDate']),
    fetchAllDocuments<SampleAggregate>(databases, SAMPLES_COLLECTION_ID, ['type']),
  ]);

  const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);

  const monthly: Record<string, number> = {};
  invoices.forEach((inv) => {
    if (inv.issueDate) {
      const [y, m] = inv.issueDate.split('-');
      monthly[`${y}-${m}`] = (monthly[`${y}-${m}`] || 0) + (inv.paidAmount || 0);
    }
  });
  const months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
  const currentYear = new Date().getFullYear().toString();
  const monthlyRevenue = months.map((m) => ({ month: m, revenue: monthly[`${currentYear}-${m}`] || 0 }));

  const typeCount: Record<string, number> = {};
  samples.forEach((s) => {
    typeCount[s.type] = (typeCount[s.type] || 0) + 1;
  });
  const samplesByType = Object.entries(typeCount).map(([name, value]) => ({ name, value }));

  return { totalRevenue, samplesByType, monthlyRevenue, generatedAt: new Date().toISOString() };
}

export async function getDashboardStats(sessionCookie: string): Promise<DashboardStats> {
  const key = createHash('sha256').update(sessionCookie).digest('hex');
  const cached = cacheMap.get(key);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.data;
  }

  const data = await computeDashboardStats(sessionCookie);
  cacheMap.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
  return data;
}
