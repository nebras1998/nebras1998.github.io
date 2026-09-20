import { CLIENTS_COLLECTION_ID, PROJECTS_COLLECTION_ID, SAMPLES_COLLECTION_ID, INVOICES_COLLECTION_ID } from '@/lib/constants';
import { listDocuments, getDocument, createDocument, updateDocument, deleteDocument, Query } from './base';
import type { Client, PaginatedResult } from '@/types';

const COL = CLIENTS_COLLECTION_ID;

export async function listClients(queries: string[] = []): Promise<PaginatedResult<Client>> {
  return listDocuments<Client>(COL, queries);
}

export async function getClient(id: string): Promise<Client> {
  return getDocument<Client>(COL, id);
}

// NOTE: browser-SDK write functions are no longer used by pages (writes go
// through /api/clients server routes). Kept for backward compat/tests.

export async function createClient(id: string, data: Record<string, unknown>): Promise<Client> {
  return createDocument<Client>(COL, id, data);
}

export async function updateClient(id: string, data: Record<string, unknown>): Promise<Client> {
  return updateDocument<Client>(COL, id, data);
}

export async function deleteClient(id: string): Promise<void> {
  const [projects, samples, invoices] = await Promise.all([
    listDocuments(PROJECTS_COLLECTION_ID, [Query.equal('clientId', id), Query.limit(1)]),
    listDocuments(SAMPLES_COLLECTION_ID, [Query.equal('clientId', id), Query.limit(1)]),
    listDocuments(INVOICES_COLLECTION_ID, [Query.equal('clientId', id), Query.limit(1)]),
  ]);
  if (projects.total > 0) throw new Error(`لا يمكن حذف العميل لأن لديه ${projects.total} مشروع/مشاريع مرتبطة`);
  if (samples.total > 0) throw new Error(`لا يمكن حذف العميل لأن لديه ${samples.total} عينة مرتبطة`);
  if (invoices.total > 0) throw new Error(`لا يمكن حذف العميل لأن لديه ${invoices.total} فاتورة مرتبطة`);
  return deleteDocument(COL, id);
}
