import { describe, it, expect } from 'vitest';
import { computeWorkHours, formatWorkHours, computeLeaveDays } from '@/lib/work-time';

describe('computeWorkHours', () => {
  it('returns 0 when either time is missing', () => {
    expect(computeWorkHours()).toBe(0);
    expect(computeWorkHours('08:00')).toBe(0);
    expect(computeWorkHours(undefined, '17:00')).toBe(0);
  });

  it('computes full hours within the same day', () => {
    expect(computeWorkHours('08:00', '17:00')).toBe(9);
  });

  it('computes fractional hours', () => {
    expect(computeWorkHours('08:30', '10:00')).toBe(1.5);
    expect(computeWorkHours('08:15', '17:30')).toBe(9.25);
  });

  it('returns 0 when the end time is not after the start time', () => {
    expect(computeWorkHours('17:00', '08:00')).toBe(0);
    expect(computeWorkHours('17:00', '17:00')).toBe(0);
  });
});

describe('formatWorkHours', () => {
  it('formats fractional hours with two decimals', () => {
    expect(formatWorkHours(9.25)).toBe('9.25');
  });

  it('formats whole hours', () => {
    expect(formatWorkHours(2)).toBe('2.00');
  });

  it('formats zero', () => {
    expect(formatWorkHours(0)).toBe('0.00');
  });
});

describe('computeLeaveDays', () => {
  it('returns 0 when either date is missing', () => {
    expect(computeLeaveDays()).toBe(0);
    expect(computeLeaveDays('2026-01-01')).toBe(0);
    expect(computeLeaveDays(undefined, '2026-01-03')).toBe(0);
  });

  it('counts both endpoints', () => {
    expect(computeLeaveDays('2026-01-01', '2026-01-03')).toBe(3);
  });

  it('returns 1 for a single day', () => {
    expect(computeLeaveDays('2026-01-05', '2026-01-05')).toBe(1);
  });

  it('returns 0 when the range is inverted', () => {
    expect(computeLeaveDays('2026-01-10', '2026-01-08')).toBe(0);
  });
});