import { OVERTIME_COLLECTION_ID } from '@/lib/constants';
import { listDocuments, getDocument, createDocument, updateDocument, deleteDocument, Query } from './base';
import type { OvertimeRecord, PaginatedResult } from '@/types';

const COL = OVERTIME_COLLECTION_ID;

export async function listOvertime(queries: string[] = []): Promise<PaginatedResult<OvertimeRecord>> {
  return listDocuments<OvertimeRecord>(COL, queries);
}

export async function getOvertime(id: string): Promise<OvertimeRecord> {
  return getDocument<OvertimeRecord>(COL, id);
}

export async function createOvertime(id: string, data: Record<string, unknown>): Promise<OvertimeRecord> {
  return createDocument<OvertimeRecord>(COL, id, data);
}

export async function updateOvertime(id: string, data: Record<string, unknown>): Promise<OvertimeRecord> {
  return updateDocument<OvertimeRecord>(COL, id, data);
}

export async function deleteOvertime(id: string): Promise<void> {
  return deleteDocument(COL, id);
}
