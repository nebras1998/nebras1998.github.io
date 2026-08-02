'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Sample } from '@/types';
import type { StandardTest } from '@/lib/services';
import type { Employee } from '@/types';
import { listSamples } from '@/lib/services/samples';
import { listEmployees } from '@/lib/services/employees';
import { createTest } from '@/lib/services/tests';
import { listSampleTypes, listStandardTests, type SampleType } from '@/lib/services/sample-types';
import { Query } from '@/lib/services';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';

import { toast } from 'sonner';

import { Plus, X } from 'lucide-react';
import { generateTestNumber } from '@/lib/helpers';

const MULTI_RESULT_TESTS = ['مقاومة الضغط للقلب الخرساني']; // فحوصات متعددة المكعبات (بدون أعمار)
const DUAL_AGE_TESTS = ['مقاومة الضغط']; // الفحص الذي له عمر 7 و 28 يوم

export default function NewTestPage() {
  const router = useRouter();
  const [samples, setSamples] = useState<Sample[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [standardTests, setStandardTests] = useState<StandardTest[]>([]);
  const [selectedSample, setSelectedSample] = useState<Sample | null>(null);

  // --- بيانات الفحص الأساسية ---
  const [formData, setFormData] = useState({
    testNumber: '',
    testName: '',
    sampleId: '',
    projectId: '',
    clientId: '',
    status: 'قيد الانتظار',
    result: '',
    unit: '',
    specification: '',
    assignedTo: '',
    notes: '',
  });

  // --- نتائج الأعمار (للخرسانة) ---
  const [age7Results, setAge7Results] = useState<string[]>(['', '', '']);
  const [age28Results, setAge28Results] = useState<string[]>(['', '', '']);
  const [test7Date, setTest7Date] = useState('');
  const [test28Date, setTest28Date] = useState('');

  // --- نتائج متعددة (للقلب الخرساني) ---
  const [cubeResults, setCubeResults] = useState<string[]>(['', '', '']);

  const [loading, setLoading] = useState(false);

  const isMultiResult = MULTI_RESULT_TESTS.includes(formData.testName);
  const isDualAge = DUAL_AGE_TESTS.includes(formData.testName);

  useEffect(() => {
    (async () => {
      try {
        const [samplesRes, employeesRes] = await Promise.all([
          listSamples([Query.orderDesc('$createdAt'), Query.limit(200)]),
          listEmployees([Query.equal('status', 'يعمل'), Query.limit(200)]),
        ]);
        setSamples(samplesRes.documents);
        setEmployees(employeesRes.documents);
      } catch { toast.error('فشل تحميل البيانات'); }
    })();
  }, []);

  // عند اختيار عينة، نحدد المشروع/العميل ونقترح التواريخ
  useEffect(() => {
    (async () => {
      if (!formData.sampleId) {
        setSelectedSample(null);
        setStandardTests([]);
        return;
      }
      const sample = samples.find((s) => s.$id === formData.sampleId);
      setSelectedSample(sample ?? null);
      if (!sample) return;
      setFormData((prev) => ({ ...prev, projectId: sample.projectId ?? '', clientId: sample.clientId ?? '', testName: '' }));
      if (sample.samplingDate) {
        const d = new Date(sample.samplingDate);
        const d7 = new Date(d); d7.setDate(d7.getDate() + 7);
        const d28 = new Date(d); d28.setDate(d28.getDate() + 28);
        setTest7Date(d7.toISOString().split('T')[0]);
        setTest28Date(d28.toISOString().split('T')[0]);
      }
      const typeRes = await listSampleTypes([Query.equal('name', sample.type), Query.limit(1)]);
      if (typeRes.documents.length > 0) {
        const typeDoc = typeRes.documents[0] as SampleType;
        const code = (typeDoc.code as string) || 'GEN';
        const newNumber = await generateTestNumber(code);
        setFormData((prev) => ({ ...prev, testNumber: newNumber }));
        const testsRes = await listStandardTests([
          Query.equal('sampleTypeId', typeDoc.$id as string),
          Query.limit(50),
        ]);
        setStandardTests(testsRes.documents);
      }
    })();
  }, [formData.sampleId, samples]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleTestSelect = (test: StandardTest) => {
    setFormData({ ...formData, testName: test.name, specification: test.specification || '', unit: test.unit || '' });
  };

  // دوال مساعدة لنتائج المكعبات
  const updateResult = (setter: React.Dispatch<React.SetStateAction<string[]>>, index: number, value: string) => {
    setter((prev: string[]) => { const n = [...prev]; n[index] = value; return n; });
  };
  const addResult = (setter: React.Dispatch<React.SetStateAction<string[]>>) => setter((prev: string[]) => [...prev, '']);
  const removeResult = (setter: React.Dispatch<React.SetStateAction<string[]>>, index: number) => setter((prev: string[]) => prev.length > 1 ? prev.filter((_, i) => i !== index) : prev);
  const calcAvg = (vals: string[]) => {
    const nums = vals.map(Number).filter(n => !isNaN(n));
    return nums.length ? (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2) : '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload: Record<string, unknown> = { ...formData };

      if (isDualAge) {
        // فحص مقاومة الضغط
        payload.result7Days = JSON.stringify(age7Results.map(Number));
        payload.result28Days = JSON.stringify(age28Results.map(Number));
        payload.average7Days = parseFloat(calcAvg(age7Results) || '0');
        payload.average28Days = parseFloat(calcAvg(age28Results) || '0');
        payload.test7Date = test7Date;
        payload.test28Date = test28Date;
        payload.result = '';
      } else if (isMultiResult) {
        // فحوصات متعددة المكعبات (القلب الخرساني)
        const valid = cubeResults.filter(r => r.trim() !== '');
        if (!valid.length) { toast.error('أدخل نتيجة واحدة على الأقل'); setLoading(false); return; }
        payload.results = JSON.stringify(valid.map(Number));
        payload.averageResult = parseFloat(calcAvg(valid) || '0');
        payload.result = '';
      } else {
        // فحوصات عادية
        payload.result = formData.result;
      }

      let isSuccess = false;
      let nextNumberStr = formData.testNumber;
      let attempts = 0;
      while (!isSuccess && attempts < 10) {
        try {
          payload.testNumber = nextNumberStr;
          await createTest(nextNumberStr, payload);
          isSuccess = true;
        } catch (err: unknown) {
          if (err && typeof err === 'object' && 'code' in err && (err as Record<string, unknown>).code === 409) {
            attempts++;
            if (selectedSample) {
              const res = await listSampleTypes([Query.equal('name', selectedSample.type), Query.limit(1)]);
              if (res.documents.length > 0) {
                const typeDoc = res.documents[0];
                const code = typeDoc.code || 'GEN';
                const lastNum = parseInt(nextNumberStr.split('-').pop() || '0', 10);
                nextNumberStr = `TST-${new Date().getFullYear()}-${code}-${String(lastNum + 1).padStart(5, '0')}`;
              } else {
                throw err;
              }
            } else {
              throw err;
            }
          } else {
            throw err;
          }
        }
      }
      if (isSuccess) {
        toast.success('تم إضافة الفحص بنجاح');
        router.push('/dashboard/tests');
      } else {
        throw new Error('تعذر توليد رقم فحص فريد بعد عدة محاولات.');
      }
    } catch (err: unknown) {
      toast.error('خطأ: ' + (err instanceof Error ? err.message : String(err)));
      setLoading(false);
    }
  };

  return (
    <AuthGuard><DashboardLayout>
      <div className="max-w-3xl mx-auto bg-white p-6 rounded-lg shadow">
        <h1 className="text-2xl font-bold mb-6">إضافة فحص جديد</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1">رقم الفحص</label>
            <input value={formData.testNumber} readOnly className="w-full border p-2 rounded bg-concrete-100 font-mono" />
          </div>
          <div>
            <label className="block mb-1">العينة *</label>
            <select name="sampleId" value={formData.sampleId} onChange={handleChange} required className="w-full border p-2 rounded">
              <option value="">اختر العينة</option>
              {samples.map((s) => (<option key={s.$id} value={s.$id}>{s.sampleNumber} ({s.type})</option>))}
            </select>
          </div>

          {standardTests.length > 0 && (
            <div className="bg-success-bg p-4 rounded-lg">
              <h3 className="font-bold mb-2 text-success">الفحوصات القياسية</h3>
              <div className="flex flex-wrap gap-2">
                {standardTests.map((test) => (
                  <button type="button" key={test.$id} onClick={() => handleTestSelect(test)}
                    className={`px-3 py-1 rounded border text-sm ${formData.testName === test.name ? 'bg-petrol text-white' : 'bg-white hover:bg-concrete-100'}`}>
                    {test.name} {test.specification ? `(${test.specification})` : ''}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div><label className="block mb-1">اسم الفحص *</label><input name="testName" value={formData.testName} onChange={handleChange} required className="w-full border p-2 rounded" /></div>

          {/* ========== فحص مقاومة الضغط (عمرين) ========== */}
          {isDualAge && (
            <div className="space-y-4">
              {/* عمر 7 أيام */}
              <div className="bg-petrol-soft p-4 rounded-lg">
                <h3 className="font-bold text-petrol mb-2">نتائج عمر 7 أيام</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                  <div>
                    <label className="block mb-1 text-sm">تاريخ الفحص</label>
                    <input type="date" value={test7Date} onChange={e => setTest7Date(e.target.value)} className="w-full border p-2 rounded" />
                  </div>
                  <div>
                    <label className="block mb-1 text-sm">الوحدة</label>
                    <input value={formData.unit || 'kg/cm2'} readOnly className="w-full border p-2 rounded bg-concrete-100" />
                  </div>
                </div>
                <div className="space-y-2">
                  {age7Results.map((val, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-sm w-16">مكعب {idx + 1}</span>
                      <input type="number" step="0.01" value={val} onChange={e => updateResult(setAge7Results, idx, e.target.value)} className="flex-1 border p-2 rounded" placeholder="0" />
                      {age7Results.length > 1 && <button type="button" onClick={() => removeResult(setAge7Results, idx)} className="text-danger"><X size={16} /></button>}
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => addResult(setAge7Results)} className="mt-2 text-petrol text-sm flex items-center gap-1"><Plus size={14} /> إضافة مكعب</button>
                <div className="mt-2 font-bold text-success">المتوسط: {calcAvg(age7Results)}</div>
              </div>

              {/* عمر 28 يوم */}
              <div className="bg-petrol-soft p-4 rounded-lg">
                <h3 className="font-bold text-petrol mb-2">نتائج عمر 28 يوم</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                  <div>
                    <label className="block mb-1 text-sm">تاريخ الفحص</label>
                    <input type="date" value={test28Date} onChange={e => setTest28Date(e.target.value)} className="w-full border p-2 rounded" />
                  </div>
                  <div>
                    <label className="block mb-1 text-sm">الوحدة</label>
                    <input value={formData.unit || 'kg/cm2'} readOnly className="w-full border p-2 rounded bg-concrete-100" />
                  </div>
                </div>
                <div className="space-y-2">
                  {age28Results.map((val, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-sm w-16">مكعب {idx + 1}</span>
                      <input type="number" step="0.01" value={val} onChange={e => updateResult(setAge28Results, idx, e.target.value)} className="flex-1 border p-2 rounded" placeholder="0" />
                      {age28Results.length > 1 && <button type="button" onClick={() => removeResult(setAge28Results, idx)} className="text-danger"><X size={16} /></button>}
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => addResult(setAge28Results)} className="mt-2 text-petrol text-sm flex items-center gap-1"><Plus size={14} /> إضافة مكعب</button>
                <div className="mt-2 font-bold text-success">المتوسط: {calcAvg(age28Results)}</div>
              </div>
            </div>
          )}

          {/* ========== فحوصات متعددة المكعبات (القلب الخرساني) ========== */}
          {isMultiResult && (
            <div className="bg-petrol-soft p-4 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-petrol">نتائج المكعبات</h3>
                <button type="button" onClick={() => addResult(setCubeResults)} className="text-petrol hover:underline text-sm flex items-center gap-1"><Plus size={14} /> إضافة مكعب</button>
              </div>
              {cubeResults.map((val, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-sm text-concrete-500 w-20">مكعب {idx + 1}</span>
                  <input type="number" step="0.01" value={val} onChange={e => updateResult(setCubeResults, idx, e.target.value)} className="flex-1 border p-2 rounded" placeholder="0" />
                  <span className="text-sm">{formData.unit || 'kg/cm2'}</span>
                  {cubeResults.length > 1 && <button type="button" onClick={() => removeResult(setCubeResults, idx)} className="text-danger"><X size={16} /></button>}
                </div>
              ))}
              <div className="font-bold text-success">المتوسط: {calcAvg(cubeResults)}</div>
            </div>
          )}

          {/* ========== فحوصات عادية ========== */}
          {!isDualAge && !isMultiResult && (
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block mb-1">النتيجة</label><input name="result" value={formData.result} onChange={handleChange} className="w-full border p-2 rounded" /></div>
              <div><label className="block mb-1">الوحدة</label><input name="unit" value={formData.unit} onChange={handleChange} className="w-full border p-2 rounded" /></div>
            </div>
          )}

          <div><label className="block mb-1">المواصفة المرجعية</label><input name="specification" value={formData.specification} onChange={handleChange} className="w-full border p-2 rounded" /></div>
          <div>
            <label className="block mb-1">الحالة *</label>
            <select name="status" value={formData.status} onChange={handleChange} required className="w-full border p-2 rounded">
              <option value="قيد الانتظار">قيد الانتظار</option><option value="تحت الفحص">تحت الفحص</option><option value="مكتمل">مكتمل</option><option value="مرفوض">مرفوض</option>
            </select>
          </div>
          <div>
            <label className="block mb-1">المسؤول عن الفحص</label>
            <select name="assignedTo" value={formData.assignedTo} onChange={handleChange} className="w-full border p-2 rounded">
              <option value="">بدون مسؤول</option>
              {employees.map((emp) => (<option key={emp.$id} value={emp.$id}>{emp.name} ({emp.jobTitle})</option>))}
            </select>
          </div>
          <div><label className="block mb-1">ملاحظات</label><textarea name="notes" value={formData.notes} onChange={handleChange} rows={3} className="w-full border p-2 rounded" /></div>
          <button type="submit" disabled={loading} className="w-full bg-petrol text-white py-2 rounded hover:bg-petrol-dark disabled:opacity-50">{loading ? 'جارٍ الحفظ...' : 'حفظ الفحص'}</button>
        </form>
      </div>
    </DashboardLayout></AuthGuard>
  );
}