'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { listSampleTypes, listStandardTests } from '@/lib/services/sample-types';
import type { SampleType } from '@/lib/services/sample-types';
import { Query } from '@/lib/services';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import Card from '@/components/Card';
import TableSkeleton from '@/components/TableSkeleton';
import EmptyData from '@/components/EmptyData';
import Breadcrumb from '@/components/Breadcrumb';
import { Plus, FlaskConical, Eye, Edit, ClipboardCheck } from 'lucide-react';
import { toast } from 'sonner';

export default function CatalogPage() {
  const [sampleTypes, setSampleTypes] = useState<SampleType[]>([]);
  const [testCounts, setTestCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const typesRes = await listSampleTypes([Query.orderAsc('name'), Query.limit(100)]);
        const types = typesRes.documents;

        const allTests = await listStandardTests([Query.limit(1000)]);
        const counts: Record<string, number> = {};
        for (const t of allTests.documents) {
          counts[t.sampleTypeId] = (counts[t.sampleTypeId] || 0) + 1;
        }

        setSampleTypes(types);
        setTestCounts(counts);
      } catch {
        toast.error('فشل تحميل كتالوج الفحوصات');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="max-w-5xl mx-auto">
          <div className="mb-4">
            <Breadcrumb items={[{ label: 'كتالوج الفحوصات' }]} />
          </div>
          <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h1 className="text-2xl font-bold">كتالوج الفحوصات</h1>
            <Link href="/dashboard/catalog/sample-types/new" className="bg-gradient-to-l from-primary to-primary-dark text-white px-5 py-2.5 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 active:scale-[0.98] flex items-center gap-2">
              <Plus size={18} /> إضافة نوع عينة جديد
            </Link>
          </div>

          {loading ? (
            <TableSkeleton rows={6} cols={3} />
          ) : sampleTypes.length === 0 ? (
            <EmptyData
              icon={FlaskConical}
              title="لا توجد أنواع عينات بعد"
              description="أضف أول نوع عينة ثم عرّف الفحوصات القياسية المرتبطة به."
              action={
                <Link href="/dashboard/catalog/sample-types/new" className="bg-gradient-to-l from-primary to-primary-dark text-white px-5 py-2.5 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 active:scale-[0.98] flex items-center gap-2">
                  <Plus size={16} /> إضافة نوع عينة
                </Link>
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {sampleTypes.map((type) => {
                const count = testCounts[type.$id] || 0;
                return (
                  <Card key={type.$id} className="flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h2 className="font-bold text-lg truncate">{type.name}</h2>
                        {type.code && <span className="text-xs font-mono text-text-muted">{type.code}</span>}
                      </div>
                      <div className="flex items-center gap-1 text-text-muted">
                        <Link href={`/dashboard/catalog/sample-types/${type.$id}/edit`} className="p-1.5 hover:text-primary-dark rounded-lg" title="تعديل">
                          <Edit size={16} />
                        </Link>
                      </div>
                    </div>
                    {type.description && <p className="text-sm text-text-muted line-clamp-2">{type.description}</p>}
                    <div className="flex items-center gap-2 text-sm text-text-secondary">
                      <ClipboardCheck size={16} className="text-primary" />
                      <span>{count} فحص قياسي</span>
                    </div>
                    <Link
                      href={`/dashboard/catalog/sample-types/${type.$id}`}
                      className="mt-auto bg-primary-50 text-primary px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-1 hover:bg-primary hover:text-white transition-colors"
                    >
                      <Eye size={16} /> عرض الفحوصات
                    </Link>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}
