'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getStandardTest } from '@/lib/services/sample-types';
import type { StandardTest } from '@/lib/services/sample-types';
import StandardTestEditor from '@/components/catalog/StandardTestEditor';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import Breadcrumb from '@/components/Breadcrumb';
import TableSkeleton from '@/components/TableSkeleton';
import { toast } from 'sonner';

export default function EditStandardTestPage() {
  const router = useRouter();
  const params = useParams();
  const testId = params.id as string;

  const [test, setTest] = useState<StandardTest | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setTest(await getStandardTest(testId));
      } catch {
        toast.error('فشل تحميل بيانات الفحص القياسي');
      } finally {
        setLoading(false);
      }
    })();
  }, [testId]);

  if (loading) return <AuthGuard><DashboardLayout><TableSkeleton rows={6} cols={2} /></DashboardLayout></AuthGuard>;

  const backHref = test?.sampleTypeId
    ? `/dashboard/catalog/sample-types/${test.sampleTypeId}`
    : '/dashboard/catalog';

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="max-w-3xl mx-auto mb-4">
          <Breadcrumb items={[{ href: '/dashboard/catalog', label: 'كتالوج الفحوصات' }, { label: 'تعديل الفحص القياسي' }]} />
        </div>
        <StandardTestEditor mode="edit" initial={test} onSaved={() => router.push(backHref)} />
      </DashboardLayout>
    </AuthGuard>
  );
}
