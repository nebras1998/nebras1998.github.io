'use client';

import { useEffect, useState } from 'react';
import { databases } from '@/lib/appwrite';
import { Query } from 'appwrite';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import { DATABASE_ID, NOTIFICATIONS_COLLECTION_ID } from '@/lib/constants';
import { toast } from 'sonner';
import { Bell, Check } from 'lucide-react';

export default function NotificationsPage() {
  const [notifs, setNotifs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifs = async () => {
    try {
      const res = await databases.listDocuments(DATABASE_ID, NOTIFICATIONS_COLLECTION_ID, [
        Query.orderDesc('$createdAt'),
        Query.limit(100),
      ]);
      setNotifs(res.documents);
    } catch (err) {
      toast.error('فشل تحميل التنبيهات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchNotifs(); }, []);

  const markAllRead = async () => {
    for (const n of notifs) {
      if (!n.isRead) {
        await databases.updateDocument(DATABASE_ID, NOTIFICATIONS_COLLECTION_ID, n.$id, { isRead: true });
      }
    }
    fetchNotifs();
    toast.success('تم تعليم الكل كمقروء');
  };

  const toggleRead = async (id: string, current: boolean) => {
    await databases.updateDocument(DATABASE_ID, NOTIFICATIONS_COLLECTION_ID, id, { isRead: !current });
    fetchNotifs();
  };

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="max-w-3xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Bell size={24} /> التنبيهات
            </h1>
            <button onClick={markAllRead} className="text-blue-600 hover:underline flex items-center gap-1">
              <Check size={16} /> تعليم الكل مقروء
            </button>
          </div>

          {loading ? <p>جارٍ التحميل...</p> : (
            <div className="space-y-2">
              {notifs.length === 0 ? (
                <p className="text-center text-gray-500">لا توجد تنبيهات</p>
              ) : (
                notifs.map(n => (
                  <div
                    key={n.$id}
                    className={`p-4 rounded-lg border cursor-pointer ${n.isRead ? 'bg-white' : 'bg-blue-50 border-blue-200'}`}
                    onClick={() => toggleRead(n.$id, n.isRead)}
                  >
                    <div className="flex justify-between">
                      <p className="font-medium">{n.message}</p>
                      {n.isRead ? <Check size={16} className="text-green-500" /> : <span className="w-2 h-2 rounded-full bg-blue-600 mt-2" />}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
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