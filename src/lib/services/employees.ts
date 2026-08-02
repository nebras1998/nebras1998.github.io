import { EMPLOYEES_COLLECTION_ID } from '@/lib/constants';
import { listDocuments, getDocument, createDocument, updateDocument, deleteDocument, Query } from './base';
import type { Employee, PaginatedResult } from '@/types';

const COL = EMPLOYEES_COLLECTION_ID;

export async function listEmployees(queries: string[] = []): Promise<PaginatedResult<Employee>> {
  return listDocuments<Employee>(COL, queries);
}

export async function getEmployee(id: string): Promise<Employee> {
  return getDocument<Employee>(COL, id);
}

export async function createEmployee(id: string, data: Record<string, unknown>): Promise<Employee> {
  return createDocument<Employee>(COL, id, data);
}

export async function updateEmployee(id: string, data: Record<string, unknown>): Promise<Employee> {
  return updateDocument<Employee>(COL, id, data);
}

export async function deleteEmployee(id: string): Promise<void> {
  return deleteDocument(COL, id);
}

export async function findEmployeeByEmail(email: string): Promise<Employee | null> {
  const res = await listDocuments<Employee>(COL, [
    Query.equal('email', email),
    Query.limit(1),
  ]);
  return res.documents[0] ?? null;
}
