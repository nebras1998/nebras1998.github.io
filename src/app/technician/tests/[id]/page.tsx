'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import type { Test, Sample } from '@/types';
import { getTest, updateTest, getSample, listEmployees, Query } from '@/lib/services';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/useAuthStore';
import { ArrowRight, Save } from 'lucide-react';
import { createNotification } from '@/lib/notifications';
import TestResultRowsEditor, { calcAvg } from '@/components/tests/TestResultRowsEditor';
import Card from '@/components/Card';
import TextField from '@/components/TextField';
import TextAreaField from '@/components/TextAreaField';
import SubmitButton from '@/components/SubmitButton';
import TableSkeleton from '@/components/TableSkeleton';
import EmptyData from '@/components/EmptyData';
import Badge from '@/components/Badge';
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

  // --- حفظ النتيجة ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!test) { toast.error('الفحص غير موجود'); setSaving(false); return; }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        unit,
        notes,
        status: 'مكتمل',
        completedBy: employee?.$id,
        completedAt: completedAt || new Date().toISOString(),
      };

      let compliance: 'مطابق' | 'غير مطابق' | undefined;

      if (isDualAge) {
        // فحص مقاومة الضغط (عمرين)
        const valid7 = age7Results.filter((r) => r.trim() !== '');
        const valid28 = age28Results.filter((r) => r.trim() !== '');
        payload.result7Days = JSON.stringify(valid7.map(Number));
        payload.result28Days = JSON.stringify(valid28.map(Number));
        payload.average7Days = parseFloat(calcAvg(age7Results) || '0');
        payload.average28Days = parseFloat(calcAvg(age28Results) || '0');
        payload.test7Date = test7Date;
        payload.test28Date = test28Date;
        payload.result = '';
        compliance = evaluateCompliance('dual_age', appliedStandard, {
          average7Days: payload.average7Days as number,
          average28Days: payload.average28Days as number,
        });
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

      if (compliance) payload.complianceStatus = compliance;

      await updateTest(testId, payload);

      // تنبيه المديرين والإداريين
      if (employee) {
        const sampleNumber = sample?.sampleNumber || test.sampleId;
        const resultText = isDualAge
          ? `7 أيام: ${calcAvg(age7Results)} / 28 يوم: ${calcAvg(age28Results)}`
          : isMultiField
          ? resultFields.map((f) => `${f.label}: ${resultFieldsValues[f.key] || '-'}`).join(' / ')
          : isMultiResult
          ? `متوسط: ${calcAvg(cubeResults)}`
          : result;

        try {
          const managersRes = await listEmployees([
            Query.equal('status', 'يعمل'),
            Query.limit(200),
          ]);
          const recipients = managersRes.documents.filter(
            (e) => e.role === 'مدير' || e.role === 'إداري'
          );
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

      toast.success('تم حفظ النتيجة بنجاح');
      router.push('/technician/dashboard');
    } catch (err: unknown) {
      toast.error('خطأ في الحفظ: ' + (err instanceof Error ? err.message : String(err)));
      setSaving(false);
    }
  };

  if (loading) return <div className="p-4"><TableSkeleton rows={6} cols={2} /></div>;
  if (!test) return <div className="p-4"><EmptyData title="الفحص غير موجود" /></div>;

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
    </div>
  );
}