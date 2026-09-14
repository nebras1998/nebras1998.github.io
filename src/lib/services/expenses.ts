import { EXPENSES_COLLECTION_ID } from '@/lib/constants';
import { listDocuments, getDocument } from './base';
import type { Expense, PaginatedResult } from '@/types';

const COL = EXPENSES_COLLECTION_ID;

function errorFromResponse(res: Response, data: { error?: string }): Error {
  return Object.assign(new Error(data?.error ?? `فشل الطلب (${res.status})`), {
    code: res.status,
    status: res.status,
  });
}

export async function listExpenses(queries: string[] = []): Promise<PaginatedResult<Expense>> {
  return listDocuments<Expense>(COL, queries);
}

export async function getExpense(id: string): Promise<Expense> {
  return getDocument<Expense>(COL, id);
}

// Mutations are routed through the server API (node-appwrite + API key). The
// expenses collection is locked down to read("users") so browser writes are refused.

export async function createExpense(id: string, data: Record<string, unknown>): Promise<Expense> {
  const res = await fetch('/api/finance/expenses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ documentId: id, ...data }),
  });
  const body = (await res.json()) as unknown;
  if (!res.ok) throw errorFromResponse(res, body as { error?: string });
  return body as Expense;
}

export async function updateExpense(id: string, data: Record<string, unknown>): Promise<Expense> {
  const res = await fetch(`/api/finance/expenses/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const body = (await res.json()) as unknown;
  if (!res.ok) throw errorFromResponse(res, body as { error?: string });
  return body as Expense;
}

export async function deleteExpense(id: string): Promise<void> {
  const res = await fetch(`/api/finance/expenses/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw errorFromResponse(res, body);
  }
}