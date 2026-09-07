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

// قائمة (مدير/إداري) المتلقين المخزّنة مؤقتًا لمنع جلب جميع الموظفين
// عند كل عملية حفظ (كانت تُجلب 200 وثيقة لكل حفظ نتيجة فحص أو بلاغ).
const managerCache: { promise: Promise<Employee[]> | null; at: number } = { promise: null, at: 0 };
const MANAGER_CACHE_TTL_MS = 5 * 60 * 1000;

export function getManagerRecipients(): Promise<Employee[]> {
  const now = Date.now();
  if (managerCache.promise && now - managerCache.at < MANAGER_CACHE_TTL_MS) {
    return managerCache.promise;
  }
  managerCache.promise = (async () => {
    const res = await listDocuments<Employee>(COL, [
      Query.equal('status', 'يعمل'),
      Query.limit(200),
    ]);
    return res.documents.filter((e) => e.role === 'مدير' || e.role === 'إداري');
  })();
  managerCache.at = now;
  return managerCache.promise;
}
