import { databases } from '@/lib/appwrite';
import { DATABASE_ID } from '@/lib/constants';

// سنحتاج معرف المجموعة، أضفه في constants.ts
import { NOTIFICATIONS_COLLECTION_ID } from '@/lib/constants';
import { ID } from 'appwrite';

interface CreateNotificationParams {
  type: string;
  message: string;
  relatedId?: string;
  employeeId: string;
  employeeName: string;
}

export async function createNotification(params: CreateNotificationParams) {
  try {
    await databases.createDocument(
      DATABASE_ID,
      NOTIFICATIONS_COLLECTION_ID,
      ID.unique(),
      {
        type: params.type,
        message: params.message,
        relatedId: params.relatedId || '',
        employeeId: params.employeeId,
        employeeName: params.employeeName,
        isRead: false,
      }
    );
  } catch (err) {
    console.error('فشل إنشاء التنبيه:', err);
  }
}