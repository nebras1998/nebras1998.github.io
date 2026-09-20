'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import type { Notification } from '@/types';
import { listNotifications } from '@/lib/services/notifications';
import { apiFetch } from '@/lib/api-client';
import { Query } from '@/lib/services';
import { toast } from 'sonner';
import { ArrowRight, Bell, Check } from 'lucide-react';
import TechnicianBottomNav from '@/components/TechnicianBottomNav';
import TableSkeleton from '@/components/TableSkeleton';
import EmptyData from '@/components/EmptyData';

export default function TechnicianNotificationsPage() {
  const router = useRouter();
  const { employee } = useAuthStore();
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!employee) return;
    (async () => {
      try {
        const res = await listNotifications([
          Query.equal('employeeId', employee.$id),
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
  }, [employee]);

  const markAllRead = async () => {
    for (const n of notifs) {
      if (!n.isRead) {
        await apiFetch('/api/notifications/' + n.$id, { method: 'PATCH', body: JSON.stringify({ isRead: true }) });
      }
    }
    setNotifs(prev => prev.map(n => ({ ...n, isRead: true })));
    toast.success('تم تعليم الكل كمقروء');
  };

  const toggleRead = async (id: string, current: boolean) => {
    await apiFetch('/api/notifications/' + id, { method: 'PATCH', body: JSON.stringify({ isRead: !current }) });
    setNotifs(prev => prev.map(n => n.$id === id ? { ...n, isRead: !current } : n));
  };

  return (
    <div className="min-h-screen bg-surface-dim pb-20" dir="rtl">
      <header className="bg-primary text-white p-4 flex items-center justify-between shadow">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-white"><ArrowRight size={24} /></button>
          <h1 className="text-lg font-bold flex items-center gap-2"><Bell size={20} /> التنبيهات</h1>
        </div>
        <button onClick={markAllRead} className="text-white text-sm font-semibold flex items-center gap-1 px-3 py-2 rounded-xl hover:bg-white/10">
          <Check size={16} /> تعليم الكل مقروء
        </button>
      </header>

      <main className="p-4">
        {loading ? <TableSkeleton rows={5} cols={2} /> : (
          <div className="space-y-2">
            {notifs.length === 0 ? (
              <EmptyData title="لا توجد تنبيهات" />
            ) : (
              notifs.map(n => (
                <div
                  key={n.$id}
                  className={`p-4 rounded-lg border cursor-pointer ${n.isRead ? 'bg-surface border-border' : 'bg-primary-50 border-petrol'}`}
                  onClick={() => toggleRead(n.$id, n.isRead)}
                >
                  <div className="flex justify-between">
                    <p className="font-medium">{n.message}</p>
                    {n.isRead ? <Check size={16} className="text-primary" /> : <span className="w-2 h-2 rounded-full bg-primary mt-2" />}
                  </div>
                  <p className="text-xs text-text-muted mt-1">
                    {new Date(n.$createdAt).toLocaleString('ar-EG')}
                  </p>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      <TechnicianBottomNav />
    </div>
  );
}