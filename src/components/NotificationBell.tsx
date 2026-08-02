'use client';

import { useEffect, useState } from 'react';
import { databases, client } from '@/lib/appwrite';
import { DATABASE_ID, NOTIFICATIONS_COLLECTION_ID } from '@/lib/constants';
import { Query } from 'appwrite';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import type { Notification } from '@/types';

export default function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const employee = useAuthStore((s) => s.employee);
  const employeeId = employee?.$id ?? null;

  // جلب العدد الأولي مُصفّى بـ employeeId الخاص بالمستخدم الحالي
  useEffect(() => {
    if (!employeeId) return;

    const fetchCount = async () => {
      try {
        const res = await databases.listDocuments(DATABASE_ID, NOTIFICATIONS_COLLECTION_ID, [
          Query.equal('isRead', false),
          Query.equal('employeeId', employeeId),
          Query.limit(1),
        ]);
        setUnreadCount(res.total);
      } catch (e) {
        console.warn('فشل جلب عدد التنبيهات:', e);
      }
    };
    fetchCount();
  }, [employeeId]);

  // الاشتراك في التنبيهات الجديدة عبر Real-time مع تصفية بـ employeeId
  useEffect(() => {
    if (!employeeId) return;

    const unsubscribe = client.subscribe(
      `databases.${DATABASE_ID}.collections.${NOTIFICATIONS_COLLECTION_ID}.documents`,
      (response) => {
        // التحقق من أن الحدث هو إنشاء مستند جديد
        if (
          response.events.includes(
            'databases.*.collections.*.documents.*.create'
          )
        ) {
          // نتحقق أن التنبيه الجديد موجّه لهذا الموظف تحديداً
          const payload = response.payload as Notification;
          if (payload?.employeeId === employeeId) {
            setUnreadCount((prev) => prev + 1);
          }
        }
      }
    );

    // إلغاء الاشتراك عند إزالة المكون
    return () => {
      unsubscribe();
    };
  }, [employeeId]);

  return (
    <Link href="/dashboard/notifications" className="relative text-concrete-500 hover:text-petrol">
      <Bell size={20} />
      {unreadCount > 0 && (
        <span className="absolute -top-2 -right-2 bg-danger-solid text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </Link>
  );
}