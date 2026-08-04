import { Client, Databases, Query } from 'appwrite';
import {
  DATABASE_ID,
  INVOICES_COLLECTION_ID,
  SAMPLES_COLLECTION_ID,
} from '@/lib/constants';
import type { DashboardStats } from '@/types';

const INVOICE_LIMIT = 500;
const SAMPLE_LIMIT = 500;

export const CACHE_TTL_MS = 5 * 60 * 1000;

type InvoiceAggregate = { paidAmount?: number; issueDate?: string };
type SampleAggregate = { type: string };

function createDatabases(sessionCookie: string): Databases {
  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
    .setCookie(sessionCookie);

  return new Databases(client);
}

export async function computeDashboardStats(sessionCookie: string): Promise<DashboardStats> {
  const databases = createDatabases(sessionCookie);

  const [invoicesRes, samplesRes] = await Promise.all([
    databases.listDocuments(DATABASE_ID, INVOICES_COLLECTION_ID, [
      Query.limit(INVOICE_LIMIT),
      Query.select(['paidAmount', 'issueDate']),
    ]),
    databases.listDocuments(DATABASE_ID, SAMPLES_COLLECTION_ID, [
      Query.limit(SAMPLE_LIMIT),
      Query.select(['type']),
    ]),
  ]);

  const invoices = invoicesRes.documents as unknown as InvoiceAggregate[];
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
  (samplesRes.documents as unknown as SampleAggregate[]).forEach((s) => {
    typeCount[s.type] = (typeCount[s.type] || 0) + 1;
  });
  const samplesByType = Object.entries(typeCount).map(([name, value]) => ({ name, value }));

  return { totalRevenue, samplesByType, monthlyRevenue, generatedAt: new Date().toISOString() };
}

let cache: { data: DashboardStats; expiresAt: number } | null = null;

export async function getDashboardStats(sessionCookie: string): Promise<DashboardStats> {
  if (cache && Date.now() < cache.expiresAt) {
    return cache.data;
  }

  const data = await computeDashboardStats(sessionCookie);
  cache = { data, expiresAt: Date.now() + CACHE_TTL_MS };
  return data;
}
