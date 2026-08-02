import { TESTS_COLLECTION_ID } from '@/lib/constants';
import { listDocuments, getDocument, createDocument, updateDocument, deleteDocument, Query } from './base';
import type { Test, PaginatedResult } from '@/types';

const COL = TESTS_COLLECTION_ID;

export async function listTests(queries: string[] = []): Promise<PaginatedResult<Test>> {
  return listDocuments<Test>(COL, queries);
}

export async function getTest(id: string): Promise<Test> {
  return getDocument<Test>(COL, id);
}

export async function createTest(id: string, data: Record<string, unknown>): Promise<Test> {
  return createDocument<Test>(COL, id, data);
}

export async function updateTest(id: string, data: Record<string, unknown>): Promise<Test> {
  return updateDocument<Test>(COL, id, data);
}

export async function deleteTest(id: string): Promise<void> {
  return deleteDocument(COL, id);
}
