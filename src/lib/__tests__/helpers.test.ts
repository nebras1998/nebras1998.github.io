import { describe, it, expect } from 'vitest';
import { formatDateAr } from '@/lib/helpers';

describe('formatDateAr', () => {
  it('returns a dash for an empty/missing value', () => {
    expect(formatDateAr()).toBe('-');
    expect(formatDateAr('')).toBe('-');
    expect(formatDateAr(null as unknown as string)).toBe('-');
  });

  it('returns the raw value when the date is invalid', () => {
    expect(formatDateAr('not-a-date')).toBe('not-a-date');
  });

  it('formats a valid date as a non-empty Arabic string', () => {
    const formatted = formatDateAr('2026-05-01');
    expect(formatted).not.toBe('-');
    expect(formatted).not.toBe('2026-05-01');
    expect(formatted.length).toBeGreaterThan(0);
  });

  it('is deterministic for the same input', () => {
    const a = formatDateAr('2026-05-01');
    const b = formatDateAr('2026-05-01');
    expect(a).toBe(b);
  });
});