// src/lib/services/reports.ts
// Service layer for Report Templates (singleton-style, one active row expected)
// and Reports (draft -> approved lifecycle). All identifiers/comments are English.

import {
  REPORTS_COLLECTION_ID,
  REPORT_TEMPLATES_COLLECTION_ID,
} from '@/lib/constants';
import { listDocuments, getDocument, createDocument, updateDocument, Query } from './base';
import type { Report, ReportTemplate, PaginatedResult } from '@/types';

const REPORT_COL = REPORTS_COLLECTION_ID;
const TEMPLATE_COL = REPORT_TEMPLATES_COLLECTION_ID;

function errorFromResponse(res: Response, data: { error?: string }): Error {
  return Object.assign(new Error(data?.error ?? `فشل الطلب (${res.status})`), {
    code: res.status,
    status: res.status,
  });
}

// ===== Report Template (singleton-style: only one active template row expected) =====

export async function getActiveReportTemplate(): Promise<ReportTemplate | null> {
  const res = await listDocuments<ReportTemplate>(TEMPLATE_COL, [Query.limit(1)]);
  return res.documents[0] ?? null;
}

export async function getReportTemplate(id: string): Promise<ReportTemplate> {
  return getDocument<ReportTemplate>(TEMPLATE_COL, id);
}

export async function createReportTemplate(id: string, data: Record<string, unknown>): Promise<ReportTemplate> {
  return createDocument<ReportTemplate>(TEMPLATE_COL, id, data);
}

export async function updateReportTemplate(id: string, data: Record<string, unknown>): Promise<ReportTemplate> {
  return updateDocument<ReportTemplate>(TEMPLATE_COL, id, data);
}

// ===== Reports =====

export async function getReport(id: string): Promise<Report> {
  return getDocument<Report>(REPORT_COL, id);
}

export async function getReportByTestId(testId: string): Promise<Report | null> {
  const res = await listDocuments<Report>(REPORT_COL, [Query.equal('testId', testId), Query.limit(1)]);
  return res.documents[0] ?? null;
}

// Draft mutations are routed through the server API (node-appwrite + API key).
// The reports collection is locked down to read("users"), so writes from the
// browser Web SDK are refused server-side.

export async function createReportDraft(_id: string, data: Record<string, unknown>): Promise<Report> {
  const res = await fetch('/api/reports', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const body = (await res.json()) as unknown;
  if (!res.ok) throw errorFromResponse(res, body as { error?: string });
  return body as Report;
}

// Core constraint: an approved (locked) report must never be edited through any path.
export async function updateReportDraft(id: string, data: Record<string, unknown>): Promise<Report> {
  const res = await fetch(`/api/reports/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const body = (await res.json()) as unknown;
  if (!res.ok) throw errorFromResponse(res, body as { error?: string });
  return body as Report;
}

export async function listReports(queries: string[] = []): Promise<PaginatedResult<Report>> {
  return listDocuments<Report>(REPORT_COL, queries);
}

// Sequential report number in the pattern RPT-YYYY-NNNNNN (same conflict-handling
// approach as generateTestNumber in helpers.ts).
export async function generateReportNumber(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = `RPT-${currentYear}-`;

  let nextNumber = 1;
  try {
    const response = await listDocuments<Report>(REPORT_COL, [
      Query.startsWith('reportNumber', prefix),
      Query.orderDesc('reportNumber'),
      Query.limit(1),
    ]);
    if (response.documents.length > 0) {
      const lastNumber = response.documents[0].reportNumber.split('-').pop();
      if (lastNumber) nextNumber = parseInt(lastNumber, 10) + 1;
    }
  } catch {}

  let isUnique = false;
  let newNumber = '';
  while (!isUnique) {
    const padded = String(nextNumber).padStart(6, '0');
    newNumber = `${prefix}${padded}`;
    try {
      const check = await listDocuments<Report>(REPORT_COL, [
        Query.equal('reportNumber', newNumber),
        Query.limit(1),
      ]);
      if (check.documents.length === 0) isUnique = true;
      else nextNumber++;
    } catch {
      isUnique = true;
    }
  }
  return newNumber;
}