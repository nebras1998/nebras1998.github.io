import { ATTENDANCE_COLLECTION_ID } from '@/lib/constants';
import { listDocuments, getDocument, createDocument, updateDocument, deleteDocument, Query } from './base';
import type { AttendanceRecord, PaginatedResult } from '@/types';

const COL = ATTENDANCE_COLLECTION_ID;

export async function listAttendance(queries: string[] = []): Promise<PaginatedResult<AttendanceRecord>> {
  return listDocuments<AttendanceRecord>(COL, queries);
}

export async function getAttendance(id: string): Promise<AttendanceRecord> {
  return getDocument<AttendanceRecord>(COL, id);
}

export async function createAttendance(id: string, data: Record<string, unknown>): Promise<AttendanceRecord> {
  return createDocument<AttendanceRecord>(COL, id, data);
}

export async function updateAttendance(id: string, data: Record<string, unknown>): Promise<AttendanceRecord> {
  return updateDocument<AttendanceRecord>(COL, id, data);
}

export async function deleteAttendance(id: string): Promise<void> {
  return deleteDocument(COL, id);
}
