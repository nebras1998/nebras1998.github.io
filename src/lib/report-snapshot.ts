// src/lib/report-snapshot.ts
// Single shared pure function that converts a Test (+ its Sample/Client/Project)
// into the ReportSnapshot stored on the generated Report. This is the ONLY place
// where the resultType -> resultRows conversion lives, so the generation page and
// the display/PDF pages never diverge. All identifiers/comments are English.

import type { Test, Sample, Client, Project, ReportSnapshot, ReportResultRow } from '@/types';
import { getTestResultType, parseResultFields, parseAppliedStandard } from '@/lib/test-config';
import type { TestLimit } from '@/lib/test-config';

function parseNumberArray(raw?: string | null): number[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.map(Number).filter((n) => !Number.isNaN(n));
  } catch {
    return [];
  }
}

function parseRecord(raw?: string | null): Record<string, string> {
  if (!raw) return {};
  try {
    const obj = JSON.parse(raw);
    if (obj && typeof obj === 'object') return obj as Record<string, string>;
  } catch {}
  return {};
}

function joinValues(values: number[]): string {
  return values.join(' / ');
}

// Attaches acceptance limits (from the applied standard) to a result row.
// `limitKey` names which TestLimit applies; `fallback` is used for single-limit
// examinations (single, multi_no_age, aggregate, steel...) where only one limit
// block exists and no key is present.
function withLimit(
  row: ReportResultRow,
  limits: TestLimit[],
  limitKey?: string
): ReportResultRow {
  const key = (limitKey || '').toLowerCase();
  const limit = limits.find((l) => (l.key || '').toLowerCase() === key) || (!key && limits.length ? limits[0] : undefined);
  if (!limit) return row;
  return { ...row, min: limit.min, max: limit.max };
}

export function buildReportSnapshot(
  test: Test,
  sample?: Sample | null,
  client?: Client | null,
  project?: Project | null
): ReportSnapshot {
  const resultType = getTestResultType(test.testName, test.resultType);
  const resultFields = parseResultFields(test.resultFields);
  const appliedStandard = parseAppliedStandard(test.appliedStandard);
  const resultFieldsValues = parseRecord(test.resultFieldsValues);
  const unit = test.unit || appliedStandard?.unit || '';
  const limits = appliedStandard?.limits || [];

  const resultRows: ReportResultRow[] = [];
  const push = (row: ReportResultRow) => resultRows.push(row);

  if (resultType === 'dual_age') {
    const age7 = parseNumberArray(test.result7Days);
    const age28 = parseNumberArray(test.result28Days);
    if (age7.length > 0) push(withLimit({ label: 'نتائج مكعبات عمر 7 أيام', value: joinValues(age7), unit }, limits, 'age7'));
    if (test.average7Days != null) push(withLimit({ label: 'متوسط عمر 7 أيام', value: String(test.average7Days), unit }, limits, 'age7'));
    if (age28.length > 0) push(withLimit({ label: 'نتائج مكعبات عمر 28 يوم', value: joinValues(age28), unit }, limits, 'age28'));
    if (test.average28Days != null) push(withLimit({ label: 'متوسط عمر 28 يوم', value: String(test.average28Days), unit }, limits, 'age28'));
    if (resultRows.length === 0 && test.result) push({ label: 'النتيجة', value: test.result, unit });
  } else if (resultType === 'multi_no_age') {
    const cubes = parseNumberArray(test.results);
    if (cubes.length > 0) push(withLimit({ label: 'نتائج العينات', value: joinValues(cubes), unit }, limits));
    if (test.averageResult != null) push(withLimit({ label: 'المتوسط', value: String(test.averageResult), unit }, limits));
  } else if (resultType === 'multi_field') {
    if (resultFields.length > 0) {
      for (const f of resultFields) {
        const lk = limits.find((l) => (l.key || '').toLowerCase() === (f.key || '').toLowerCase());
        push(withLimit({ label: f.label, value: resultFieldsValues[f.key] ?? '', unit: f.unit || unit, limitKey: f.key }, limits, f.key));
        void lk;
      }
    } else if (test.result) {
      push({ label: 'النتيجة', value: test.result, unit });
    }
  } else if (test.result) {
    push(withLimit({ label: 'النتيجة', value: test.result, unit }, limits));
  }

  const standardRef = appliedStandard?.specification || test.specification;

  return {
    testName: test.testName,
    testNumber: test.testNumber || '',
    standard: test.specification || undefined,
    standardRef: standardRef || undefined,
    standardUnit: appliedStandard?.unit || unit || undefined,
    sampleNumber: sample?.sampleNumber || test.sampleNumber || undefined,
    sampleType: sample?.type || undefined,
    sampleLocation: sample?.location || undefined,
    sampleReceivedDate: sample?.receivedDate || undefined,
    samplePreparedDate: sample?.preparationDate || test.completedAt || undefined,
    clientName: client?.name || sample?.clientName || undefined,
    clientPhone: client?.phone || undefined,
    clientAddress: client?.address || undefined,
    projectName: project?.name || sample?.projectName || undefined,
    projectNumber: project?.projectNumber || undefined,
    projectLocation: project?.location || undefined,
    contractor: project?.contractor || undefined,
    consultant: project?.consultant || undefined,
    completedAt: test.completedAt || undefined,
    resultType,
    resultRows,
    appliedStandardName: appliedStandard?.name || undefined,
    complianceStatus: test.complianceStatus,
    technicianName: test.assignedTo || undefined,
  };
}

export function parseReportSnapshot(raw: string): ReportSnapshot | null {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && typeof parsed.testName === 'string' && Array.isArray(parsed.resultRows)) {
      return parsed as ReportSnapshot;
    }
  } catch {}
  return null;
}
