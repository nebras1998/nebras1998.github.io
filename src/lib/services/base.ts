import { databases } from '@/lib/appwrite';
import { DATABASE_ID } from '@/lib/constants';
import { Query } from 'appwrite';
import type { PaginatedResult } from '@/types';

export { Query };

export async function listDocuments<T>(
  collectionId: string,
  queries: string[] = []
): Promise<PaginatedResult<T>> {
  const response = await databases.listDocuments(DATABASE_ID, collectionId, queries);
  return { documents: response.documents as unknown as T[], total: response.total };
}

export async function getDocument<T>(
  collectionId: string,
  documentId: string
): Promise<T> {
  return databases.getDocument(DATABASE_ID, collectionId, documentId) as unknown as Promise<T>;
}

export async function createDocument<T>(
  collectionId: string,
  documentId: string,
  data: Record<string, unknown>
): Promise<T> {
  return databases.createDocument(DATABASE_ID, collectionId, documentId, data) as unknown as Promise<T>;
}

export async function updateDocument<T>(
  collectionId: string,
  documentId: string,
  data: Record<string, unknown>
): Promise<T> {
  return databases.updateDocument(DATABASE_ID, collectionId, documentId, data) as unknown as Promise<T>;
}

export async function deleteDocument(
  collectionId: string,
  documentId: string
): Promise<void> {
  await databases.deleteDocument(DATABASE_ID, collectionId, documentId);
}
