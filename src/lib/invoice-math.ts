// Pure calculation helpers for invoice/payment math.
// Extracted from the finance pages so the totals logic can be unit-tested
// without touching Appwrite. Behavior matches the page-local implementations.

export interface InvoiceLineTotal {
  total: number;
}

export function computeInvoiceTotals(
  items: InvoiceLineTotal[],
  taxRate = 0.16
): { subtotal: number; tax: number; total: number } {
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const tax = subtotal * taxRate;
  const total = subtotal + tax;
  return { subtotal, tax, total };
}

export function computeRemainingAmount(total: number, paidAmount: number): number {
  return total - paidAmount;
}