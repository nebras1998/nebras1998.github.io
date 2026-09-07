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

// يُستدعى من الواجهات الإدارية عند إسناد فحص لفني، بحيث يظهر
// إشعار داخل تطبيق الفني (صفحة /technician/notifications).
export async function notifyTestAssignment(params: {
  testId: string;
  testName: string;
  testNumber?: string;
  technicianId: string;
  technicianName: string;
}) {
  if (!params.technicianId) return;
  try {
    await databases.createDocument(
      DATABASE_ID,
      NOTIFICATIONS_COLLECTION_ID,
      ID.unique(),
      {
        type: 'مهمة_جديدة',
        message: `تم إسناد فحص "${params.testName}" إليك${params.testNumber ? ` (${params.testNumber})` : ''}.`,
        relatedId: params.testId,
        employeeId: params.technicianId,
        employeeName: params.technicianName,
        isRead: false,
      }
    );
  } catch (err) {
    console.error('فشل إرسال إشعار الإسناد:', err);
  }
}