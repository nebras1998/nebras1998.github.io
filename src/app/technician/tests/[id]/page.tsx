'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import type { Test, Sample } from '@/types';
import { getTest, updateTest, getSample, listEmployees, Query } from '@/lib/services';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/useAuthStore';
import { ArrowRight, Save, Plus, X } from 'lucide-react';
import { createNotification } from '@/lib/notifications';
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

  // --- دوال مساعدة لنتائج المكعبات ---
  const updateResult = (setter: React.Dispatch<React.SetStateAction<string[]>>, index: number, value: string) => {
    setter((prev: string[]) => { const n = [...prev]; n[index] = value; return n; });
  };
  const addResult = (setter: React.Dispatch<React.SetStateAction<string[]>>) => setter((prev: string[]) => [...prev, '']);
  const removeResult = (setter: React.Dispatch<React.SetStateAction<string[]>>, index: number) => setter((prev: string[]) => prev.length > 1 ? prev.filter((_, i) => i !== index) : prev);
  const calcAvg = (vals: string[]) => {
    // filter blank cells before numeric conversion — Number('') === 0 would otherwise
    // silently pull the average down
    const nums = vals.filter((v) => v.trim() !== '').map(Number).filter((n) => !isNaN(n));
    return nums.length ? (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2) : '';
  };

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
    <div className="min-h-screen bg-concrete-50 pb-20" dir="rtl">
      <header className="bg-petrol text-white p-4 flex items-center gap-3 shadow">
        <button onClick={() => router.back()} className="text-white"><ArrowRight size={24} /></button>
        <h1 className="text-lg font-bold">{test.testName}</h1>
      </header>

      <main className="p-4">
        <Card className="mb-4 space-y-1 text-sm">
          <p><span className="text-concrete-500">رقم العينة:</span> {sample?.sampleNumber || test.sampleId}</p>
          <p><span className="text-concrete-500">النوع:</span> {sample?.type || '-'}</p>
          <p><span className="text-concrete-500">المواصفة:</span> {appliedStandard?.specification || test.specification || '-'}</p>
          {appliedStandard && <p><span className="text-concrete-500">المعيار المطبق:</span> {appliedStandard.name}</p>}
          {showLiveCompliance && (
            <div className="flex items-center justify-between pt-2 border-t mt-2">
              <span className="font-bold text-sm">حالة المطابقة</span>
              <Badge status={liveCompliance} />
            </div>
          )}
        </Card>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* ========== فحص مقاومة الضغط (عمرين) ========== */}
          {isDualAge && (
            <div className="space-y-4">
              {/* عمر 7 أيام */}
              <div className="bg-petrol-soft p-4 rounded-2xl">
                <h3 className="font-bold text-petrol mb-3">نتائج عمر 7 أيام</h3>
                <TextField label="تاريخ الفحص" type="date" value={test7Date} onChange={e => setTest7Date(e.target.value)} className="mb-3" />
                {age7Results.map((val, idx) => (
                  <div key={idx} className="flex items-center gap-2 mb-2">
                    <span className="text-sm w-16">مكعب {idx + 1}</span>
                    <TextField
                      type="number"
                      step="0.01"
                      value={val}
                      onChange={e => updateResult(setAge7Results, idx, e.target.value)}
                      className="flex-1"
                      placeholder="0"
                    />
                <span className="text-sm">{unit || '-'}</span>
                {age7Results.length > 1 && (
                  <button type="button" onClick={() => removeResult(setAge7Results, idx)} className="text-danger p-1"><X size={18} /></button>
                )}
                  </div>
                ))}
                <button type="button" onClick={() => addResult(setAge7Results)} className="mt-2 text-petrol text-sm flex items-center gap-1 font-bold">
                  <Plus size={16} /> إضافة مكعب
                </button>
                <div className="mt-3 text-center font-bold text-success">
                  المتوسط: {calcAvg(age7Results)}{unit ? ` ${unit}` : ''}
                </div>
              </div>

              {/* عمر 28 يوم */}
              <div className="bg-petrol-soft p-4 rounded-2xl">
                <h3 className="font-bold text-petrol mb-3">نتائج عمر 28 يوم</h3>
                <TextField label="تاريخ الفحص" type="date" value={test28Date} onChange={e => setTest28Date(e.target.value)} className="mb-3" />
                {age28Results.map((val, idx) => (
                  <div key={idx} className="flex items-center gap-2 mb-2">
                    <span className="text-sm w-16">مكعب {idx + 1}</span>
                    <TextField
                      type="number"
                      step="0.01"
                      value={val}
                      onChange={e => updateResult(setAge28Results, idx, e.target.value)}
                      className="flex-1"
                      placeholder="0"
                    />
                <span className="text-sm">{unit || '-'}</span>
                {age28Results.length > 1 && (
                  <button type="button" onClick={() => removeResult(setAge28Results, idx)} className="text-danger p-1"><X size={18} /></button>
                )}
                  </div>
                ))}
                <button type="button" onClick={() => addResult(setAge28Results)} className="mt-2 text-petrol text-sm flex items-center gap-1 font-bold">
                  <Plus size={16} /> إضافة مكعب
                </button>
                <div className="mt-3 text-center font-bold text-success">
                  المتوسط: {calcAvg(age28Results)}{unit ? ` ${unit}` : ''}
                </div>
              </div>
            </div>
          )}

          {/* ========== فحوصات متعددة المكعبات (القلب الخرساني) ========== */}
          {isMultiResult && !isDualAge && (
            <div className="bg-petrol-soft p-4 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-petrol">نتائج المكعبات</h3>
                <button type="button" onClick={() => addResult(setCubeResults)} className="text-petrol text-sm flex items-center gap-1 font-bold">
                  <Plus size={16} /> إضافة مكعب
                </button>
              </div>
              {cubeResults.map((val, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-sm w-16">مكعب {idx + 1}</span>
                  <TextField
                    type="number"
                    step="0.01"
                    value={val}
                    onChange={e => updateResult(setCubeResults, idx, e.target.value)}
                    className="flex-1"
                    placeholder="0"
                  />
                  <span className="text-sm">{unit || '-'}</span>
                  {cubeResults.length > 1 && (
                    <button type="button" onClick={() => removeResult(setCubeResults, idx)} className="text-danger p-1"><X size={18} /></button>
                  )}
                </div>
              ))}
              <div className="text-center font-bold text-success mt-2">
                المتوسط: {calcAvg(cubeResults)}{unit ? ` ${unit}` : ''}
              </div>
            </div>
          )}

          {/* ========== فحوصات متعددة الحقول (multi_field) ========== */}
          {isMultiField && (
            <div className="bg-petrol-soft p-4 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-petrol">نتائج الفحص</h3>
              </div>
              {resultFields.length === 0 ? (
                <p className="text-sm text-concrete-500">لم تُعرّف حقول نتائج لهذا الفحص.</p>
              ) : (
                resultFields.map((f) => (
                  <div key={f.key} className="flex items-center gap-2">
                    <span className="text-sm w-24 shrink-0">{f.label}</span>
                    <TextField
                      type="number"
                      step="0.01"
                      value={resultFieldsValues[f.key] || ''}
                      onChange={(e) => setResultFieldsValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                      className="flex-1"
                      placeholder="0"
                    />
                    <span className="text-sm">{f.unit || unit || '-'}</span>
                  </div>
                ))
              )}
            </div>
          )}

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