import { INVOICES_COLLECTION_ID } from '@/lib/constants';
import { listDocuments, getDocument, createDocument, updateDocument, deleteDocument, Query } from './base';
import type { Invoice, PaginatedResult } from '@/types';

const COL = INVOICES_COLLECTION_ID;

export async function listInvoices(queries: string[] = []): Promise<PaginatedResult<Invoice>> {
  return listDocuments<Invoice>(COL, queries);
}

export async function getInvoice(id: string): Promise<Invoice> {
  return getDocument<Invoice>(COL, id);
}

export async function createInvoice(id: string, data: Record<string, unknown>): Promise<Invoice> {
  return createDocument<Invoice>(COL, id, data);
}

export async function updateInvoice(id: string, data: Record<string, unknown>): Promise<Invoice> {
  return updateDocument<Invoice>(COL, id, data);
}

export async function deleteInvoice(id: string): Promise<void> {
  return deleteDocument(COL, id);
}
