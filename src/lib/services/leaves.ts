import { LEAVE_REQUESTS_COLLECTION_ID } from '@/lib/constants';
import { listDocuments, getDocument, createDocument, updateDocument, deleteDocument, Query } from './base';
import type { LeaveRequest, PaginatedResult } from '@/types';

const COL = LEAVE_REQUESTS_COLLECTION_ID;

export async function listLeaveRequests(queries: string[] = []): Promise<PaginatedResult<LeaveRequest>> {
  return listDocuments<LeaveRequest>(COL, queries);
}

export async function getLeaveRequest(id: string): Promise<LeaveRequest> {
  return getDocument<LeaveRequest>(COL, id);
}

export async function createLeaveRequest(id: string, data: Record<string, unknown>): Promise<LeaveRequest> {
  return createDocument<LeaveRequest>(COL, id, data);
}

export async function updateLeaveRequest(id: string, data: Record<string, unknown>): Promise<LeaveRequest> {
  return updateDocument<LeaveRequest>(COL, id, data);
}

export async function deleteLeaveRequest(id: string): Promise<void> {
  return deleteDocument(COL, id);
}
