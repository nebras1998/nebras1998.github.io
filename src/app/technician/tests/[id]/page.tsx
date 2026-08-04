'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import type { Test, Sample } from '@/types';
import { getTest, updateTest, getSample } from '@/lib/services';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/useAuthStore';
import { ArrowRight, Save, Plus, X } from 'lucide-react';
import { createNotification } from '@/lib/notifications';
import Card from '@/components/Card';
import TextField from '@/components/TextField';
import TextAreaField from '@/components/TextAreaField';
import SubmitButton from '@/components/SubmitButton';

const MULTI_RESULT_TESTS = ['مقاومة الضغط للقلب الخرساني']; // فحوصات متعددة المكعبات (بدون أعمار)
const DUAL_AGE_TESTS = ['مقاومة الضغط']; // الفحص الذي له عمر 7 و 28 يوم

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

  const [saving, setSaving] = useState(false);

  const isMultiResult = MULTI_RESULT_TESTS.includes(test?.testName || '');
  const isDualAge = DUAL_AGE_TESTS.includes(test?.testName || '');

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
    const nums = vals.map(Number).filter(n => !isNaN(n));
    return nums.length ? (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2) : '';
  };

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

      if (isDualAge) {
        // فحص مقاومة الضغط (عمرين)
        payload.result7Days = JSON.stringify(age7Results.map(Number));
        payload.result28Days = JSON.stringify(age28Results.map(Number));
        payload.average7Days = parseFloat(calcAvg(age7Results) || '0');
        payload.average28Days = parseFloat(calcAvg(age28Results) || '0');
        payload.test7Date = test7Date;
        payload.test28Date = test28Date;
        payload.result = '';
      } else if (isMultiResult) {
        // فحوصات متعددة المكعبات
        const valid = cubeResults.filter(r => r.trim() !== '');
        if (!valid.length) { toast.error('أدخل نتيجة واحدة على الأقل'); setSaving(false); return; }
        payload.results = JSON.stringify(valid.map(Number));
        payload.averageResult = parseFloat(calcAvg(valid) || '0');
        payload.result = '';
      } else {
        // فحص عادي
        if (!result) { toast.error('الرجاء إدخال النتيجة'); setSaving(false); return; }
        payload.result = result;
      }

      await updateTest(testId, payload);

      // تنبيه المدير
      if (employee) {
        const sampleNumber = sample?.sampleNumber || test.sampleId;
        const resultText = isDualAge
          ? `7 أيام: ${calcAvg(age7Results)} / 28 يوم: ${calcAvg(age28Results)}`
          : isMultiResult
          ? `متوسط: ${calcAvg(cubeResults)}`
          : result;
        await createNotification({
          type: 'فحص_مكتمل',
          message: `أكمل ${employee.name} فحص "${test.testName}" للعينة ${sampleNumber} بالنتيجة ${resultText}`,
          relatedId: testId,
          employeeId: employee.$id,
          employeeName: employee.name,
        });
      }

      toast.success('تم حفظ النتيجة بنجاح');
      router.push('/technician/dashboard');
    } catch (err: unknown) {
      toast.error('خطأ في الحفظ: ' + (err instanceof Error ? err.message : String(err)));
      setSaving(false);
    }
  };

  if (loading) return <div className="p-4 text-center">جارٍ التحميل...</div>;
  if (!test) return <div className="p-4 text-center text-danger">الفحص غير موجود</div>;

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
          <p><span className="text-concrete-500">المواصفة:</span> {test.specification || '-'}</p>
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
                    <span className="text-sm">{unit || 'kg/cm2'}</span>
                    {age7Results.length > 1 && (
                      <button type="button" onClick={() => removeResult(setAge7Results, idx)} className="text-danger p-1"><X size={18} /></button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={() => addResult(setAge7Results)} className="mt-2 text-petrol text-sm flex items-center gap-1 font-bold">
                  <Plus size={16} /> إضافة مكعب
                </button>
                <div className="mt-3 text-center font-bold text-success">
                  المتوسط: {calcAvg(age7Results)} {unit || 'kg/cm2'}
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
                    <span className="text-sm">{unit || 'kg/cm2'}</span>
                    {age28Results.length > 1 && (
                      <button type="button" onClick={() => removeResult(setAge28Results, idx)} className="text-danger p-1"><X size={18} /></button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={() => addResult(setAge28Results)} className="mt-2 text-petrol text-sm flex items-center gap-1 font-bold">
                  <Plus size={16} /> إضافة مكعب
                </button>
                <div className="mt-3 text-center font-bold text-success">
                  المتوسط: {calcAvg(age28Results)} {unit || 'kg/cm2'}
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
                  <span className="text-sm">{unit || 'kg/cm2'}</span>
                  {cubeResults.length > 1 && (
                    <button type="button" onClick={() => removeResult(setCubeResults, idx)} className="text-danger p-1"><X size={18} /></button>
                  )}
                </div>
              ))}
              <div className="text-center font-bold text-success mt-2">
                المتوسط: {calcAvg(cubeResults)} {unit || 'kg/cm2'}
              </div>
            </div>
          )}

          {/* ========== فحص عادي ========== */}
          {!isDualAge && !isMultiResult && (
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