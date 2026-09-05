'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getReport, updateReportDraft, getActiveReportTemplate } from '@/lib/services/reports';
import { getFileViewUrl } from '@/lib/services/files';
import type { Report, ReportSnapshot, ReportTemplate } from '@/types';
import { parseReportSnapshot } from '@/lib/report-snapshot';
import { getReportSectionPlan, hasLimits, rowPass, complianceLabel } from '@/lib/report-sections';
import { useAuthStore } from '@/store/useAuthStore';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import Card from '@/components/Card';
import Badge from '@/components/Badge';
import Breadcrumb from '@/components/Breadcrumb';
import ConfirmModal from '@/components/ConfirmModal';
import TableSkeleton from '@/components/TableSkeleton';
import EmptyData from '@/components/EmptyData';
import TextAreaField from '@/components/TextAreaField';
import SubmitButton from '@/components/SubmitButton';
import { toast } from 'sonner';
import { Save, Lock, FileDown, FileText, CheckCircle2, ShieldCheck } from 'lucide-react';

function formatDate(value?: string): string {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleDateString('ar-EG');
  } catch {
    return value.slice(0, 10);
  }
}

function shortHash(hash?: string): string {
  if (!hash) return '-';
  return `${hash.slice(0, 8)}…${hash.slice(-8)}`;
}

export default function ReportDetailPage() {
  const params = useParams();
  const reportId = params.id as string;
  const user = useAuthStore((s) => s.user);

  const [report, setReport] = useState<Report | null>(null);
  const [snapshot, setSnapshot] = useState<ReportSnapshot | null>(null);
  const [template, setTemplate] = useState<ReportTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [reviewerName, setReviewerName] = useState('');
  const [approveOpen, setApproveOpen] = useState(false);
  const [approving, setApproving] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [reportDoc, templateDoc] = await Promise.all([getReport(reportId), getActiveReportTemplate()]);
        setReport(reportDoc);
        setSnapshot(parseReportSnapshot(reportDoc.snapshotData));
        setTemplate(templateDoc);
        setNotes(reportDoc.additionalNotes || '');
        setReviewerName(user?.name || user?.email || '');
        if (reportDoc.pdfFileId) setPdfUrl(getFileViewUrl(reportDoc.pdfFileId));
      } catch {
        toast.error('فشل تحميل التقرير');
      } finally {
        setLoading(false);
      }
    })();
  }, [reportId, user?.name, user?.email]);

  const primaryColor = template?.primaryColor || '#0f4c5c';

  const handleSaveDraft = async () => {
    if (!report) return;
    setSaving(true);
    try {
      await updateReportDraft(report.$id, { additionalNotes: notes.trim() });
      toast.success('تم حفظ المسودة');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'خطأ في حفظ المسودة');
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    setApproving(true);
    try {
      const res = await fetch(`/api/reports/${reportId}/pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل توليد PDF التقرير');
      setReport((prev) =>
        prev
          ? {
              ...prev,
              status: 'معتمد',
              reviewedBy: data.reviewedBy,
              reviewedAt: data.reviewedAt,
              reportHash: data.reportHash,
              pdfFileId: data.pdfFileId,
            }
          : prev
      );
      setPdfUrl(getFileViewUrl(data.pdfFileId));
      toast.success('تم اعتماد التقرير وإغلاقه نهائيًا');
      setApproveOpen(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'فشل اعتماد التقرير');
    } finally {
      setApproving(false);
    }
  };

  if (loading) return <AuthGuard><DashboardLayout><TableSkeleton rows={8} cols={3} /></DashboardLayout></AuthGuard>;
  if (!report) return <AuthGuard><DashboardLayout><EmptyData title="التقرير غير موجود" /></DashboardLayout></AuthGuard>;
  if (!snapshot) return <AuthGuard><DashboardLayout><EmptyData title="بيانات التقرير غير صالحة" /></DashboardLayout></AuthGuard>;

  const isApproved = report.status === 'معتمد';

  const plan = getReportSectionPlan(snapshot);
  const showLimits = hasLimits(snapshot);
  const metaRows = plan.metaRows;

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="max-w-3xl mx-auto space-y-4">
          <Breadcrumb
            items={[
              { href: '/dashboard/tests', label: 'الفحوصات' },
              { href: `/dashboard/tests/${report.testId}`, label: 'تفاصيل الفحص' },
              { label: `التقرير ${report.reportNumber}` },
            ]}
          />

          {/* رأس التقرير */}
          <Card className="space-y-3">
            <div className="flex items-start justify-between gap-4" style={{ borderBottom: `3px solid ${primaryColor}`, paddingBottom: 12 }}>
              <div className="flex items-center gap-3 min-w-0">
                {template?.logoFileId && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={getFileViewUrl(template.logoFileId)} alt="شعار المختبر" className="w-16 h-16 object-contain" />
                )}
                <div className="min-w-0">
                  <h1 className="text-xl font-bold" style={{ color: primaryColor }}>{template?.labName || 'مختبرات الشمال'}</h1>
                  {template?.labNameEn && <p className="text-xs text-text-muted text-left" dir="ltr">{template.labNameEn}</p>}
                  {template?.accreditationText && <p className="text-xs text-text-muted mt-1">{template.accreditationText}</p>}
                </div>
              </div>
              <div className="text-center border rounded-lg px-3 py-2 flex-shrink-0" style={{ borderColor: primaryColor }}>
                <p className="text-xs text-text-muted">رقم التقرير</p>
                <p className="font-bold" style={{ color: primaryColor }} dir="ltr">{report.reportNumber}</p>
                <p className="text-xs text-text-muted">{formatDate(report.$createdAt)}</p>
              </div>
            </div>

            {(template?.addressLine || template?.phone || template?.email) && (
              <div className="text-sm text-white px-3 py-2 rounded-lg" style={{ backgroundColor: primaryColor }}>
                {[template.addressLine, template.phone, template.email].filter(Boolean).join(' • ')}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm text-text-muted">الحالة:</span>
              <Badge status={report.status} />
              {isApproved && (
                <span className="text-sm text-success flex items-center gap-1">
                  <ShieldCheck size={16} /> محمي بتوقيع رقمي (SHA-256)
                </span>
              )}
            </div>
          </Card>

          {/* بيانات الفحص */}
          <Card>
            <h2 className="font-bold text-lg mb-3 flex items-center gap-2"><FileText size={18} className="text-primary" /> بيانات الفحص</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
              {metaRows.map(([label, value]) => (
                <div key={label} className="flex justify-between gap-2 text-sm border-b border-border/50 py-1.5">
                  <span className="text-text-muted">{label}</span>
                  <span className="font-medium text-left">{value}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* النتائج */}
          <Card>
            <h2 className="font-bold text-lg mb-3">{plan.resultsTitle}</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-surface-dim border-b border-border">
                    <th className="text-right p-3 text-sm font-semibold">البند</th>
                    <th className="text-right p-3 text-sm font-semibold">النتيجة</th>
                    <th className="text-right p-3 text-sm font-semibold">الوحدة</th>
                    {showLimits && (
                      <>
                        <th className="text-right p-3 text-sm font-semibold">الحد الأدنى</th>
                        <th className="text-right p-3 text-sm font-semibold">الحد الأقصى</th>
                        <th className="text-right p-3 text-sm font-semibold">المطابقة</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {snapshot.resultRows.map((row, idx) => {
                    const pass = showLimits ? rowPass(row) : undefined;
                    return (
                      <tr key={idx} className="border-b">
                        <td className="p-3">{row.label}</td>
                        <td className="p-3 font-bold">{row.value || '-'}</td>
                        <td className="p-3 text-sm">{row.unit || '-'}</td>
                        {showLimits && (
                          <>
                            <td className="p-3 text-sm">{row.min ?? '—'}</td>
                            <td className="p-3 text-sm">{row.max ?? '—'}</td>
                            <td className="p-3">
                              {pass === true ? <Badge status="مطابق" /> : pass === false ? <Badge status="غير مطابق" /> : <span className="text-text-muted">—</span>}
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                  {snapshot.resultRows.length === 0 && (
                    <tr><td colSpan={showLimits ? 6 : 3}><EmptyData title="لا توجد نتائج مسجلة" className="py-8" /></td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {showLimits && (
              <p className="mt-2 text-xs text-text-muted">تُقارن النتائج بحدود القبول الواردة في المعيار المطبق.</p>
            )}
            <p className="mt-3 text-sm">
              <span className="text-text-muted">حالة المطابقة: </span>
              {complianceLabel(snapshot) === 'مطابق' ? <Badge status="مطابق" /> : complianceLabel(snapshot) === 'غير مطابق' ? <Badge status="غير مطابق" /> : <span className="text-text-muted">لم يُقيَّم</span>}
            </p>
            {plan.methodNote && (
              <p className="mt-3 text-xs text-text-muted border-r-2 pr-3" style={{ borderColor: primaryColor }}>
                <span className="font-semibold">ملاحظة المنهجية: </span>
                {plan.methodNote}
              </p>
            )}
          </Card>

          {/* الملاحظات + القفل */}
          {isApproved ? (
            <>
              <Card>
                <h2 className="font-bold text-lg mb-2">الملاحظات</h2>
                <p className="text-sm whitespace-pre-wrap border border-border rounded-lg p-3 bg-surface-dim">
                  {notes || 'لا توجد ملاحظات.'}
                </p>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between border-b border-border/50 py-1.5">
                    <span className="text-text-muted">اعتمده:</span>
                    <span className="font-medium">{report.reviewedBy || '-'}</span>
                  </div>
                  <div className="flex justify-between border-b border-border/50 py-1.5">
                    <span className="text-text-muted">تاريخ الاعتماد:</span>
                    <span className="font-medium">{formatDate(report.reviewedAt)}</span>
                  </div>
                  <div className="sm:col-span-2 flex justify-between border-b border-border/50 py-1.5">
                    <span className="text-text-muted">بصمة التقرير (SHA-256):</span>
                    <span className="font-mono text-xs" dir="ltr">{shortHash(report.reportHash)}</span>
                  </div>
                </div>
              </Card>
              <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                <div className="flex items-center gap-2 text-success font-bold">
                  <CheckCircle2 size={18} /> التقرير مُعتمد ومُقفل — لا يمكن تعديله
                </div>
                {pdfUrl && (
                  <a
                    href={pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                    className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:from-primary-dark hover:to-primary font-bold"
                  >
                    <FileDown size={18} /> تحميل PDF النهائي
                  </a>
                )}
              </div>
            </>
          ) : (
            <>
              <Card className="space-y-4">
                <h2 className="font-bold text-lg mb-2">الملاحظات الإضافية</h2>
                <p className="text-xs text-text-muted -mt-3">الحقل الوحيد القابل للتعديل — بقية البيانات لقطة ثابتة من الفحص الأصلي ولا تُعدّل.</p>
                <TextAreaField
                  label="ملاحظات إضافية"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  placeholder="أي توضيحات أو شروط إضافية تظهر في التقرير..."
                />
                <SubmitButton onClick={handleSaveDraft} loading={saving} loadingText="جارٍ الحفظ...">
                  <Save size={16} /> حفظ المسودة
                </SubmitButton>
              </Card>

              <Card className="border border-danger bg-danger-bg space-y-4">
                <h2 className="font-bold text-lg flex items-center gap-2 text-danger"><Lock size={18} /> الاعتماد النهائي</h2>
                <p className="text-sm text-danger/90">
                  عند الاعتماد سيُولَّد PDF نهائي من بيانات التقرير، وتُحسب بصمة SHA-256، ويُقفل التقرير نهائيًا ولا يمكن تعديله أو فتحه مرة أخرى.
                </p>
                <p className="text-sm">
                  <span className="text-text-muted">سيُسجَّل اسم المعتمِد الحالي من حسابك: </span>
                  <span className="font-bold">{reviewerName || '-'}</span>
                </p>
                <button
                  onClick={() => setApproveOpen(true)}
                  className="bg-danger-solid text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-danger-dark font-bold"
                >
                  <Lock size={18} /> اعتماد وإغلاق التقرير
                </button>
              </Card>
            </>
          )}

          <Link href={`/dashboard/tests/${report.testId}`} className="inline-flex items-center gap-1 text-primary text-sm hover:underline">
            العودة إلى تفاصيل الفحص
          </Link>

          <ConfirmModal
            isOpen={approveOpen}
            onClose={() => setApproveOpen(false)}
            onConfirm={handleApprove}
            title="اعتماد التقرير نهائيًا"
            message={`سيتم توليد PDF نهائي للتقرير "${report.reportNumber}" وإغلاقه نهائيًا. هذا الإجراء نهائي ولا يمكن التراجع عنه. هل أنت متأكد؟`}
            confirmText="اعتماد وإغلاق"
            cancelText="إلغاء"
            loading={approving}
          />
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}
