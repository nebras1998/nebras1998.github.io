// src/lib/test-config.ts
// Shared helpers for the professionalized samples & tests section.
// All new identifiers/comments are in English; UI strings remain Arabic.

export type TestResultType = 'single' | 'dual_age' | 'multi_no_age' | 'multi_field';

export interface ResultFieldDef {
  key: string;
  label: string;
  unit?: string;
}

export interface TestLimit {
  key?: string;
  min?: number;
  max?: number;
}

export interface SpecificationProfile {
  name: string;
  specification?: string;
  unit?: string;
  limits: TestLimit[];
}

export const RESULT_TYPE_LABELS: Record<TestResultType, string> = {
  single: 'نتيجة واحدة',
  dual_age: 'عمران (7 و 28 يوم)',
  multi_no_age: 'متعدد بدون أعمار',
  multi_field: 'متعدد الحقول',
};

const LEGACY_DUAL_AGE = ['مقاومة الضغط'];
const LEGACY_MULTI_NO_AGE = ['مقاومة الضغط للقلب الخرساني'];

// Returns the result type for a test, preferring the stored value and
// falling back to the legacy name-based detection for pre-existing records.
export function getTestResultType(testName: string | undefined, storedType?: string): TestResultType {
  if (storedType === 'single' || storedType === 'dual_age' || storedType === 'multi_no_age' || storedType === 'multi_field') {
    return storedType;
  }
  if (LEGACY_DUAL_AGE.includes(testName || '')) return 'dual_age';
  if (LEGACY_MULTI_NO_AGE.includes(testName || '')) return 'multi_no_age';
  return 'single';
}

export function parseResultFields(raw?: string | null): ResultFieldDef[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((f) => f && typeof f.key === 'string' && typeof f.label === 'string' && f.key.trim())
      .map((f) => ({ key: f.key, label: f.label, unit: typeof f.unit === 'string' ? f.unit : undefined }));
  } catch {
    return [];
  }
}

export function serializeResultFields(fields: ResultFieldDef[]): string {
  return JSON.stringify(fields.filter((f) => f.key.trim()).map((f) => ({ key: f.key.trim(), label: f.label, unit: f.unit || undefined })));
}

function normalizeProfile(p: Record<string, unknown>): SpecificationProfile {
  const rawLimits = Array.isArray(p.limits) ? p.limits : [];
  const limits: TestLimit[] = rawLimits
    .filter((l) => l && typeof l === 'object' && (l.min !== undefined || l.max !== undefined))
    .map((l) => {
      const obj = l as Record<string, unknown>;
      return {
        key: typeof obj.key === 'string' && obj.key ? obj.key : undefined,
        min: typeof obj.min === 'number' ? obj.min : undefined,
        max: typeof obj.max === 'number' ? obj.max : undefined,
      };
    });
  return {
    name: typeof p.name === 'string' ? p.name : '',
    specification: typeof p.specification === 'string' ? p.specification : undefined,
    unit: typeof p.unit === 'string' ? p.unit : undefined,
    limits,
  };
}

export function parseSpecificationProfiles(raw?: string | null): SpecificationProfile[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.filter((p) => p && typeof p === 'object' && typeof (p as Record<string, unknown>).name === 'string').map(normalizeProfile);
  } catch {
    return [];
  }
}

export function serializeSpecificationProfiles(profiles: SpecificationProfile[]): string {
  return JSON.stringify(
    profiles
      .filter((p) => p.name.trim())
      .map((p) => ({
        name: p.name.trim(),
        specification: p.specification || undefined,
        unit: p.unit || undefined,
        limits: p.limits,
      }))
  );
}

export function parseAppliedStandard(raw?: string | null): SpecificationProfile | null {
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw);
    if (obj && typeof obj === 'object' && typeof (obj as Record<string, unknown>).name === 'string') {
      return normalizeProfile(obj as Record<string, unknown>);
    }
  } catch {
    return null;
  }
  return null;
}

export function serializeAppliedStandard(profile: SpecificationProfile): string {
  return JSON.stringify({
    name: profile.name,
    specification: profile.specification || undefined,
    unit: profile.unit || undefined,
    limits: profile.limits,
  });
}

// Evaluates the compliance status of a test against its applied standard.
// Limits are only evaluated when a numeric value is actually present;
// missing/non-numeric values do not fail the evaluation. When the applied
// standard defines no limits, no compliance status is produced.
export function evaluateCompliance(
  type: TestResultType,
  profile: SpecificationProfile | null,
  input: {
    result?: string;
    average7Days?: number;
    average28Days?: number;
    averageResult?: number;
    resultFieldsValues?: Record<string, string>;
  }
): 'مطابق' | 'غير مطابق' | undefined {
  if (!profile || profile.limits.length === 0) return undefined;

  const byKey = (k: string): TestLimit | undefined =>
    profile.limits.find((l) => (l.key || '').toLowerCase() === k.toLowerCase());

  const within = (v: number | undefined, limit?: TestLimit): boolean => {
    if (v === undefined || isNaN(v)) return true;
    if (!limit) return true;
    if (limit.min !== undefined && v < limit.min) return false;
    if (limit.max !== undefined && v > limit.max) return false;
    return true;
  };

  let allOk = true;

  switch (type) {
    case 'dual_age': {
      const l7 = byKey('age7') || (profile.limits.length >= 1 && !profile.limits[0].key ? profile.limits[0] : undefined);
      const l28 = byKey('age28') || (profile.limits.length >= 2 && !profile.limits[1].key ? profile.limits[1] : undefined);
      if (!within(input.average7Days, l7)) allOk = false;
      if (!within(input.average28Days, l28)) allOk = false;
      break;
    }
    case 'multi_no_age': {
      if (!within(input.averageResult, profile.limits[0])) allOk = false;
      break;
    }
    case 'multi_field': {
      const fields = input.resultFieldsValues || {};
      for (const limit of profile.limits) {
        if (!limit.key) continue;
        const raw = fields[limit.key];
        if (raw === undefined || raw.trim() === '') continue;
        if (!within(parseFloat(raw), limit)) allOk = false;
      }
      break;
    }
    default: {
      const numeric = parseFloat(input.result || '');
      const v = isNaN(numeric) ? undefined : numeric;
      if (!within(v, profile.limits[0])) allOk = false;
      break;
    }
  }

  return allOk ? 'مطابق' : 'غير مطابق';
}
