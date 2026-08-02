import { SAMPLE_TYPES_COLLECTION_ID, STANDARD_TESTS_COLLECTION_ID } from '@/lib/constants';
import { listDocuments, getDocument, createDocument, updateDocument, deleteDocument, Query } from './base';
import type { PaginatedResult } from '@/types';

export interface SampleType {
  $id: string;
  $createdAt: string;
  name: string;
  code?: string;
  description?: string;
}

export interface StandardTest {
  $id: string;
  $createdAt: string;
  name: string;
  sampleTypeId: string;
  duration?: string;
  standard?: string;
  specification?: string;
  unit?: string;
  price?: number;
}

export async function listSampleTypes(queries: string[] = []): Promise<PaginatedResult<SampleType>> {
  return listDocuments<SampleType>(SAMPLE_TYPES_COLLECTION_ID, queries);
}

export async function getSampleType(id: string): Promise<SampleType> {
  return getDocument<SampleType>(SAMPLE_TYPES_COLLECTION_ID, id);
}

export async function createSampleType(id: string, data: Record<string, unknown>): Promise<SampleType> {
  return createDocument<SampleType>(SAMPLE_TYPES_COLLECTION_ID, id, data);
}

export async function listStandardTests(queries: string[] = []): Promise<PaginatedResult<StandardTest>> {
  return listDocuments<StandardTest>(STANDARD_TESTS_COLLECTION_ID, queries);
}

export async function getStandardTest(id: string): Promise<StandardTest> {
  return getDocument<StandardTest>(STANDARD_TESTS_COLLECTION_ID, id);
}

export async function createStandardTest(id: string, data: Record<string, unknown>): Promise<StandardTest> {
  return createDocument<StandardTest>(STANDARD_TESTS_COLLECTION_ID, id, data);
}

export async function updateStandardTest(id: string, data: Record<string, unknown>): Promise<StandardTest> {
  return updateDocument<StandardTest>(STANDARD_TESTS_COLLECTION_ID, id, data);
}
