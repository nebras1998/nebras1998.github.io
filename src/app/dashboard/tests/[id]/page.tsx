'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import type { Test, Sample } from '@/types';
import { getTest } from '@/lib/services/tests';
import { getSample } from '@/lib/services/samples';
import { getFileViewUrl } from '@/lib/services/files';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import FormCard from '@/components/FormCard';
import StatCard from '@/components/StatCard';
import EmptyData from '@/components/EmptyData';

import { toast } from 'sonner';
import { FileDown, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import Badge from '@/components/Badge';

export default function TestDetailPage() {
  const params = useParams();
  const testId = params.id as string;

  const [test, setTest] = useState<Test | null>(null);
  const [sample, setSample] = useState<Sample | null>(null);
  const [loading, setLoading] = useState(true);
  const [fileUrl, setFileUrl] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const testDoc = await getTest(testId);
        setTest(testDoc);

        if (testDoc.sampleId) {
          const sampleDoc = await getSample(testDoc.sampleId);
          setSample(sampleDoc);
        }

        if (testDoc.reportFileId) {
          setFileUrl(getFileViewUrl(testDoc.reportFileId));
        }
      } catch {
        toast.error('فشل تحميل بيانات الفحص');
      } finally {
        setLoading(false);
      }
    })();
  }, [testId]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    try { return new Date(dateStr).toLocaleDateString('ar-EG'); } catch { return dateStr.slice(0, 10); }
  };

  if (loading) return <AuthGuard><DashboardLayout><p className="p-10 text-center">جارٍ التحميل...</p></DashboardLayout></AuthGuard>;
  if (!test) return <AuthGuard><DashboardLayout><p className="p-10 text-center text-danger">الفحص غير موجود</p></DashboardLayout></AuthGuard>;

  // تحليل النتائج المخزنة
  let resultsArray: number[] = [];
  try { if (test.results) resultsArray = JSON.parse(test.results); } catch {}

  let age7Array: number[] = [];
  try { if (test.result7Days) age7Array = JSON.parse(test.result7Days).map(Number); } catch {}
  let age28Array: number[] = [];
  try { if (test.result28Days) age28Array = JSON.parse(test.result28Days).map(Number); } catch {}

  const isDualAge = !!(age7Array.length || age28Array.length || test.test7Date || test.test28Date);
  const isMultiResult = resultsArray.length > 0;

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-2 text-sm text-concrete-500 mb-4">
            <Link href="/dashboard/tests" className="hover:underline">الفحوصات</Link>
            <ArrowRight size={14} />
            <span>تفاصيل الفحص</span>
          </div>

          <FormCard className="space-y-6">
            <h1 className="text-2xl font-bold">{test.testName}</h1>

          <div className="grid grid-cols-2 gap-4">
            <div><span className="text-concrete-500">رقم الفحص:</span> {test.testNumber || '-'}</div>
            <div><span className="text-concrete-500">العينة:</span> {sample?.sampleNumber || test.sampleId}</div>
            <div><span className="text-concrete-500">الحالة:</span> <Badge status={test.status} /></div>
            <div><span className="text-concrete-500">المواصفة:</span> {test.specification || '-'}</div>
            <div><span className="text-concrete-500">المسؤول:</span> {test.assignedTo || '-'}</div>
            <div><span className="text-concrete-500">تاريخ الإنشاء:</span> {formatDate(test.$createdAt)}</div>
            <div><span className="text-concrete-500">تاريخ النتيجة:</span> {test.completedAt ? formatDate(test.completedAt) : '-'}</div>
          </div>

          {/* ========== عرض نتائج مقاومة الضغط (عمر 7 و 28 يوم) ========== */}
          {isDualAge && (
            <div className="border-t pt-4 space-y-4">
              <h2 className="font-bold text-lg mb-2">نتائج الأعمار</h2>
              
              {age7Array.length > 0 && (
                <div className="bg-petrol-soft p-4 rounded-lg">
                  <h3 className="font-bold text-petrol mb-2">عمر 7 أيام</h3>
                  {test.test7Date && <p className="text-sm text-concrete-500 mb-2">تاريخ الفحص: {test.test7Date}</p>}
                  <div className="grid grid-cols-3 gap-2">
                    {age7Array.map((val, idx) => (
                      <div key={idx} className="bg-white p-3 rounded text-center shadow-sm">
                        <p className="text-xs text-concrete-500">مكعب {idx + 1}</p>
                        <p className="font-bold text-lg">{val}</p>
                        <p className="text-xs">{test.unit || 'kg/cm2'}</p>
                      </div>
                    ))}
                  </div>
                  {test.average7Days && (
                    <div className="mt-3">
                      <StatCard centered title="المتوسط" value={`${test.average7Days} ${test.unit || 'kg/cm2'}`} bgColor="bg-success-bg" valueClass="text-success" />
                    </div>
                  )}
                </div>
              )}

              {age28Array.length > 0 && (
                <div className="bg-petrol-soft p-4 rounded-lg">
                  <h3 className="font-bold text-petrol mb-2">عمر 28 يوم</h3>
                  {test.test28Date && <p className="text-sm text-concrete-500 mb-2">تاريخ الفحص: {test.test28Date}</p>}
                  <div className="grid grid-cols-3 gap-2">
                    {age28Array.map((val, idx) => (
                      <div key={idx} className="bg-white p-3 rounded text-center shadow-sm">
                        <p className="text-xs text-concrete-500">مكعب {idx + 1}</p>
                        <p className="font-bold text-lg">{val}</p>
                        <p className="text-xs">{test.unit || 'kg/cm2'}</p>
                      </div>
                    ))}
                  </div>
                  {test.average28Days && (
                    <div className="mt-3">
                      <StatCard centered title="المتوسط" value={`${test.average28Days} ${test.unit || 'kg/cm2'}`} bgColor="bg-success-bg" valueClass="text-success" />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ========== عرض نتائج متعددة المكعبات (القلب الخرساني) ========== */}
          {isMultiResult && !isDualAge && (
            <div className="border-t pt-4">
              <h2 className="font-bold text-lg mb-2">نتائج المكعبات</h2>
              <div className="grid grid-cols-3 gap-2">
                {resultsArray.map((val, idx) => (
                  <div key={idx} className="bg-concrete-50 p-3 rounded text-center">
                    <p className="text-xs text-concrete-500">مكعب {idx + 1}</p>
                    <p className="font-bold text-lg">{val}</p>
                    <p className="text-xs">{test.unit || 'kg/cm2'}</p>
                  </div>
                ))}
              </div>
              {test.averageResult && (
                <div className="mt-3">
                  <StatCard centered title="المتوسط" value={`${test.averageResult} ${test.unit || 'kg/cm2'}`} bgColor="bg-success-bg" valueClass="text-success" />
                </div>
              )}
            </div>
          )}

          {/* ========== فحص عادي (نتيجة واحدة) ========== */}
          {!isDualAge && !isMultiResult && (
            <div className="border-t pt-4">
              <h2 className="font-bold text-lg mb-2">النتيجة</h2>
              <p className="text-concrete-500">النتيجة: {test.result || '-'} {test.unit || ''}</p>
            </div>
          )}

          {/* قسم التقرير */}
          <div className="border-t pt-4">
            <h2 className="font-bold text-lg mb-2">تقرير الفحص</h2>
            {fileUrl ? (
              <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-petrol text-white px-4 py-2 rounded hover:bg-petrol-dark" download>
                <FileDown size={18} /> تحميل التقرير (PDF)
              </a>
            ) : (
              <EmptyData title="لا يوجد تقرير مرفوع بعد." />
            )}
          </div>
          </FormCard>
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}