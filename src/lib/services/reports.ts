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

export async function createReportDraft(id: string, data: Record<string, unknown>): Promise<Report> {
  return createDocument<Report>(REPORT_COL, id, data);
}

// Core constraint: an approved (locked) report must never be edited through any path.
export async function updateReportDraft(id: string, data: Record<string, unknown>): Promise<Report> {
  const existing = await getDocument<Report>(REPORT_COL, id);
  if (existing.status === 'معتمد') {
    throw new Error('لا يمكن تعديل تقرير مُعتمد ومُقفل. التقرير محفوظ كسجل نهائي.');
  }
  return updateDocument<Report>(REPORT_COL, id, data);
}

export async function approveReport(id: string, reviewedBy: string, pdfFileId: string, reportHash: string): Promise<Report> {
  const existing = await getDocument<Report>(REPORT_COL, id);
  if (existing.status === 'معتمد') {
    throw new Error('التقرير مُعتمد ومُقفل بالفعل.');
  }
  return updateDocument<Report>(REPORT_COL, id, {
    status: 'معتمد',
    reviewedBy,
    reviewedAt: new Date().toISOString(),
    pdfFileId,
    reportHash,
  });
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
