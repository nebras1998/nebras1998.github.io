import { PAYMENTS_COLLECTION_ID } from '@/lib/constants';
import { listDocuments, getDocument, createDocument, updateDocument, deleteDocument } from './base';
import type { Payment, PaginatedResult } from '@/types';

const COL = PAYMENTS_COLLECTION_ID;

export async function listPayments(queries: string[] = []): Promise<PaginatedResult<Payment>> {
  return listDocuments<Payment>(COL, queries);
}

export async function getPayment(id: string): Promise<Payment> {
  return getDocument<Payment>(COL, id);
}

export async function createPayment(id: string, data: Record<string, unknown>): Promise<Payment> {
  return createDocument<Payment>(COL, id, data);
}

export async function updatePayment(id: string, data: Record<string, unknown>): Promise<Payment> {
  return updateDocument<Payment>(COL, id, data);
}

export async function deletePayment(id: string): Promise<void> {
  return deleteDocument(COL, id);
}
