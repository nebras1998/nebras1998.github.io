'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSampleType, listStandardTests, deleteSampleType, deleteStandardTest } from '@/lib/services/sample-types';
import type { SampleType, StandardTest } from '@/lib/services/sample-types';
import { Query } from '@/lib/services';
import { RESULT_TYPE_LABELS } from '@/lib/test-config';
import type { TestResultType } from '@/lib/test-config';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import Card from '@/components/Card';
import TableSkeleton from '@/components/TableSkeleton';
import EmptyData from '@/components/EmptyData';
import ConfirmModal from '@/components/ConfirmModal';
import Breadcrumb from '@/components/Breadcrumb';
import { Plus, Edit, Copy, Trash2, ArrowRight, Loader2, ClipboardCheck } from 'lucide-react';
import { toast } from 'sonner';

type DeleteTarget = { kind: 'type' | 'test'; id: string; label: string } | null;

export default function SampleTypeDetailPage() {
  const router = useRouter();
  const params = useParams();
  const typeId = params.id as string;

  const [type, setType] = useState<SampleType | null>(null);
  const [tests, setTests] = useState<StandardTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [typeRes, testsRes] = await Promise.all([
          getSampleType(typeId),
          listStandardTests([Query.equal('sampleTypeId', typeId), Query.orderAsc('name'), Query.limit(100)]),
        ]);
        setType(typeRes);
        setTests(testsRes.documents);
      } catch {
        toast.error('فشل تحميل بيانات نوع العينة');
      } finally {
        setLoading(false);
      }
    })();
  }, [typeId]);

  const openDelete = (target: DeleteTarget) => {
    setDeleteTarget(target);
    setModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      if (deleteTarget.kind === 'type') {
        await deleteSampleType(deleteTarget.id);
        toast.success('تم حذف نوع العينة');
        router.push('/dashboard/catalog');
        return;
      }
      await deleteStandardTest(deleteTarget.id, deleteTarget.label);
      toast.success('تم حذف الفحص القياسي');
      setTests((prev) => prev.filter((t) => t.$id !== deleteTarget.id));
    } catch (err: unknown) {
      toast.error('خطأ في الحذف: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setDeleting(false);
      setModalOpen(false);
      setDeleteTarget(null);
    }
  };

  if (loading) return <AuthGuard><DashboardLayout><TableSkeleton rows={6} cols={4} /></DashboardLayout></AuthGuard>;
  if (!type) return <AuthGuard><DashboardLayout><EmptyData title="نوع العينة غير موجود" /></DashboardLayout></AuthGuard>;

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="max-w-5xl mx-auto">
          <div className="mb-4">
            <Breadcrumb items={[{ href: '/dashboard/catalog', label: 'كتالوج الفحوصات' }, { label: type.name }]} />
          </div>

          <Card className="mb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold">{type.name}</h1>
                  {type.code && <span className="font-mono text-sm text-concrete-500 bg-concrete-100 px-2 py-0.5 rounded">{type.code}</span>}
                </div>
                {type.description && <p className="mt-1 text-concrete-500">{type.description}</p>}
                <p className="mt-2 text-sm text-concrete-600 flex items-center gap-1">
                  <ClipboardCheck size={16} className="text-petrol" /> {tests.length} فحص قياسي
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link href={`/dashboard/catalog/sample-types/${typeId}/edit`} className="border border-concrete-200 px-4 py-2 rounded text-sm font-bold flex items-center gap-1 hover:bg-concrete-100">
                  <Edit size={16} /> تعديل النوع
                </Link>
                <button onClick={() => openDelete({ kind: 'type', id: typeId, label: type.name })} className="border border-danger text-danger px-4 py-2 rounded text-sm font-bold flex items-center gap-1 hover:bg-danger-bg">
                  <Trash2 size={16} /> حذف النوع
                </button>
              </div>
            </div>
          </Card>

          <div className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-lg font-bold">الفحوصات القياسية</h2>
            <Link href={`/dashboard/catalog/tests/new?sampleTypeId=${typeId}`} className="bg-petrol text-white px-4 py-2 rounded flex items-center gap-1 hover:bg-petrol-dark">
              <Plus size={18} /> إضافة فحص قياسي
            </Link>
          </div>

          {tests.length === 0 ? (
            <EmptyData
              icon={ClipboardCheck}
              title="لا توجد فحوصات قياسية لهذا النوع"
              description="أضف أول فحص قياسي وسيظهر تلقائيًا عند تسجيل عينة من هذا النوع."
              action={
                <Link href={`/dashboard/catalog/tests/new?sampleTypeId=${typeId}`} className="bg-petrol text-white px-4 py-2 rounded flex items-center gap-1 hover:bg-petrol-dark">
                  <Plus size={16} /> إضافة فحص قياسي
                </Link>
              }
            />
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-concrete-50 border-b">
                    <th className="text-right p-3 text-sm font-semibold">الفحص</th>
                    <th className="text-right p-3 text-sm font-semibold">المدة</th>
                    <th className="text-right p-3 text-sm font-semibold">المرجع المعياري</th>
                    <th className="text-right p-3 text-sm font-semibold">نوع النتيجة</th>
                    <th className="text-right p-3 text-sm font-semibold">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {tests.map((test) => (
                    <tr key={test.$id} className="border-b hover:bg-concrete-50">
                      <td className="p-3 font-medium">{test.name}</td>
                      <td className="p-3 text-sm">{test.duration || '-'}</td>
                      <td className="p-3 text-sm">{test.standard || '-'}</td>
                      <td className="p-3 text-sm">{RESULT_TYPE_LABELS[(test.resultType || 'single') as TestResultType]}</td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-3">
                          <Link href={`/dashboard/catalog/tests/${test.$id}/edit`} className="text-petrol hover:underline flex items-center gap-1 text-sm">
                            <Edit size={14} /> تعديل
                          </Link>
                          <Link
                            href={`/dashboard/catalog/tests/new?sampleTypeId=${typeId}&duplicateOf=${test.$id}`}
                            className="text-petrol hover:underline flex items-center gap-1 text-sm"
                            title="نسخ الفحص وفتح نموذج جديد معبأ مسبقًا"
                          >
                            <Copy size={14} /> نسخ
                          </Link>
                          <button
                            onClick={() => openDelete({ kind: 'test', id: test.$id, label: test.name })}
                            disabled={deleting}
                            className="text-danger hover:underline flex items-center gap-1 text-sm disabled:opacity-50"
                          >
                            {deleting && deleteTarget?.id === test.$id ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Trash2 size={14} />
                            )}
                            حذف
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}

          <Link href="/dashboard/catalog" className="mt-4 inline-flex items-center gap-1 text-petrol text-sm hover:underline">
            <ArrowRight size={16} /> العودة إلى الكتالوج
          </Link>

          <ConfirmModal
            isOpen={modalOpen}
            onClose={() => setModalOpen(false)}
            onConfirm={handleDeleteConfirm}
            title="تأكيد الحذف"
            message={
              deleteTarget?.kind === 'type'
                ? `هل أنت متأكد من حذف نوع العينة "${deleteTarget?.label}"؟`
                : `هل أنت متأكد من حذف الفحص القياسي "${deleteTarget?.label}"؟`
            }
            confirmText="حذف"
            cancelText="إلغاء"
            loading={deleting}
          />
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}
