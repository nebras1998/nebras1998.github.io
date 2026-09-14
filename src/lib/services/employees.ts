import { EMPLOYEES_COLLECTION_ID } from '@/lib/constants';
import { listDocuments, getDocument, Query } from './base';
import type { Employee, PaginatedResult } from '@/types';

const COL = EMPLOYEES_COLLECTION_ID;

export async function listEmployees(queries: string[] = []): Promise<PaginatedResult<Employee>> {
  return listDocuments<Employee>(COL, queries);
}

export async function getEmployee(id: string): Promise<Employee> {
  return getDocument<Employee>(COL, id);
}

// Mutations are routed through the server API (node-appwrite + API key) so that
// the public Appwrite collection permissions (read-only for users) can never be
// bypassed from the browser to escalate privileges or forge data.

function errorFromResponse(res: Response, data: { error?: string }): Error {
  const err = Object.assign(new Error(data?.error ?? `فشل الطلب (${res.status})`), {
    code: res.status,
    status: res.status,
  });
  return err;
}

export async function createEmployee(id: string, data: Record<string, unknown>): Promise<Employee> {
  const res = await fetch('/api/employees', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ documentId: id, ...data }),
  });
  const body = await res.json();
  if (!res.ok) throw errorFromResponse(res, body);
  return body as Employee;
}

export async function updateEmployee(id: string, data: Record<string, unknown>): Promise<Employee> {
  const res = await fetch(`/api/employees/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const body = await res.json();
  if (!res.ok) throw errorFromResponse(res, body);
  return body as Employee;
}

export async function updateMyEmployee(data: Record<string, unknown>): Promise<Employee> {
  const res = await fetch('/api/employees/me', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const body = await res.json();
  if (!res.ok) throw errorFromResponse(res, body);
  return body as Employee;
}

export async function deleteEmployee(id: string): Promise<void> {
  const res = await fetch(`/api/employees/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw errorFromResponse(res, body);
  }
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
