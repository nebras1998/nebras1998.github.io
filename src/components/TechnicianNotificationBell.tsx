'use client';

import { useEffect, useState } from 'react';
import { databases, client } from '@/lib/appwrite';
import { DATABASE_ID, NOTIFICATIONS_COLLECTION_ID } from '@/lib/constants';
import { Query } from 'appwrite';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import type { Notification } from '@/types';

// جرس تنبيهات خاص بقسم الفني: يوجه إلى /technician/notifications
// (نظير NotificationBell الخاص بالإدارة الذي يشير لمسار /dashboard).
export default function TechnicianNotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const employee = useAuthStore((s) => s.employee);
  const employeeId = employee?.$id ?? null;

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

  useEffect(() => {
    if (!employeeId) return;

    const unsubscribe = client.subscribe(
      `databases.${DATABASE_ID}.collections.${NOTIFICATIONS_COLLECTION_ID}.documents`,
      (response) => {
        if (response.events.includes('databases.*.collections.*.documents.*.create')) {
          const payload = response.payload as Notification;
          if (payload?.employeeId === employeeId) {
            setUnreadCount((prev) => prev + 1);
          }
        }
      }
    );

    return () => unsubscribe();
  }, [employeeId]);

  return (
    <Link href="/technician/notifications" className="relative p-2 rounded-xl hover:bg-white/10" aria-label="التنبيهات">
      <Bell size={22} className="text-white" />
      {unreadCount > 0 && (
        <span className="absolute -top-0 -right-0 bg-danger-solid text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </Link>
  );
}