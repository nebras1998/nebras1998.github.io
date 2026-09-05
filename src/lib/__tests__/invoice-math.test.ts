import { describe, it, expect } from 'vitest';
import { computeInvoiceTotals, computeRemainingAmount } from '@/lib/invoice-math';

describe('computeInvoiceTotals', () => {
  it('returns zero totals for an empty line list', () => {
    expect(computeInvoiceTotals([])).toEqual({ subtotal: 0, tax: 0, total: 0 });
  });

  it('sums line totals as the subtotal', () => {
    const { subtotal } = computeInvoiceTotals([{ total: 100 }, { total: 150.5 }]);
    expect(subtotal).toBe(250.5);
  });

  it('applies the default 16% tax rate', () => {
    const { tax, total } = computeInvoiceTotals([{ total: 250.5 }]);
    expect(tax).toBeCloseTo(40.08, 5);
    expect(total).toBeCloseTo(290.58, 5);
  });

  it('honors a custom tax rate', () => {
    const { tax, total } = computeInvoiceTotals([{ total: 300 }], 0.05);
    expect(tax).toBeCloseTo(15, 5);
    expect(total).toBeCloseTo(315, 5);
  });

  it('does not mutate the input line items', () => {
    const items = [{ total: 100 }, { total: 50 }];
    const snapshot = JSON.stringify(items);
    computeInvoiceTotals(items);
    expect(JSON.stringify(items)).toBe(snapshot);
  });
});

describe('computeRemainingAmount', () => {
  it('computes the unpaid remainder', () => {
    expect(computeRemainingAmount(100, 60)).toBe(40);
  });

  it('returns 0 for a fully paid invoice', () => {
    expect(computeRemainingAmount(100, 100)).toBe(0);
  });

  it('returns a negative value for overpayment (kept as-is, matching old behavior)', () => {
    expect(computeRemainingAmount(100, 150)).toBe(-50);
  });
});