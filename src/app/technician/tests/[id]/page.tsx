'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import type { Test, Sample } from '@/types';
import { getTest, getSample, getManagerRecipients } from '@/lib/services';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/useAuthStore';
import { ArrowRight, Save, CheckCircle2, Clock } from 'lucide-react';
import { createNotification } from '@/lib/notifications';
import { apiFetch } from '@/lib/api-client';
import { formatDateAr } from '@/lib/helpers';
import TestResultRowsEditor, { calcAvg } from '@/components/tests/TestResultRowsEditor';
import Card from '@/components/Card';
import TextField from '@/components/TextField';
import TextAreaField from '@/components/TextAreaField';
import SubmitButton from '@/components/SubmitButton';
import TableSkeleton from '@/components/TableSkeleton';
import EmptyData from '@/components/EmptyData';
import Badge from '@/components/Badge';
import TechnicianBottomNav from '@/components/TechnicianBottomNav';
import {
  getTestResultType,
  parseResultFields,
  parseAppliedStandard,
  evaluateCompliance,
  type ResultFieldDef,
  type SpecificationProfile,
  type TestResultType,
} from '@/lib/test-config';

export default function TechnicianTestPage() {
  const params = useParams();
  const testId = params.id as string;
  const router = useRouter();
  const { employee } = useAuthStore();

  const [test, setTest] = useState<Test | null>(null);
  const [sample, setSample] = useState<Sample | null>(null);
  const [loading, setLoading] = useState(true);

  // --- حقول الفحص العادي ---
  const [result, setResult] = useState('');
  const [unit, setUnit] = useState('');
  const [notes, setNotes] = useState('');
  const [completedAt, setCompletedAt] = useState('');

  // --- نتائج الأعمار (للخرسانة) ---
  const [age7Results, setAge7Results] = useState<string[]>(['', '', '']);
  const [age28Results, setAge28Results] = useState<string[]>(['', '', '']);
  const [test7Date, setTest7Date] = useState('');
  const [test28Date, setTest28Date] = useState('');

  // --- نتائج متعددة (للقلب الخرساني) ---
  const [cubeResults, setCubeResults] = useState<string[]>(['', '', '']);

  // --- نتائج متعددة الحقول (multi_field) ---
  const [resultFields, setResultFields] = useState<ResultFieldDef[]>([]);
  const [resultFieldsValues, setResultFieldsValues] = useState<Record<string, string>>({});

  // --- المواصفة المطبقة (لحساب المطابقة) ---
  const [appliedStandard, setAppliedStandard] = useState<SpecificationProfile | null>(null);

  const [saving, setSaving] = useState(false);

  // --- تأكيد بصري دائم بعد الحفظ (لا اعتماد على toast يعبر ويختفي) ---
  const [saved, setSaved] = useState<{ status: 'مكتمل' | 'قيد الانتظار'; complianceStatus?: string } | null>(null);

  const resultType: TestResultType = getTestResultType(test?.testName, test?.resultType);
  const isDualAge = resultType === 'dual_age';
  const isMultiResult = resultType === 'multi_no_age';
  const isMultiField = resultType === 'multi_field';

  // --- جلب بيانات الفحص ---
  useEffect(() => {
    const fetchTest = async () => {
      try {
        const t = await getTest(testId);
        setTest(t);

        // تعبئة الحقول الأساسية
        setResult(t.result || '');
        setUnit(t.unit || '');
        setNotes(t.notes || '');
        setCompletedAt(t.completedAt || new Date().toISOString().split('T')[0]);

        // تعبئة نتائج الأعمار إن وُجدت
        if (t.result7Days) {
          try { setAge7Results(JSON.parse(t.result7Days).map(String)); } catch { setAge7Results(['', '', '']); }
        }
        if (t.result28Days) {
          try { setAge28Results(JSON.parse(t.result28Days).map(String)); } catch { setAge28Results(['', '', '']); }
        }
        setTest7Date(t.test7Date || '');
        setTest28Date(t.test28Date || '');

        // تعبئة نتائج متعددة (القلب) إن وُجدت
        if (t.results) {
          try { setCubeResults(JSON.parse(t.results).map(String)); } catch { setCubeResults(['', '', '']); }
        }

        // تعبئة حقول multi_field والمواصفة المطبقة
        setResultFields(parseResultFields(t.resultFields));
        setAppliedStandard(parseAppliedStandard(t.appliedStandard));
        if (t.resultFieldsValues) {
          try { setResultFieldsValues(JSON.parse(t.resultFieldsValues)); } catch { setResultFieldsValues({}); }
        }

        // جلب بيانات العينة المرتبطة (لحساب تواريخ الفحص إن لم تكن موجودة)
        if (t.sampleId) {
          const s = await getSample(t.sampleId);
          setSample(s);
          // إذا لم تكن تواريخ الفحص محددة، نحسبها من تاريخ أخذ العينة
          if (!t.test7Date && s.samplingDate) {
            const d = new Date(s.samplingDate);
            const d7 = new Date(d); d7.setDate(d7.getDate() + 7);
            const d28 = new Date(d); d28.setDate(d28.getDate() + 28);
            setTest7Date(d7.toISOString().split('T')[0]);
            setTest28Date(d28.toISOString().split('T')[0]);
          }
        }
      } catch {
        toast.error('فشل تحميل بيانات الفحص');
      } finally {
        setLoading(false);
      }
    };
    fetchTest();
  }, [testId]);

  const hasEnteredValue =
    isDualAge
      ? age7Results.some((v) => v.trim() !== '') || age28Results.some((v) => v.trim() !== '')
      : isMultiResult
      ? cubeResults.some((v) => v.trim() !== '')
      : isMultiField
      ? Object.values(resultFieldsValues).some((v) => v.trim() !== '')
      : result.trim() !== '';

  const liveCompliance = useMemo(
    () =>
      evaluateCompliance(resultType, appliedStandard, {
        result,
        average7Days: parseFloat(calcAvg(age7Results) || '0'),
        average28Days: parseFloat(calcAvg(age28Results) || '0'),
        averageResult: parseFloat(calcAvg(cubeResults) || '0'),
        resultFieldsValues,
      }),
    [resultType, appliedStandard, result, age7Results, age28Results, cubeResults, resultFieldsValues]
  );
  const showLiveCompliance = !!liveCompliance && hasEnteredValue;

  // --- حماية الملكية (منع IDOR): الفني يعدل فقط ما أُسند إليه ---
  const isManager = employee?.role === 'مدير';
  const canEdit = employee ? isManager || test?.assignedTo === employee.$id : false;

  // --- حفظ النتيجة ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!test) { toast.error('الفحص غير موجود'); setSaving(false); return; }
    if (!canEdit) { toast.error('لا تملك صلاحية تعديل هذا الفحص'); setSaving(false); return; }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        unit,
        notes,
        completedBy: employee?.$id,
      };

      let compliance: 'مطابق' | 'غير مطابق' | undefined;
      let nextStatus: 'مكتمل' | 'قيد الانتظار' = 'مكتمل';

      if (isDualAge) {
        // فحص مقاومة الضغط (عمرين): يُحفظ كـ«قيد الانتظار» إذا أُدخِل عمر 7 أيام فقط،
        // ويُغلق كـ«مكتمل» بعد إدخال نتيجة 28 يوم — حتى يبقى ظاهرًا في مهام الفني.
        const valid7 = age7Results.filter((r) => r.trim() !== '');
        const valid28 = age28Results.filter((r) => r.trim() !== '');
        if (valid7.length === 0 && valid28.length === 0) {
          toast.error('أدخل نتيجة عمر 7 أو 28 يوم على الأقل');
          setSaving(false);
          return;
        }
        payload.result7Days = JSON.stringify(valid7.map(Number));
        payload.result28Days = JSON.stringify(valid28.map(Number));
        payload.average7Days = parseFloat(calcAvg(age7Results) || '0');
        payload.average28Days = parseFloat(calcAvg(age28Results) || '0');
        payload.test7Date = test7Date;
        payload.test28Date = test28Date;
        payload.result = '';
        if (valid28.length > 0) {
          nextStatus = 'مكتمل';
          compliance = evaluateCompliance('dual_age', appliedStandard, {
            average7Days: payload.average7Days as number,
            average28Days: payload.average28Days as number,
          });
        } else {
          // نتيجة 7 أيام فقط: نُبقي الفحص مفتوحًا ولا نحتسب المطابقة قبل اكتمال العمرين.
          nextStatus = 'قيد الانتظار';
        }
      } else if (isMultiField) {
        // فحوصات متعددة الحقول
        const cleanValues: Record<string, string> = {};
        for (const f of resultFields) {
          const value = (resultFieldsValues[f.key] || '').trim();
          if (value) cleanValues[f.key] = value;
        }
        if (resultFields.length > 0 && Object.keys(cleanValues).length === 0) {
          toast.error('أدخل نتيجة واحدة على الأقل');
          setSaving(false);
          return;
        }
        payload.resultFieldsValues = JSON.stringify(cleanValues);
        payload.results = '';
        payload.result = '';
        if (Object.keys(cleanValues).length > 0) {
          compliance = evaluateCompliance('multi_field', appliedStandard, { resultFieldsValues: cleanValues });
        }
      } else if (isMultiResult) {
        // فحوصات متعددة المكعبات
        const valid = cubeResults.filter(r => r.trim() !== '');
        if (!valid.length) { toast.error('أدخل نتيجة واحدة على الأقل'); setSaving(false); return; }
        payload.results = JSON.stringify(valid.map(Number));
        payload.averageResult = parseFloat(calcAvg(valid) || '0');
        payload.result = '';
        compliance = evaluateCompliance('multi_no_age', appliedStandard, { averageResult: payload.averageResult as number });
      } else {
        // فحص عادي
        if (!result) { toast.error('الرجاء إدخال النتيجة'); setSaving(false); return; }
        payload.result = result;
        compliance = evaluateCompliance('single', appliedStandard, { result });
      }

      payload.status = nextStatus;
      if (compliance) payload.complianceStatus = compliance;
      if (nextStatus === 'مكتمل') {
        payload.completedAt = completedAt || new Date().toISOString();
      } else {
        payload.completedAt = '';
      }

      await apiFetch('/api/tests/' + testId, { method: 'PATCH', body: JSON.stringify(payload) });

      // تنبيه المديرين والإداريين عند الاكتمال فقط
      if (nextStatus === 'مكتمل' && employee) {
        const sampleNumber = sample?.sampleNumber || test.sampleId;
        const resultText = isDualAge
          ? `7 أيام: ${calcAvg(age7Results)} / 28 يوم: ${calcAvg(age28Results)}`
          : isMultiField
          ? resultFields.map((f) => `${f.label}: ${resultFieldsValues[f.key] || '-'}`).join(' / ')
          : isMultiResult
          ? `متوسط: ${calcAvg(cubeResults)}`
          : result;

        try {
          const recipients = await getManagerRecipients();
          if (recipients.length === 0) {
            console.warn('فشل إرسال تنبيه للمدير: لا يوجد موظفون بدور مدير أو إداري');
          }
          await Promise.all(
            recipients.map((manager) =>
              createNotification({
                type: 'فحص_مكتمل',
                message: `أكمل ${employee.name} فحص "${test.testName}" للعينة ${sampleNumber} بالنتيجة ${resultText}`,
                relatedId: testId,
                employeeId: manager.$id,
                employeeName: manager.name,
              })
            )
          );
        } catch (notifyErr) {
          console.error('فشل إرسال تنبيه للمدير:', notifyErr);
        }
      }

      setSaved({ status: nextStatus, complianceStatus: compliance });
      toast.success(nextStatus === 'مكتمل' ? 'تم حفظ النتيجة بنجاح' : 'تم حفظ نتيجة 7 أيام، سيُفتح الفحص حتى إدخال نتيجة 28 يوم');
    } catch (err: unknown) {
      toast.error('خطأ في الحفظ: ' + (err instanceof Error ? err.message : String(err)));
      setSaving(false);
    }
  };

  if (loading) return <div className="p-4"><TableSkeleton rows={6} cols={2} /></div>;
  if (!test) return <div className="p-4"><EmptyData title="الفحص غير موجود" /></div>;

  // حماية الملكية: عرض بدون نموذج تعديل لمن لا يملك الفحص (نفس عائلة IDOR).
  if (!canEdit) {
    return (
      <div className="min-h-screen bg-surface-dim pb-20" dir="rtl">
        <header className="bg-primary text-white p-4 flex items-center gap-3 shadow">
          <button onClick={() => router.back()} className="text-white"><ArrowRight size={24} /></button>
          <h1 className="text-lg font-bold">{test.testName}</h1>
        </header>
        <main className="p-4">
          <EmptyData title="هذا الفحص غير مسند إليك" />
          <div className="mt-4 text-center">
            <button onClick={() => router.push('/technician/dashboard')} className="bg-primary text-white px-6 py-3 rounded-xl font-bold">
              العودة إلى مهامي
            </button>
          </div>
        </main>
        <TechnicianBottomNav />
      </div>
    );
  }

  // تأكيد بصري واضح بعد الحفظ (لا يعتمد على toast عابر).
  if (saved) {
    return (
      <div className="min-h-screen bg-surface-dim pb-20" dir="rtl">
        <header className="bg-primary text-white p-4 flex items-center gap-3 shadow">
          <h1 className="text-lg font-bold">حفظ النتيجة</h1>
        </header>
        <main className="p-4">
          <Card className="text-center py-8 space-y-4">
            <CheckCircle2 size={64} className="mx-auto text-success" />
            <h2 className="text-2xl font-bold text-text-primary">
              {saved.status === 'مكتمل' ? 'تم حفظ النتيجة بنجاح' : 'تم حفظ نتيجة 7 أيام'}
            </h2>
            <p className="text-text-secondary">
              {saved.status === 'مكتمل'
                ? `تم إغلاق فحص "${test.testName}" للعينة ${sample?.sampleNumber || test.sampleId}.`
                : 'سيبقى الفحص ظاهرًا في مهامك لإدخال نتيجة 28 يوم لاحقًا.'}
            </p>
            {saved.complianceStatus && (
              <div className="flex items-center justify-center gap-2">
                <span className="text-sm font-bold">حالة المطابقة:</span>
                <Badge status={saved.complianceStatus} />
              </div>
            )}
            {saved.status === 'قيد الانتظار' && (
              <div className="flex items-center justify-center gap-2 text-warning text-sm">
                <Clock size={16} />
                نتيجة 28 يوم: {formatDateAr(test28Date)}
              </div>
            )}
            <button
              onClick={() => router.push('/technician/dashboard')}
              className="mx-auto bg-primary text-white px-8 py-3 rounded-xl font-bold hover:from-primary-dark hover:to-primary"
            >
              العودة إلى مهامي
            </button>
          </Card>
        </main>
        <TechnicianBottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-dim pb-20" dir="rtl">
      <header className="bg-primary text-white p-4 flex items-center gap-3 shadow">
        <button onClick={() => router.back()} className="text-white"><ArrowRight size={24} /></button>
        <h1 className="text-lg font-bold">{test.testName}</h1>
      </header>

      <main className="p-4">
        <Card className="mb-4 space-y-1 text-sm">
          <p><span className="text-text-muted">رقم العينة:</span> {sample?.sampleNumber || test.sampleId}</p>
          <p><span className="text-text-muted">النوع:</span> {sample?.type || '-'}</p>
          <p><span className="text-text-muted">المواصفة:</span> {appliedStandard?.specification || test.specification || '-'}</p>
          {appliedStandard && <p><span className="text-text-muted">المعيار المطبق:</span> {appliedStandard.name}</p>}
          {showLiveCompliance && (
            <div className="flex items-center justify-between pt-2 border-t mt-2">
              <span className="font-bold text-sm">حالة المطابقة</span>
              <Badge status={liveCompliance} />
            </div>
          )}
        </Card>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* ========== نتائج الفحص حسب النوع ========== */}
          <TestResultRowsEditor
            resultType={resultType}
            unit={unit}
            age7Results={age7Results}
            age28Results={age28Results}
            test7Date={test7Date}
            test28Date={test28Date}
            onAge7ResultsChange={(v) => setAge7Results(v)}
            onAge28ResultsChange={(v) => setAge28Results(v)}
            onTest7DateChange={(v) => setTest7Date(v)}
            onTest28DateChange={(v) => setTest28Date(v)}
            cubeResults={cubeResults}
            onCubeResultsChange={(v) => setCubeResults(v)}
            resultFields={resultFields}
            resultFieldsValues={resultFieldsValues}
            onResultFieldsValuesChange={(v) => setResultFieldsValues(v)}
          />

        {/* ========== فحص عادي ========== */}
          {!isDualAge && !isMultiResult && !isMultiField && (
            <>
              <Card className="space-y-4">
                <TextField
                  label="النتيجة"
                  type="text"
                  value={result}
                  onChange={e => setResult(e.target.value)}
                  required
                  inputClassName="text-lg"
                  placeholder="أدخل قيمة النتيجة"
                  dir="ltr"
                />
                <TextField
                  label="الوحدة"
                  type="text"
                  value={unit}
                  onChange={e => setUnit(e.target.value)}
                  placeholder="kg/cm2, MPa"
                  dir="ltr"
                />
              </Card>
            </>
          )}

          {/* --- حقول مشتركة --- */}
          <Card className="space-y-4">
            <TextField
              label="تاريخ النتيجة"
              type="date"
              value={completedAt}
              onChange={e => setCompletedAt(e.target.value)}
            />
            <TextAreaField
              label="ملاحظات"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="أي ملاحظات إضافية..."
            />
          </Card>

          <SubmitButton
            loading={saving}
            className="w-full text-lg flex items-center justify-center gap-2"
          >
            <Save size={22} />
            حفظ النتيجة
          </SubmitButton>
        </form>
      </main>

      <TechnicianBottomNav />
    </div>
  );
}