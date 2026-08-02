import { NOTIFICATIONS_COLLECTION_ID, DATABASE_ID } from '@/lib/constants';
import { listDocuments, getDocument, createDocument, updateDocument, deleteDocument, Query } from './base';
import { storage } from '@/lib/appwrite';
import type { Notification, PaginatedResult } from '@/types';

const COL = NOTIFICATIONS_COLLECTION_ID;

export async function listNotifications(queries: string[] = []): Promise<PaginatedResult<Notification>> {
  return listDocuments<Notification>(COL, queries);
}

export async function getNotification(id: string): Promise<Notification> {
  return getDocument<Notification>(COL, id);
}

export async function createNotification(data: {
  type: string;
  message: string;
  relatedId?: string;
  employeeId: string;
  employeeName: string;
}): Promise<Notification> {
  return createDocument<Notification>(COL, 'unique()', {
    type: data.type,
    message: data.message,
    relatedId: data.relatedId || '',
    employeeId: data.employeeId,
    employeeName: data.employeeName,
    isRead: false,
  });
}

export async function markAsRead(id: string): Promise<Notification> {
  return updateDocument<Notification>(COL, id, { isRead: true });
}

export async function toggleRead(id: string, currentRead: boolean): Promise<Notification> {
  return updateDocument<Notification>(COL, id, { isRead: !currentRead });
}

export async function updateNotification(id: string, data: Record<string, unknown>): Promise<Notification> {
  return updateDocument<Notification>(COL, id, data);
}

export async function deleteNotification(id: string): Promise<void> {
  return deleteDocument(COL, id);
}
