'use client';

import { useEffect, useState } from 'react';
import type { Notification } from '@/types';
import { listNotifications, updateNotification } from '@/lib/services/notifications';
import { Query } from '@/lib/services';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import { toast } from 'sonner';
import { Bell, Check } from 'lucide-react';

export default function NotificationsPage() {
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await listNotifications([
          Query.orderDesc('$createdAt'),
          Query.limit(100),
        ]);
        setNotifs(res.documents);
      } catch {
        toast.error('فشل تحميل التنبيهات');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const markAllRead = async () => {
    for (const n of notifs) {
      if (!n.isRead) {
        await updateNotification(n.$id, { isRead: true });
      }
    }
    setNotifs(prev => prev.map(n => ({ ...n, isRead: true })));
    toast.success('تم تعليم الكل كمقروء');
  };

  const toggleRead = async (id: string, current: boolean) => {
    await updateNotification(id, { isRead: !current });
    setNotifs(prev => prev.map(n => n.$id === id ? { ...n, isRead: !current } : n));
  };

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="max-w-3xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Bell size={24} /> التنبيهات
            </h1>
            <button onClick={markAllRead} className="text-petrol hover:underline flex items-center gap-1">
              <Check size={16} /> تعليم الكل مقروء
            </button>
          </div>

          {loading ? <p>جارٍ التحميل...</p> : (
            <div className="space-y-2">
              {notifs.length === 0 ? (
                <p className="text-center text-concrete-500">لا توجد تنبيهات</p>
              ) : (
                notifs.map(n => (
                  <div
                    key={n.$id}
                    className={`p-4 rounded-lg border cursor-pointer ${n.isRead ? 'bg-concrete-0 border-concrete-200' : 'bg-petrol-soft border-petrol'}`}
                    onClick={() => toggleRead(n.$id, n.isRead)}
                  >
                    <div className="flex justify-between">
                      <p className="font-medium">{n.message}</p>
                      {n.isRead ? <Check size={16} className="text-petrol" /> : <span className="w-2 h-2 rounded-full bg-petrol mt-2" />}
                    </div>
                    <p className="text-xs text-concrete-500 mt-1">
                      {n.employeeName} - {new Date(n.$createdAt).toLocaleString('ar-EG')}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}