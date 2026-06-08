'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { databases } from '@/lib/appwrite';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import {
  DATABASE_ID,
  TESTS_COLLECTION_ID,
  SAMPLES_COLLECTION_ID,
  EMPLOYEES_COLLECTION_ID,
  SAMPLE_TYPES_COLLECTION_ID,
  STANDARD_TESTS_COLLECTION_ID,
} from '@/lib/constants';
import { toast } from 'sonner';
import { Query } from 'appwrite';
import { Plus, X } from 'lucide-react';
import { generateTestNumber } from '@/lib/helpers';

const MULTI_RESULT_TESTS = ['مقاومة الضغط', 'مقاومة الضغط (7 أيام)', 'مقاومة الضغط (28 يوم)', 'مقاومة الضغط للقلب الخرساني'];

export default function NewTestPage() {
  const router = useRouter();
  const [samples, setSamples] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [standardTests, setStandardTests] = useState<any[]>([]);
  const [selectedSample, setSelectedSample] = useState<any>(null);
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
  const [cubeResults, setCubeResults] = useState<string[]>(['', '', '']);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    console.log('🔄 جلب العينات والموظفين...');
    const fetchData = async () => {
      try {
        const [samplesRes, employeesRes] = await Promise.all([
          databases.listDocuments(DATABASE_ID, SAMPLES_COLLECTION_ID, [Query.orderDesc('$createdAt'), Query.limit(200)]),
          databases.listDocuments(DATABASE_ID, EMPLOYEES_COLLECTION_ID, [Query.equal('status', 'يعمل'), Query.limit(200)]),
        ]);
        setSamples(samplesRes.documents);
        setEmployees(employeesRes.documents);
        console.log('✅ تم جلب البيانات');
      } catch (err: any) {
        console.error('❌ فشل جلب البيانات:', err);
        toast.error('فشل تحميل البيانات');
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (formData.sampleId) {
      const sample = samples.find((s) => s.$id === formData.sampleId);
      setSelectedSample(sample);
      if (sample) {
        setFormData((prev) => ({ ...prev, projectId: sample.projectId, clientId: sample.clientId, testName: '' }));
        console.log('🔍 جلب نوع العينة للكود:', sample.type);
        databases.listDocuments(DATABASE_ID, SAMPLE_TYPES_COLLECTION_ID, [Query.equal('name', sample.type), Query.limit(1)])
          .then(async (res) => {
            if (res.documents.length > 0) {
              const typeDoc = res.documents[0];
              const code = typeDoc.code || 'GEN';
              console.log('📌 الكود المستخدم:', code);
              try {
                const newNumber = await generateTestNumber(code);
                console.log('🔢 رقم الفحص الجديد:', newNumber);
                setFormData((prev) => ({ ...prev, testNumber: newNumber }));
              } catch (err) {
                console.error('❌ فشل توليد رقم الفحص:', err);
                toast.error('فشل توليد رقم الفحص');
              }
              // جلب الفحوصات القياسية
              databases.listDocuments(DATABASE_ID, STANDARD_TESTS_COLLECTION_ID, [
                Query.equal('sampleTypeId', typeDoc.$id),
                Query.limit(50),
              ]).then(testsRes => setStandardTests(testsRes.documents));
            } else {
              setStandardTests([]);
            }
          });
      }
    } else {
      setSelectedSample(null);
      setStandardTests([]);
    }
  }, [formData.sampleId, samples]);

  const isMultiResult = MULTI_RESULT_TESTS.includes(formData.testName);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleTestSelect = (test: any) => {
    setFormData({ ...formData, testName: test.name, specification: test.specification || '', unit: test.unit || '' });
  };

  const updateCubeResult = (index: number, value: string) => {
    const newResults = [...cubeResults]; newResults[index] = value; setCubeResults(newResults);
  };
  const addCube = () => setCubeResults([...cubeResults, '']);
  const removeCube = (index: number) => {
    if (cubeResults.length <= 1) return;
    setCubeResults(cubeResults.filter((_, i) => i !== index));
  };
  const calculateAverage = (values: string[]) => {
    const nums = values.map(Number).filter(n => !isNaN(n));
    if (nums.length === 0) return '';
    return (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🚀 handleSubmit استدعيت');
    setLoading(true);
    try {
      const payload: any = { ...formData, result: '' };
      if (isMultiResult) {
        const validResults = cubeResults.filter(r => r.trim() !== '');
        if (validResults.length === 0) {
          toast.error('أدخل نتيجة واحدة على الأقل');
          setLoading(false);
          return;
        }
        payload.results = JSON.stringify(validResults.map(Number));
        payload.averageResult = parseFloat(calculateAverage(validResults) || '0');
      } else {
        payload.result = formData.result;
        payload.results = '';
        payload.averageResult = null;
      }
      console.log('📦 البيانات المرسلة:', payload);
      await databases.createDocument(DATABASE_ID, TESTS_COLLECTION_ID, 'unique()', payload);
      console.log('✅ تم الحفظ');
      toast.success('تم إضافة الفحص بنجاح');
      router.push('/dashboard/tests');
    } catch (err: any) {
      console.error('❌ خطأ في الحفظ:', err);
      toast.error('خطأ في إضافة الفحص: ' + err.message);
      setLoading(false);
    }
  };

  const average = calculateAverage(cubeResults);

  return (
    <AuthGuard><DashboardLayout>
      <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow">
        <h1 className="text-2xl font-bold mb-6">إضافة فحص جديد</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1">رقم الفحص</label>
            <input value={formData.testNumber} readOnly className="w-full border p-2 rounded bg-gray-100 font-mono" />
          </div>
          <div>
            <label className="block mb-1">العينة *</label>
            <select name="sampleId" value={formData.sampleId} onChange={handleChange} required className="w-full border p-2 rounded">
              <option value="">اختر العينة</option>
              {samples.map((s) => (<option key={s.$id} value={s.$id}>{s.sampleNumber} ({s.type})</option>))}
            </select>
          </div>

          {standardTests.length > 0 && (
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-bold mb-2 text-green-800">الفحوصات القياسية</h3>
              <div className="flex flex-wrap gap-2">
                {standardTests.map((test) => (
                  <button type="button" key={test.$id} onClick={() => handleTestSelect(test)}
                    className={`px-3 py-1 rounded border text-sm ${formData.testName === test.name ? 'bg-blue-600 text-white' : 'bg-white hover:bg-gray-100'}`}>
                    {test.name} {test.specification ? `(${test.specification})` : ''}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div><label className="block mb-1">اسم الفحص *</label><input name="testName" value={formData.testName} onChange={handleChange} required className="w-full border p-2 rounded" /></div>

          {isMultiResult ? (
            <div className="bg-blue-50 p-4 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-blue-800">نتائج المكعبات</h3>
                <button type="button" onClick={addCube} className="text-blue-600 hover:underline text-sm flex items-center gap-1"><Plus size={14} /> إضافة مكعب</button>
              </div>
              {cubeResults.map((val, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 w-20">مكعب {idx + 1}</span>
                  <input type="number" step="0.01" value={val} onChange={e => updateCubeResult(idx, e.target.value)}
                    className="flex-1 border p-2 rounded" placeholder="القيمة" />
                  <span className="text-sm">{formData.unit || 'kg/cm2'}</span>
                  {cubeResults.length > 1 && (
                    <button type="button" onClick={() => removeCube(idx)} className="text-red-500"><X size={16} /></button>
                  )}
                </div>
              ))}
              {average && <div className="text-center font-bold text-green-700 mt-2">المتوسط: {average} {formData.unit || 'kg/cm2'}</div>}
            </div>
          ) : (
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
          <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'جارٍ الحفظ...' : 'حفظ الفحص'}
          </button>
        </form>
      </div>
    </DashboardLayout></AuthGuard>
  );
}