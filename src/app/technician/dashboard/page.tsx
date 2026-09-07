'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { listTests, listSamples, Query } from '@/lib/services';
import type { Test, Sample } from '@/types';
import Link from 'next/link';
import { LogOut, ClipboardCheck, Clock, AlertCircle, History, AlertTriangle, WifiOff } from 'lucide-react';
import TechnicianBottomNav from '@/components/TechnicianBottomNav';
import TechnicianNotificationBell from '@/components/TechnicianNotificationBell';
import Badge from '@/components/Badge';
import Card from '@/components/Card';
import EmptyData from '@/components/EmptyData';
import TableSkeleton from '@/components/TableSkeleton';
import { formatDateAr } from '@/lib/helpers';

export default function TechnicianDashboard() {
  const { user, employee, logout, loading } = useAuthStore();
  const router = useRouter();
  const [assignedTests, setAssignedTests] = useState<Test[]>([]);
  const [upcomingSamples, setUpcomingSamples] = useState<Sample[]>([]);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/technician/login');
    }
    if (!employee) return;
    let cancelled = false;

    const loadData = async () => {
      setError(false);
      try {
        const [testsRes, samplesRes] = await Promise.all([
          listTests([
            Query.equal('assignedTo', employee.$id),
            Query.notEqual('status', 'مكتمل'),
            Query.orderDesc('$createdAt'),
            Query.limit(50),
          ]),
          (async () => {
            const today = new Date().toISOString().split('T')[0];
            const d2 = new Date(); d2.setDate(d2.getDate() + 2);
            const twoDaysLater = d2.toISOString().split('T')[0];
            return listSamples([
              Query.or([Query.equal('preparerId', employee.$id), Query.equal('samplerId', employee.$id)]),
              Query.or([
                Query.and([Query.greaterThanEqual('test7DaysDate', today), Query.lessThanEqual('test7DaysDate', twoDaysLater)]),
                Query.and([Query.greaterThanEqual('test28DaysDate', today), Query.lessThanEqual('test28DaysDate', twoDaysLater)]),
              ]),
              Query.limit(10),
            ]);
          })(),
        ]);
        if (cancelled) return;
        setAssignedTests(testsRes.documents);
        setUpcomingSamples(samplesRes.documents);
      } catch {
        if (!cancelled) setError(true);
      }
    };
    loadData();
    return () => { cancelled = true; };
  }, [user, employee, loading, reloadKey, router]);

  const handleLogout = async () => {
    await logout();
    router.push('/technician/login');
  };

  if (loading) return <div className="p-4"><TableSkeleton rows={5} cols={3} /></div>;

  return (
    <div className="min-h-screen bg-surface-dim pb-20" dir="rtl">
      <header className="bg-primary text-white p-4 flex justify-between items-center shadow">
        <h1 className="text-lg font-bold">مهامي</h1>
        <div className="flex items-center gap-2">
          <TechnicianNotificationBell />
          <span className="text-sm">{employee?.name}</span>
          <button onClick={handleLogout} className="bg-danger-solid hover:bg-danger-dark text-white px-3 py-2 rounded-xl text-sm flex items-center gap-1">
            <LogOut size={16} /> خروج
          </button>
        </div>
      </header>

      <main className="p-4 space-y-6">
        {/* أفعال سريعة */}
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/technician/history"
            className="bg-surface border border-border p-4 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm hover:shadow-md active:scale-[0.98] transition-transform"
          >
            <History size={20} className="text-primary" /> سجل المنجز
          </Link>
          <Link
            href="/technician/report-issue"
            className="bg-surface border border-border p-4 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm hover:shadow-md active:scale-[0.98] transition-transform"
          >
            <AlertTriangle size={20} className="text-warning" /> بلاغ عن مشكلة
          </Link>
        </div>

        {/* فشل الشبكة: رسالة واضحة بدل قائمة فارغة مضللة */}
        {error && (
          <div className="bg-danger-bg border border-danger/20 text-danger p-4 rounded-xl text-sm">
            <div className="flex items-center gap-2 font-bold">
              <WifiOff size={18} /> تعذر تحميل بياناتك بسبب مشكلة في الاتصال
            </div>
            <button
              onClick={() => setReloadKey(k => k + 1)}
              className="mt-3 bg-danger-solid text-white px-5 py-3 rounded-xl font-bold"
            >
              إعادة المحاولة
            </button>
          </div>
        )}

        {/* فحوصات قادمة */}
        {!error && upcomingSamples.length > 0 && (
          <div>
            <h2 className="font-bold mb-3 flex items-center gap-2 text-warning">
              <Clock size={22} /> فحوصاتي القادمة (خلال يومين)
            </h2>
            <div className="space-y-2">
              {upcomingSamples.map(s => (
                <div key={s.$id} className="bg-warning-bg p-4 rounded-xl border border-warning">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-mono font-bold text-base">{s.sampleNumber}</p>
                      <p className="text-sm text-text-muted">{s.type}</p>
                    </div>
                    <AlertCircle size={20} className="text-warning" />
                  </div>
                  <div className="text-xs mt-2 space-y-1">
                    {s.test7DaysDate && s.test7DaysDate >= new Date().toISOString().split('T')[0] && (
                      <p className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary" /> 7 أيام: {formatDateAr(s.test7DaysDate)}</p>
                    )}
                    {s.test28DaysDate && s.test28DaysDate >= new Date().toISOString().split('T')[0] && (
                      <p className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary" /> 28 يوم: {formatDateAr(s.test28DaysDate)}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* الفحوصات المسندة */}
        <div>
          <h2 className="font-bold mb-3 flex items-center gap-2 text-lg">
            <ClipboardCheck size={22} /> الفحوصات المسندة إليّ
          </h2>
          {!error && assignedTests.length === 0 ? (
            <EmptyData title="لا توجد مهام حالياً" />
          ) : !error && (
            <div className="space-y-3">
              {assignedTests.map((test) => (
                <Link key={test.$id} href={`/technician/tests/${test.$id}`} className="block">
                  <Card className="hover:shadow-md transition-shadow">
                    <div className="font-bold text-lg">{test.testName}</div>
                    <div className="text-sm text-text-muted mt-1">رقم العينة: {test.sampleId}</div>
                    <div className="mt-2">
                      <Badge status={test.status} size="sm" />
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>

      <TechnicianBottomNav />
    </div>
  );
}