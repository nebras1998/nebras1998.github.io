'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getStandardTest } from '@/lib/services/sample-types';
import type { StandardTest } from '@/lib/services/sample-types';
import StandardTestEditor from '@/components/catalog/StandardTestEditor';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import EmptyData from '@/components/EmptyData';
import Breadcrumb from '@/components/Breadcrumb';
import TableSkeleton from '@/components/TableSkeleton';
import { toast } from 'sonner';

export default function NewStandardTestPage() {
  const router = useRouter();
  const [sampleTypeId, setSampleTypeId] = useState<string | null>(null);
  const [duplicateTest, setDuplicateTest] = useState<StandardTest | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const params = new URLSearchParams(window.location.search);
      const typeId = params.get('sampleTypeId');
      const duplicateOf = params.get('duplicateOf');

      if (!typeId) {
        setLoading(false);
        return;
      }
      setSampleTypeId(typeId);

      if (duplicateOf) {
        try {
          setDuplicateTest(await getStandardTest(duplicateOf));
        } catch {
          toast.error('فشل تحميل بيانات الفحص المراد نسخه');
        }
      }
      setLoading(false);
    })();
  }, []);

  const handleSaved = () => {
    router.push(`/dashboard/catalog/sample-types/${sampleTypeId}`);
  };

  if (loading) return <AuthGuard><DashboardLayout><TableSkeleton rows={6} cols={2} /></DashboardLayout></AuthGuard>;

  if (!sampleTypeId) {
    return (
      <AuthGuard>
        <DashboardLayout>
          <div className="max-w-xl mx-auto mb-4">
            <Breadcrumb items={[{ href: '/dashboard/catalog', label: 'كتالوج الفحوصات' }, { label: 'إضافة فحص قياسي' }]} />
          </div>
          <EmptyData
            title="نوع العينة مطلوب"
            description="افتح هذه الصفحة من داخل صفحة نوع العينة لاختيار النوع تلقائيًا."
            action={
              <Link href="/dashboard/catalog" className="bg-gradient-to-l from-primary to-primary-dark text-white px-5 py-2.5 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 active:scale-[0.98] flex items-center gap-2">
                العودة إلى الكتالوج
              </Link>
            }
          />
        </DashboardLayout>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="max-w-3xl mx-auto mb-4">
          <Breadcrumb items={[{ href: '/dashboard/catalog', label: 'كتالوج الفحوصات' }, { label: 'إضافة فحص قياسي' }]} />
        </div>
        <StandardTestEditor
          mode="new"
          initial={duplicateTest}
          fixedSampleTypeId={sampleTypeId}
          onSaved={handleSaved}
        />
      </DashboardLayout>
    </AuthGuard>
  );
}
