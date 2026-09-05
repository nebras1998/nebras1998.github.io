'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Test, Sample, Report } from '@/types';
import { getTest } from '@/lib/services/tests';
import { getSample } from '@/lib/services/samples';
import { getClient } from '@/lib/services/clients';
import { getProject } from '@/lib/services/projects';
import { getReportByTestId, createReportDraft, generateReportNumber } from '@/lib/services/reports';
import { getFileViewUrl } from '@/lib/services/files';
import { buildReportSnapshot } from '@/lib/report-snapshot';
import { ID } from 'appwrite';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import FormCard from '@/components/FormCard';
import StatCard from '@/components/StatCard';
import EmptyData from '@/components/EmptyData';
import TableSkeleton from '@/components/TableSkeleton';

import { toast } from 'sonner';
import { FileDown, FilePlus2, FileText, Loader2 } from 'lucide-react';
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
  const router = useRouter();
  const params = useParams();
  const testId = params.id as string;

  const [test, setTest] = useState<Test | null>(null);
  const [sample, setSample] = useState<Sample | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
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

        const existingReport = await getReportByTestId(testId);
        if (existingReport) setReport(existingReport);

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

  const handleGenerateReport = async () => {
    if (!test) return;
    setGenerating(true);
    try {
      if (report) {
        router.push(`/dashboard/reports/${report.$id}`);
        return;
      }

      let sampleDoc = sample;
      if (!sampleDoc && test.sampleId) {
        try { sampleDoc = await getSample(test.sampleId); } catch {}
      }
      let clientDoc = null;
      const clientId = sampleDoc?.clientId || test.clientId;
      if (clientId) {
        try { clientDoc = await getClient(clientId); } catch {}
      }
      let projectDoc = null;
      const projectId = sampleDoc?.projectId || test.projectId;
      if (projectId) {
        try { projectDoc = await getProject(projectId); } catch {}
      }

      const snapshot = buildReportSnapshot(test, sampleDoc, clientDoc, projectDoc);
      const reportNumber = await generateReportNumber();
      const doc = await createReportDraft(ID.unique(), {
        testId: test.$id,
        reportNumber,
        status: 'مسودة',
        snapshotData: JSON.stringify(snapshot),
      });
      toast.success('تم إنشاء مسودة التقرير');
      router.push(`/dashboard/reports/${doc.$id}`);
    } catch (err: unknown) {
      toast.error('فشل إنشاء التقرير: ' + (err instanceof Error ? err.message : String(err)));
      setGenerating(false);
    }
  };

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
            <div><span className="text-text-muted">رقم الفحص:</span> {test.testNumber || '-'}</div>
            <div><span className="text-text-muted">العينة:</span> {sample?.sampleNumber || test.sampleId}</div>
            <div><span className="text-text-muted">الحالة:</span> <Badge status={test.status} /></div>
            <div><span className="text-text-muted">المواصفة:</span> {appliedStandard?.specification || test.specification || '-'}</div>
            <div><span className="text-text-muted">المعيار المطبق:</span> {appliedStandard?.name || '-'}</div>
            <div><span className="text-text-muted">حالة المطابقة:</span> {test.complianceStatus ? <Badge status={test.complianceStatus} /> : '-'}</div>
            <div><span className="text-text-muted">المسؤول:</span> {test.assignedTo || '-'}</div>
            <div><span className="text-text-muted">تاريخ الإنشاء:</span> {formatDate(test.$createdAt)}</div>
            <div><span className="text-text-muted">تاريخ النتيجة:</span> {test.completedAt ? formatDate(test.completedAt) : '-'}</div>
          </div>

          {/* ========== عرض نتائج مقاومة الضغط (عمر 7 و 28 يوم) ========== */}
          {isDualAge && (
            <div className="border-t pt-4 space-y-4">
              <h2 className="font-bold text-lg mb-2">نتائج الأعمار</h2>
              
              {age7Array.length > 0 && (
                <div className="bg-primary-50 p-4 rounded-lg">
                  <h3 className="font-bold text-primary mb-2">عمر 7 أيام</h3>
                  {test.test7Date && <p className="text-sm text-text-muted mb-2">تاريخ الفحص: {test.test7Date}</p>}
                  <div className="grid grid-cols-3 gap-2">
                    {age7Array.map((val, idx) => (
                      <div key={idx} className="bg-white p-3 rounded text-center shadow-sm">
                        <p className="text-xs text-text-muted">مكعب {idx + 1}</p>
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
                <div className="bg-primary-50 p-4 rounded-lg">
                  <h3 className="font-bold text-primary mb-2">عمر 28 يوم</h3>
                  {test.test28Date && <p className="text-sm text-text-muted mb-2">تاريخ الفحص: {test.test28Date}</p>}
                  <div className="grid grid-cols-3 gap-2">
                    {age28Array.map((val, idx) => (
                      <div key={idx} className="bg-white p-3 rounded text-center shadow-sm">
                        <p className="text-xs text-text-muted">مكعب {idx + 1}</p>
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
                  <div key={idx} className="bg-surface-dim p-3 rounded text-center">
                    <p className="text-xs text-text-muted">مكعب {idx + 1}</p>
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
                <EmptyData title="لا توجد بيانات." className="py-8" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-surface-dim border-b border-border text-sm">
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
              <p className="text-text-muted">النتيجة: {test.result || '-'} {test.unit || ''}</p>
            </div>
          )}

          {/* قسم التقرير (نظام التقارير) */}
          <div className="border-t pt-4 space-y-3">
            <h2 className="font-bold text-lg mb-2">التقرير</h2>
            {report ? (
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-surface-dim rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <FileText size={18} className="text-primary" />
                  <div>
                    <p className="font-bold" dir="ltr">{report.reportNumber}</p>
                    <Badge status={report.status} size="sm" />
                  </div>
                </div>
                <Link
                  href={`/dashboard/reports/${report.$id}`}
                  className="bg-primary text-white px-4 py-2 rounded hover:from-primary-dark hover:to-primary flex items-center gap-1 text-sm font-bold"
                >
                  <FileText size={16} />
                  {report.status === 'معتمد' ? 'عرض التقرير المعتمد' : 'فتح مسودة التقرير'}
                </Link>
              </div>
            ) : test.status === 'مكتمل' ? (
              <button
                onClick={handleGenerateReport}
                disabled={generating}
                className="bg-primary text-white px-4 py-2 rounded hover:from-primary-dark hover:to-primary flex items-center gap-1 disabled:opacity-50"
              >
                {generating ? <Loader2 size={18} className="animate-spin" /> : <FilePlus2 size={18} />}
                {generating ? 'جارٍ إنشاء التقرير...' : 'إنشاء التقرير'}
              </button>
            ) : (
              <p className="text-sm text-text-muted">يُنشأ التقرير تلقائيًا بعد اكتمال الفحص.</p>
            )}
          </div>

          {/* قسم التقرير المرفوع يدويًا (تأريخي) */}
          <div className="border-t pt-4">
            <h2 className="font-bold text-lg mb-2">التقرير المرفوع (PDF يدوي)</h2>
            {fileUrl ? (
              <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2 rounded hover:from-primary-dark hover:to-primary" download>
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