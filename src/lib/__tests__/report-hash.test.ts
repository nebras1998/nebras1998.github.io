import { describe, it, expect } from 'vitest';
import { computeReportHash } from '@/lib/report-hash';
import type { ReportSnapshot } from '@/types';

const baseSnapshot: ReportSnapshot = {
  testName: 'اختبار مقاومة الضغط',
  testNumber: 'TST-2026-001',
  standardRef: 'ASTM C39',
  resultType: 'single',
  resultRows: [
    { label: 'النتيجة', value: '31.5', unit: 'MPa' },
  ],
  complianceStatus: 'مطابق',
} as ReportSnapshot;

describe('computeReportHash', () => {
  it('produces a 64-char hex digest', () => {
    const hash = computeReportHash(baseSnapshot, 'RPT-2026-000001', '2026-01-01T00:00:00.000Z');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is deterministic: same inputs always yield the same hash', () => {
    const a = computeReportHash(baseSnapshot, 'RPT-2026-000001', '2026-01-01T00:00:00.000Z');
    const b = computeReportHash(baseSnapshot, 'RPT-2026-000001', '2026-01-01T00:00:00.000Z');
    expect(a).toBe(b);
  });

  it('changes when the report number changes', () => {
    const a = computeReportHash(baseSnapshot, 'RPT-2026-000001', '2026-01-01T00:00:00.000Z');
    const b = computeReportHash(baseSnapshot, 'RPT-2026-000002', '2026-01-01T00:00:00.000Z');
    expect(a).not.toBe(b);
  });

  it('changes when the review timestamp changes', () => {
    const a = computeReportHash(baseSnapshot, 'RPT-2026-000001', '2026-01-01T00:00:00.000Z');
    const b = computeReportHash(baseSnapshot, 'RPT-2026-000001', '2026-01-01T00:00:01.000Z');
    expect(a).not.toBe(b);
  });

  it('changes when any result value in the snapshot changes', () => {
    const tampered: ReportSnapshot = {
      ...baseSnapshot,
      resultRows: [{ label: 'النتيجة', value: '32.0', unit: 'MPa' }],
    };
    const a = computeReportHash(baseSnapshot, 'RPT-2026-000001', '2026-01-01T00:00:00.000Z');
    const b = computeReportHash(tampered, 'RPT-2026-000001', '2026-01-01T00:00:00.000Z');
    expect(a).not.toBe(b);
  });
});