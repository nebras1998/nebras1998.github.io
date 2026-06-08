'use client';

import { useEffect, useState } from 'react';
import { databases, client } from '@/lib/appwrite';
import { DATABASE_ID, NOTIFICATIONS_COLLECTION_ID } from '@/lib/constants';
import { Query } from 'appwrite';
import Link from 'next/link';
import { Bell } from 'lucide-react';

export default function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);

  // جلب العدد الأولي
  useEffect(() => {
    const fetchCount = async () => {
      try {
        const res = await databases.listDocuments(DATABASE_ID, NOTIFICATIONS_COLLECTION_ID, [
          Query.equal('isRead', false),
          Query.limit(1),
        ]);
        setUnreadCount(res.total);
      } catch {}
    };
    fetchCount();
  }, []);

  // الاشتراك في التنبيهات الجديدة عبر Real-time
  useEffect(() => {
    const unsubscribe = client.subscribe(
      `databases.${DATABASE_ID}.collections.${NOTIFICATIONS_COLLECTION_ID}.documents`,
      (response) => {
        // التحقق من أن الحدث هو إنشاء مستند جديد
        if (
          response.events.includes(
            'databases.*.collections.*.documents.*.create'
          )
        ) {
          // زيادة العداد عند وجود تنبيه جديد
          setUnreadCount((prev) => prev + 1);
        }
      }
    );

    // إلغاء الاشتراك عند إزالة المكون
    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <Link href="/dashboard/notifications" className="relative text-gray-600 hover:text-blue-600">
      <Bell size={20} />
      {unreadCount > 0 && (
        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </Link>
  );
}