'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { listTests, listSamples, Query } from '@/lib/services';
import type { Test, Sample } from '@/types';
import Link from 'next/link';
import { LogOut, ClipboardCheck, Clock, AlertCircle } from 'lucide-react';
import TechnicianBottomNav from '@/components/TechnicianBottomNav';
import Badge from '@/components/Badge';
import Card from '@/components/Card';
import EmptyData from '@/components/EmptyData';
import TableSkeleton from '@/components/TableSkeleton';

export default function TechnicianDashboard() {
  const { user, employee, logout, loading } = useAuthStore();
  const router = useRouter();
  const [assignedTests, setAssignedTests] = useState<Test[]>([]);
  const [upcomingSamples, setUpcomingSamples] = useState<Sample[]>([]);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/technician/login');
    }
    if (employee) {
      listTests([
        Query.equal('assignedTo', employee.$id),
        Query.notEqual('status', 'مكتمل'),
        Query.orderDesc('$createdAt'),
        Query.limit(50),
      ]).then(res => setAssignedTests(res.documents));

      const today = new Date().toISOString().split('T')[0];
      const d2 = new Date(); d2.setDate(d2.getDate() + 2);
      const twoDaysLater = d2.toISOString().split('T')[0];

      listSamples([
        Query.or([Query.equal('preparerId', employee.$id), Query.equal('samplerId', employee.$id)]),
        Query.or([
          Query.and([Query.greaterThanEqual('test7DaysDate', today), Query.lessThanEqual('test7DaysDate', twoDaysLater)]),
          Query.and([Query.greaterThanEqual('test28DaysDate', today), Query.lessThanEqual('test28DaysDate', twoDaysLater)]),
        ]),
        Query.limit(10),
      ]).then(res => setUpcomingSamples(res.documents));
    }
  }, [user, employee, loading]);

  const handleLogout = async () => {
    await logout();
    router.push('/technician/login');
  };

  if (loading) return <div className="p-4"><TableSkeleton rows={5} cols={3} /></div>;

  return (
    <div className="min-h-screen bg-concrete-50 pb-20" dir="rtl">
      <header className="bg-petrol text-white p-4 flex justify-between items-center shadow">
        <h1 className="text-lg font-bold">مهامي</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm">{employee?.name}</span>
          <button onClick={handleLogout} className="bg-danger-solid hover:bg-danger-dark text-white px-3 py-1.5 rounded-xl text-sm flex items-center gap-1">
            <LogOut size={16} /> خروج
          </button>
        </div>
      </header>

      <main className="p-4 space-y-6">
        {/* فحوصات قادمة */}
        {upcomingSamples.length > 0 && (
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
                      <p className="text-sm text-concrete-500">{s.type}</p>
                    </div>
                    <AlertCircle size={20} className="text-warning" />
                  </div>
                  <div className="text-xs mt-2 space-y-1">
                    {s.test7DaysDate && s.test7DaysDate >= new Date().toISOString().split('T')[0] && (
                      <p className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-petrol" /> 7 أيام: {s.test7DaysDate}</p>
                    )}
                    {s.test28DaysDate && s.test28DaysDate >= new Date().toISOString().split('T')[0] && (
                      <p className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-petrol" /> 28 يوم: {s.test28DaysDate}</p>
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
          {assignedTests.length === 0 ? (
            <EmptyData title="لا توجد مهام حالياً" />
          ) : (
            <div className="space-y-3">
              {assignedTests.map((test) => (
                <Link key={test.$id} href={`/technician/tests/${test.$id}`} className="block">
                  <Card className="hover:shadow-md transition-shadow">
                    <div className="font-bold text-lg">{test.testName}</div>
                    <div className="text-sm text-concrete-500 mt-1">رقم العينة: {test.sampleId}</div>
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