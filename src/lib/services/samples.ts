import { SAMPLES_COLLECTION_ID, TESTS_COLLECTION_ID } from '@/lib/constants';
import { listDocuments, getDocument, createDocument, updateDocument, deleteDocument, Query } from './base';
import type { Sample, PaginatedResult } from '@/types';

const COL = SAMPLES_COLLECTION_ID;

export async function listSamples(queries: string[] = []): Promise<PaginatedResult<Sample>> {
  return listDocuments<Sample>(COL, queries);
}

export async function getSample(id: string): Promise<Sample> {
  return getDocument<Sample>(COL, id);
}

export async function createSample(id: string, data: Record<string, unknown>): Promise<Sample> {
  return createDocument<Sample>(COL, id, data);
}

export async function updateSample(id: string, data: Record<string, unknown>): Promise<Sample> {
  return updateDocument<Sample>(COL, id, data);
}

export async function deleteSample(id: string): Promise<void> {
  const tests = await listDocuments(TESTS_COLLECTION_ID, [Query.equal('sampleId', id), Query.limit(1)]);
  if (tests.total > 0) throw new Error(`لا يمكن حذف العينة لأن لديه ${tests.total} فحص/فحوصات مرتبطة`);
  return deleteDocument(COL, id);
}
