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
import TableSkeleton from '@/components/TableSkeleton';

import { toast } from 'sonner';
import { FileDown } from 'lucide-react';
import Breadcrumb from '@/components/Breadcrumb';
import Badge from '@/components/Badge';
import {
  getTestResultType,
  parseResultFields,
  parseAppliedStandard,
  type ResultFieldDef,
  type SpecificationProfile,
} from '@/lib/test-config';

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

  if (loading) return <AuthGuard><DashboardLayout><TableSkeleton rows={4} cols={3} /></DashboardLayout></AuthGuard>;
  if (!test) return <AuthGuard><DashboardLayout><EmptyData title="الفحص غير موجود" /></DashboardLayout></AuthGuard>;

  // تحليل النتائج المخزنة
  let resultsArray: number[] = [];
  try { if (test.results) resultsArray = JSON.parse(test.results); } catch {}

  let age7Array: number[] = [];
  try { if (test.result7Days) age7Array = JSON.parse(test.result7Days).map(Number); } catch {}
  let age28Array: number[] = [];
  try { if (test.result28Days) age28Array = JSON.parse(test.result28Days).map(Number); } catch {}

  const resultType = getTestResultType(test.testName, test.resultType);
  const isDualAge = resultType === 'dual_age' || !!(age7Array.length || age28Array.length || test.test7Date || test.test28Date);
  const isMultiResult = resultType === 'multi_no_age' || (resultsArray.length > 0 && !isDualAge);
  const isMultiField = resultType === 'multi_field';

  const resultFields: ResultFieldDef[] = parseResultFields(test.resultFields);
  const appliedStandard: SpecificationProfile | null = parseAppliedStandard(test.appliedStandard);
  let resultFieldsValues: Record<string, string> = {};
  try { if (test.resultFieldsValues) resultFieldsValues = JSON.parse(test.resultFieldsValues); } catch {}

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="max-w-2xl mx-auto">
          <Breadcrumb items={[{ href: '/dashboard/tests', label: 'الفحوصات' }, { label: 'تفاصيل الفحص' }]} />

          <FormCard className="space-y-6">
            <h1 className="text-2xl font-bold">{test.testName}</h1>

          <div className="grid grid-cols-2 gap-4">
            <div><span className="text-concrete-500">رقم الفحص:</span> {test.testNumber || '-'}</div>
            <div><span className="text-concrete-500">العينة:</span> {sample?.sampleNumber || test.sampleId}</div>
            <div><span className="text-concrete-500">الحالة:</span> <Badge status={test.status} /></div>
            <div><span className="text-concrete-500">المواصفة:</span> {appliedStandard?.specification || test.specification || '-'}</div>
            <div><span className="text-concrete-500">المعيار المطبق:</span> {appliedStandard?.name || '-'}</div>
            <div><span className="text-concrete-500">حالة المطابقة:</span> {test.complianceStatus ? <Badge status={test.complianceStatus} /> : '-'}</div>
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
                        <p className="text-xs">{test.unit || '-'}</p>
                      </div>
                    ))}
                  </div>
                  {test.average7Days && (
                    <div className="mt-3">
                      <StatCard centered title="المتوسط" value={`${test.average7Days}${test.unit ? ` ${test.unit}` : ''}`} bgColor="bg-success-bg" valueClass="text-success" />
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
                        <p className="text-xs">{test.unit || '-'}</p>
                      </div>
                    ))}
                  </div>
                  {test.average28Days && (
                    <div className="mt-3">
                      <StatCard centered title="المتوسط" value={`${test.average28Days}${test.unit ? ` ${test.unit}` : ''}`} bgColor="bg-success-bg" valueClass="text-success" />
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
                    <p className="text-xs">{test.unit || '-'}</p>
                  </div>
                ))}
              </div>
              {test.averageResult && (
                <div className="mt-3">
                  <StatCard centered title="المتوسط" value={`${test.averageResult}${test.unit ? ` ${test.unit}` : ''}`} bgColor="bg-success-bg" valueClass="text-success" />
                </div>
              )}
            </div>
          )}

          {/* ========== عرض نتائج متعددة الحقول (multi_field) ========== */}
          {isMultiField && (
            <div className="border-t pt-4">
              <h2 className="font-bold text-lg mb-2">نتائج الفحص</h2>
              {resultFields.length === 0 ? (
                <p className="text-concrete-500">لا توجد بيانات.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-concrete-50 border-b text-sm">
                        <th className="text-right p-3 font-semibold">الحقل</th>
                        <th className="text-right p-3 font-semibold">النتيجة</th>
                        <th className="text-right p-3 font-semibold">الوحدة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resultFields.map((f) => (
                        <tr key={f.key} className="border-b">
                          <td className="p-3">{f.label}</td>
                          <td className="p-3 font-bold">{resultFieldsValues[f.key] || '-'}</td>
                          <td className="p-3 text-sm">{f.unit || test.unit || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ========== فحص عادي (نتيجة واحدة) ========== */}
          {!isDualAge && !isMultiResult && !isMultiField && (
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