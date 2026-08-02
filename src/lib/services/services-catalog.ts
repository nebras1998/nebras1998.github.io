import { SERVICES_COLLECTION_ID } from '@/lib/constants';
import { listDocuments, getDocument, createDocument, updateDocument, deleteDocument, Query } from './base';
import type { PaginatedResult } from '@/types';

export interface ServiceItem {
  $id: string;
  $createdAt: string;
  name: string;
  description?: string;
  price: number;
  unit?: string;
  category?: string;
}

const COL = SERVICES_COLLECTION_ID;

export async function listServices(queries: string[] = []): Promise<PaginatedResult<ServiceItem>> {
  return listDocuments<ServiceItem>(COL, queries);
}

export async function getService(id: string): Promise<ServiceItem> {
  return getDocument<ServiceItem>(COL, id);
}

export async function createService(id: string, data: Record<string, unknown>): Promise<ServiceItem> {
  return createDocument<ServiceItem>(COL, id, data);
}

export async function updateService(id: string, data: Record<string, unknown>): Promise<ServiceItem> {
  return updateDocument<ServiceItem>(COL, id, data);
}

export async function deleteService(id: string): Promise<void> {
  return deleteDocument(COL, id);
}
