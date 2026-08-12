// src/lib/report-snapshot.ts
// Single shared pure function that converts a Test (+ its Sample/Client/Project)
// into the ReportSnapshot stored on the generated Report. This is the ONLY place
// where the resultType -> resultRows conversion lives, so the generation page and
// the display/PDF pages never diverge. All identifiers/comments are English.

import type { Test, Sample, Client, Project, ReportSnapshot } from '@/types';
import { getTestResultType, parseResultFields, parseAppliedStandard } from '@/lib/test-config';

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
  const unit = test.unit || '';

  const resultRows: ReportSnapshot['resultRows'] = [];

  if (resultType === 'dual_age') {
    const age7 = parseNumberArray(test.result7Days);
    const age28 = parseNumberArray(test.result28Days);
    if (age7.length > 0) resultRows.push({ label: 'نتائج مكعبات عمر 7 أيام', value: joinValues(age7), unit });
    if (test.average7Days != null) resultRows.push({ label: 'متوسط عمر 7 أيام', value: String(test.average7Days), unit });
    if (age28.length > 0) resultRows.push({ label: 'نتائج مكعبات عمر 28 يوم', value: joinValues(age28), unit });
    if (test.average28Days != null) resultRows.push({ label: 'متوسط عمر 28 يوم', value: String(test.average28Days), unit });
    if (resultRows.length === 0 && test.result) resultRows.push({ label: 'النتيجة', value: test.result, unit });
  } else if (resultType === 'multi_no_age') {
    const cubes = parseNumberArray(test.results);
    if (cubes.length > 0) resultRows.push({ label: 'نتائج المكعبات', value: joinValues(cubes), unit });
    if (test.averageResult != null) resultRows.push({ label: 'المتوسط', value: String(test.averageResult), unit });
  } else if (resultType === 'multi_field') {
    if (resultFields.length > 0) {
      for (const f of resultFields) {
        resultRows.push({ label: f.label, value: resultFieldsValues[f.key] ?? '', unit: f.unit || unit });
      }
    } else if (test.result) {
      resultRows.push({ label: 'النتيجة', value: test.result, unit });
    }
  } else if (test.result) {
    resultRows.push({ label: 'النتيجة', value: test.result, unit });
  }

  return {
    testName: test.testName,
    testNumber: test.testNumber || '',
    standard: test.specification || undefined,
    sampleNumber: sample?.sampleNumber || test.sampleNumber || undefined,
    sampleType: sample?.type || undefined,
    clientName: client?.name || sample?.clientName || undefined,
    projectName: project?.name || sample?.projectName || undefined,
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
