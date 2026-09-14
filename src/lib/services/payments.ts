import { PAYMENTS_COLLECTION_ID } from '@/lib/constants';
import { listDocuments, getDocument } from './base';
import type { Payment, PaginatedResult } from '@/types';

const COL = PAYMENTS_COLLECTION_ID;

function errorFromResponse(res: Response, data: { error?: string }): Error {
  return Object.assign(new Error(data?.error ?? `فشل الطلب (${res.status})`), {
    code: res.status,
    status: res.status,
  });
}

export async function listPayments(queries: string[] = []): Promise<PaginatedResult<Payment>> {
  return listDocuments<Payment>(COL, queries);
}

export async function getPayment(id: string): Promise<Payment> {
  return getDocument<Payment>(COL, id);
}

// Mutations are routed through the server API (node-appwrite + API key). The
// payments collection is locked down to read("users") so browser writes are refused.

export async function createPayment(_id: string, data: Record<string, unknown>): Promise<Payment> {
  const res = await fetch('/api/finance/payments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const body = (await res.json()) as unknown;
  if (!res.ok) throw errorFromResponse(res, body as { error?: string });
  return body as Payment;
}

export async function updatePayment(id: string, data: Record<string, unknown>): Promise<Payment> {
  const res = await fetch(`/api/finance/payments/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const body = (await res.json()) as unknown;
  if (!res.ok) throw errorFromResponse(res, body as { error?: string });
  return body as Payment;
}

export async function deletePayment(id: string): Promise<void> {
  const res = await fetch(`/api/finance/payments/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw errorFromResponse(res, body);
  }
}