'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import type { Test } from '@/types';
import { listTests, Query } from '@/lib/services';
import Link from 'next/link';
import { ArrowRight, History } from 'lucide-react';
import TechnicianBottomNav from '@/components/TechnicianBottomNav';
import Badge from '@/components/Badge';
import Card from '@/components/Card';
import EmptyData from '@/components/EmptyData';
import TableSkeleton from '@/components/TableSkeleton';
import { formatDateAr } from '@/lib/helpers';

export default function TechnicianHistoryPage() {
  const router = useRouter();
  const { employee } = useAuthStore();
  const [completedTests, setCompletedTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!employee) return;
    const load = async () => {
      setLoading(true);
      setError(false);
      try {
        const res = await listTests([
          Query.equal('assignedTo', employee.$id),
          Query.equal('status', 'مكتمل'),
          Query.orderDesc('$createdAt'),
          Query.limit(100),
        ]);
        setCompletedTests(res.documents);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [employee, reloadKey]);

  return (
    <div className="min-h-screen bg-surface-dim pb-20" dir="rtl">
      <header className="bg-primary text-white p-4 flex items-center gap-3 shadow">
        <button onClick={() => router.back()} className="text-white"><ArrowRight size={24} /></button>
        <h1 className="text-lg font-bold flex items-center gap-2">
          <History size={20} /> سجل الفحوصات المنجزة
        </h1>
      </header>

      <main className="p-4">
        {loading ? <TableSkeleton rows={6} cols={2} /> : error ? (
          <div className="bg-danger-bg border border-danger/20 text-danger p-4 rounded-xl text-sm">
            فشل تحميل السجل. تحقق من اتصالك ثم أعد المحاولة.
            <button onClick={() => setReloadKey(k => k + 1)}
              className="mt-3 block bg-danger-solid text-white px-5 py-3 rounded-xl font-bold">إعادة المحاولة</button>
          </div>
        ) : completedTests.length === 0 ? (
          <EmptyData title="لا توجد فحوصات مكتملة بعد" />
        ) : (
          <div className="space-y-3">
            {completedTests.map((test) => (
              <Link key={test.$id} href={`/technician/tests/${test.$id}`} className="block">
                <Card className="hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-bold text-lg">{test.testName}</div>
                      <div className="text-sm text-text-muted mt-1">رقم العينة: {test.sampleId}</div>
                      <div className="text-xs text-text-muted mt-1">أُنجز: {formatDateAr(test.completedAt)}</div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge status={test.status} size="sm" />
                      {test.complianceStatus && <Badge status={test.complianceStatus} size="sm" />}
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>

      <TechnicianBottomNav />
    </div>
  );
}