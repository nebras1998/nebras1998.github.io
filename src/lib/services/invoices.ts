import { INVOICES_COLLECTION_ID } from '@/lib/constants';
import { listDocuments, getDocument } from './base';
import type { Invoice, PaginatedResult } from '@/types';

const COL = INVOICES_COLLECTION_ID;

function errorFromResponse(res: Response, data: { error?: string; detail?: string }): Error {
  const message = data?.detail ? `${data.error}` : (data?.error ?? `فشل الطلب (${res.status})`);
  return Object.assign(new Error(message), {
    code: res.status,
    status: res.status,
    detail: data?.detail ?? '',
  });
}

export async function listInvoices(queries: string[] = []): Promise<PaginatedResult<Invoice>> {
  return listDocuments<Invoice>(COL, queries);
}

export async function getInvoice(id: string): Promise<Invoice> {
  return getDocument<Invoice>(COL, id);
}

// Mutations are routed through the server API (node-appwrite + API key). The
// invoices collection is locked down to read("users") so browser writes are refused.

export async function createInvoice(id: string, data: Record<string, unknown>): Promise<Invoice> {
  const res = await fetch('/api/finance/invoices', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ documentId: id, ...data }),
  });
  const body = (await res.json()) as unknown;
  if (!res.ok) throw errorFromResponse(res, body as { error?: string });
  return body as Invoice;
}

export async function updateInvoice(id: string, data: Record<string, unknown>): Promise<Invoice> {
  const res = await fetch(`/api/finance/invoices/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const body = (await res.json()) as unknown;
  if (!res.ok) throw errorFromResponse(res, body as { error?: string });
  return body as Invoice;
}

export async function deleteInvoice(id: string): Promise<void> {
  const res = await fetch(`/api/finance/invoices/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw errorFromResponse(res, body);
  }
}