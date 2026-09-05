import { describe, it, expect } from 'vitest';
import { buildReportSnapshot, parseReportSnapshot } from '@/lib/report-snapshot';
import type { Test, Sample, Client, Project } from '@/types';

function makeTest(overrides: Partial<Test>): Test {
  return {
    $id: 't1',
    testName: 'اختبار مقاومة الضغط',
    resultType: 'single',
    result: '31.5',
    result7Days: undefined,
    result28Days: undefined,
    results: undefined,
    average7Days: undefined,
    average28Days: undefined,
    averageResult: undefined,
    resultFields: undefined,
    resultFieldsValues: undefined,
    appliedStandard: undefined,
    unit: 'MPa',
    specification: 'GOST 10180',
    testNumber: 'TST-2026-001',
    complianceStatus: 'مطابق',
    assignedTo: 'م. أحمد',
    ...overrides,
  } as unknown as Test;
}

const sample: Sample = {
  $id: 's1',
  sampleNumber: 'SMP-2026-0001',
  type: 'خرسانة',
  location: 'مشروع الأبراج',
  receivedDate: '2026-01-10',
  preparationDate: '2026-01-12',
  projectName: 'أبراج الرياض',
  clientName: 'شركة البناء',
} as unknown as Sample;

const client: Client = {
  $id: 'c1',
  name: 'شركة البناء',
  phone: '0500000001',
  address: 'الرياض',
} as unknown as Client;

const project: Project = {
  $id: 'p1',
  name: 'أبراج الرياض',
  projectNumber: 'PRJ-2026-0001',
  location: 'الرياض',
  contractor: 'مقاول',
  consultant: 'استشاري',
} as unknown as Project;

describe('buildReportSnapshot', () => {
  it('builds dual_age rows from the 7/28-day arrays', () => {
    const test = makeTest({
      resultType: 'dual_age',
      result7Days: '[10, 11, 12]',
      result28Days: '[20, 21, 22]',
      average7Days: 11,
      average28Days: 21,
    });
    const snap = buildReportSnapshot(test, sample, client, project);
    expect(snap.resultRows.map((r) => r.label)).toEqual([
      'نتائج مكعبات عمر 7 أيام',
      'متوسط عمر 7 أيام',
      'نتائج مكعبات عمر 28 يوم',
      'متوسط عمر 28 يوم',
    ]);
    expect(snap.resultRows[0].value).toBe('10 / 11 / 12');
    expect(snap.resultRows[1].value).toBe('11');
    expect(snap.resultRows[0].unit).toBe('MPa');
    expect(snap.sampleType).toBe('خرسانة');
    expect(snap.sampleNumber).toBe('SMP-2026-0001');
    expect(snap.clientName).toBe('شركة البناء');
    expect(snap.projectNumber).toBe('PRJ-2026-0001');
    expect(snap.completedAt).toBeUndefined();
  });

  it('merges fields for multi_field result type', () => {
    const test = makeTest({
      resultType: 'multi_field',
      resultFields: '[{"key":"slump","label":"الهبوط","unit":"cm"}]',
      resultFieldsValues: '{"slump":"12"}',
      result: undefined,
    });
    const snap = buildReportSnapshot(test);
    expect(snap.resultRows).toEqual([
      { label: 'الهبوط', value: '12', unit: 'cm', limitKey: 'slump' },
    ]);
    expect(snap.standardRef).toBe('GOST 10180');
  });

  it('uses the applied standard unit as fallback', () => {
    const test = makeTest({
      resultType: 'single',
      result: '5',
      unit: undefined,
      appliedStandard: '{"name":"ASTM C39","specification":"ASTM C39-21","unit":"psi"}',
    });
    const snap = buildReportSnapshot(test);
    expect(snap.resultRows[0].unit).toBe('psi');
    expect(snap.appliedStandardName).toBe('ASTM C39');
  });

  it('accepts the duplicate restriction and caps at the applied limit', () => {
    const test = makeTest({
      resultType: 'dual_age',
      result7Days: '[10, 12]',
      result28Days: '[21]',
      average7Days: 11,
      average28Days: 21,
      appliedStandard:
        '{"name":"ASTM C39","specification":"ASTM C39-21","unit":"MPa","limits":' +
        '[{"key":"age7","label":"7 أيام","min":20,"max":40},{"key":"age28","label":"28 يوم","min":30,"max":50}]}',
    });
    const snap = buildReportSnapshot(test);
    const seven = snap.resultRows[0];
    const sevenAvg = snap.resultRows[1];
    expect(seven.min).toBe(20);
    expect(seven.max).toBe(40);
    expect(sevenAvg.max).toBe(40);
    expect(snap.resultRows[2].min).toBe(30);
  });

  it('is immutable: mutating the input does not mutate the snapshot', () => {
    const test = makeTest({
      resultType: 'dual_age',
      result7Days: '[10, 11, 12]',
      result28Days: '[20, 21, 22]',
      average7Days: 11,
      average28Days: 21,
    });
    const snap = buildReportSnapshot(test, sample, client, project);
    const valueBefore = snap.resultRows[0].value;
    const sampleTypeBefore = snap.sampleType;
    test.result7Days = '[99]';
    sample.type = 'أسمنت';
    expect(snap.resultRows[0].value).toBe(valueBefore);
    expect(snap.sampleType).toBe(sampleTypeBefore);
  });
});

describe('parseReportSnapshot', () => {
  it('parses a valid JSON snapshot', () => {
    const snap = buildReportSnapshot(makeTest({}), sample);
    const parsed = parseReportSnapshot(JSON.stringify(snap));
    expect(parsed).not.toBeNull();
    expect(parsed!.testName).toBe('اختبار مقاومة الضغط');
    expect(parsed!.resultRows).toHaveLength(1);
  });

  it('returns null for invalid JSON', () => {
    expect(parseReportSnapshot('not json')).toBeNull();
  });

  it('returns null for JSON that is not a snapshot shape', () => {
    expect(parseReportSnapshot(JSON.stringify({ foo: 'bar' }))).toBeNull();
  });
});