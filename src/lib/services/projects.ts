import { PROJECTS_COLLECTION_ID, SAMPLES_COLLECTION_ID, TESTS_COLLECTION_ID } from '@/lib/constants';
import { listDocuments, getDocument, createDocument, updateDocument, deleteDocument, Query } from './base';
import type { Project, PaginatedResult } from '@/types';

const COL = PROJECTS_COLLECTION_ID;

export async function listProjects(queries: string[] = []): Promise<PaginatedResult<Project>> {
  return listDocuments<Project>(COL, queries);
}

export async function getProject(id: string): Promise<Project> {
  return getDocument<Project>(COL, id);
}

export async function createProject(id: string, data: Record<string, unknown>): Promise<Project> {
  return createDocument<Project>(COL, id, data);
}

export async function updateProject(id: string, data: Record<string, unknown>): Promise<Project> {
  return updateDocument<Project>(COL, id, data);
}

export async function deleteProject(id: string): Promise<void> {
  const [samples, tests] = await Promise.all([
    listDocuments(SAMPLES_COLLECTION_ID, [Query.equal('projectId', id), Query.limit(1)]),
    listDocuments(TESTS_COLLECTION_ID, [Query.equal('projectId', id), Query.limit(1)]),
  ]);
  if (samples.total > 0) throw new Error(`لا يمكن حذف المشروع لأن لديه ${samples.total} عينة مرتبطة`);
  if (tests.total > 0) throw new Error(`لا يمكن حذف المشروع لأن لديه ${tests.total} فحص/فحوصات مرتبطة`);
  return deleteDocument(COL, id);
}
