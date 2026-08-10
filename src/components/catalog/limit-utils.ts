// Shared helpers for building specification profile limits based on the
// selected result type. All identifiers/comments are English.

import type { ResultFieldDef, SpecificationProfile, TestLimit, TestResultType } from '@/lib/test-config';

// Returns the default limit rows a profile should start with for a result type.
// - dual_age: two rows with programmatic keys age7/age28.
// - multi_field: one row per result field, key auto-bound to the field key.
// - single / multi_no_age: a single keyless row.
export function initialLimits(type: TestResultType, fields: ResultFieldDef[]): TestLimit[] {
  if (type === 'dual_age') return [{ key: 'age7' }, { key: 'age28' }];
  if (type === 'multi_field') return fields.map((f) => ({ key: f.key }));
  return [{}];
}

// Rebuilds the limits of a profile to match a (possibly changed) result type,
// preserving any existing min/max values by key.
export function adaptLimits(type: TestResultType, current: TestLimit[], fields: ResultFieldDef[]): TestLimit[] {
  const byKey = (k: string) => current.find((l) => (l.key || '').toLowerCase() === k.toLowerCase());
  if (type === 'dual_age') {
    return ['age7', 'age28'].map((k) => ({ key: k, min: byKey(k)?.min, max: byKey(k)?.max }));
  }
  if (type === 'multi_field') {
    return fields.map((f) => ({ key: f.key, min: byKey(f.key)?.min, max: byKey(f.key)?.max }));
  }
  return [{ min: current[0]?.min, max: current[0]?.max }];
}

// String helper for number inputs: empty string -> undefined.
export function numOrUndef(v: string): number | undefined {
  return v === '' ? undefined : Number(v);
}

export function normalizeProfileLimits(type: TestResultType, profile: SpecificationProfile, fields: ResultFieldDef[]): SpecificationProfile {
  return { ...profile, limits: adaptLimits(type, profile.limits, fields) };
}
