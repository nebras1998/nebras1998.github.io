'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { databases, storage } from '@/lib/appwrite';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import {
  DATABASE_ID, TESTS_COLLECTION_ID, SAMPLES_COLLECTION_ID, EMPLOYEES_COLLECTION_ID,
  SAMPLE_TYPES_COLLECTION_ID, STANDARD_TESTS_COLLECTION_ID, REPORTS_BUCKET_ID,
} from '@/lib/constants';
import { toast } from 'sonner';
import { Query, ID } from 'appwrite';
import { FileDown, X, Plus } from 'lucide-react';

const MULTI_RESULT_TESTS = ['مقاومة الضغط', 'مقاومة الضغط (7 أيام)', 'مقاومة الضغط (28 يوم)', 'مقاومة الضغط للقلب الخرساني'];

export default function EditTestPage() {
  const router = useRouter();
  const params = useParams();
  const testId = params.id as string;

  const [samples, setSamples] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [standardTests, setStandardTests] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    testName: '', sampleId: '', projectId: '', clientId: '', status: 'قيد الانتظار',
    result: '', unit: '', specification: '', assignedTo: '', notes: '', reportFileId: '',
    completedAt: '', // ✅ جديد
  });
  const [cubeResults, setCubeResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [existingFileUrl, setExistingFileUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [test, samplesRes, employeesRes] = await Promise.all([
          databases.getDocument(DATABASE_ID, TESTS_COLLECTION_ID, testId),
          databases.listDocuments(DATABASE_ID, SAMPLES_COLLECTION_ID, [Query.limit(200)]),
          databases.listDocuments(DATABASE_ID, EMPLOYEES_COLLECTION_ID, [Query.equal('status', 'يعمل'), Query.limit(200)]),
        ]);
        setFormData({
          testName: test.testName, sampleId: test.sampleId, projectId: test.projectId, clientId: test.clientId,
          status: test.status, result: test.result || '', unit: test.unit || '', specification: test.specification || '',
          assignedTo: test.assignedTo || '', notes: test.notes || '', reportFileId: test.reportFileId || '',
          completedAt: test.completedAt || '', // ✅ قراءة التاريخ
        });
        setSamples(samplesRes.documents);
        setEmployees(employeesRes.documents);

        if (test.results) {
          try { const arr = JSON.parse(test.results); setCubeResults(arr.map(String)); } catch { setCubeResults([]); }
        }

        if (test.reportFileId) setExistingFileUrl(storage.getFileView(REPORTS_BUCKET_ID, test.reportFileId).toString());

        if (test.sampleId) {
          const sample = samplesRes.documents.find((s: any) => s.$id === test.sampleId);
          if (sample) {
            const typeRes = await databases.listDocuments(DATABASE_ID, SAMPLE_TYPES_COLLECTION_ID, [Query.equal('name', sample.type), Query.limit(1)]);
            if (typeRes.documents.length > 0) {
              const testsRes = await databases.listDocuments(DATABASE_ID, STANDARD_TESTS_COLLECTION_ID, [Query.equal('sampleTypeId', typeRes.documents[0].$id), Query.limit(50)]);
              setStandardTests(testsRes.documents);
            }
          }
        }
      } catch (err: any) { toast.error('خطأ في جلب بيانات الفحص: ' + err.message); } finally { setLoading(false); }
    };
    fetchData();
  }, [testId]);

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setSelectedFile(e.target.files[0]);
  };

  const uploadFile = async (): Promise<string | null> => {
    if (!selectedFile) return formData.reportFileId;
    setUploading(true);
    try {
      if (formData.reportFileId) { try { await storage.deleteFile(REPORTS_BUCKET_ID, formData.reportFileId); } catch {} }
      const result = await storage.createFile(REPORTS_BUCKET_ID, ID.unique(), selectedFile);
      return result.$id;
    } catch (err: any) { toast.error('فشل رفع الملف: ' + err.message); return null; } finally { setUploading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const newFileId = await uploadFile();
      if (newFileId === null && selectedFile) { setSaving(false); return; }

      const payload: any = { ...formData, reportFileId: newFileId || formData.reportFileId };

      if (isMultiResult) {
        const validResults = cubeResults.filter(r => r.trim() !== '');
        if (validResults.length === 0) { toast.error('أدخل نتيجة واحدة على الأقل'); setSaving(false); return; }
        payload.results = JSON.stringify(validResults.map(Number));
        payload.averageResult = parseFloat(calculateAverage(validResults) || '0');
        payload.result = '';
      } else {
        payload.results = '';
        payload.averageResult = null;
      }

      await databases.updateDocument(DATABASE_ID, TESTS_COLLECTION_ID, testId, payload);
      toast.success('تم تحديث الفحص بنجاح');
      router.push('/dashboard/tests');
    } catch (err: any) { toast.error('خطأ في التحديث: ' + err.message); setSaving(false); }
  };

  if (loading) return <AuthGuard><DashboardLayout><div className="text-center p-10">جارٍ تحميل بيانات الفحص...</div></DashboardLayout></AuthGuard>;

  const average = calculateAverage(cubeResults);

  return (
    <AuthGuard><DashboardLayout>
      <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow">
        <h1 className="text-2xl font-bold mb-6">تعديل الفحص</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1">العينة *</label>
            <select name="sampleId" value={formData.sampleId} onChange={handleChange} required className="w-full border p-2 rounded">
              <option value="">اختر العينة</option>
              {samples.map(s => <option key={s.$id} value={s.$id}>{s.sampleNumber} ({s.type})</option>)}
            </select>
          </div>

          {standardTests.length > 0 && (
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-bold mb-2 text-green-800">تغيير الفحص القياسي</h3>
              <div className="flex flex-wrap gap-2">
                {standardTests.map(test => (
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
            <label className="block mb-1">تاريخ النتيجة</label>
            <input
              type="date"
              name="completedAt"
              value={formData.completedAt}
              onChange={handleChange}
              className="w-full border p-2 rounded"
            />
          </div>

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
              {employees.map(emp => <option key={emp.$id} value={emp.$id}>{emp.name} ({emp.jobTitle})</option>)}
            </select>
          </div>
          <div><label className="block mb-1">ملاحظات</label><textarea name="notes" value={formData.notes} onChange={handleChange} rows={3} className="w-full border p-2 rounded" /></div>

          {/* قسم رفع التقرير */}
          <div className="border-t pt-4">
            <h3 className="font-bold mb-2">تقرير الفحص (PDF)</h3>
            {existingFileUrl && (
              <div className="mb-2 flex items-center gap-2">
                <a href={existingFileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1"><FileDown size={16} /> التقرير الحالي</a>
                <button type="button" onClick={async () => {
                  if (formData.reportFileId) { try { await storage.deleteFile(REPORTS_BUCKET_ID, formData.reportFileId); toast.success('تم حذف الملف'); } catch (err: any) { toast.error('فشل حذف الملف: ' + err.message); } }
                  setExistingFileUrl(null); setFormData({...formData, reportFileId: ''}); setSelectedFile(null);
                }} className="text-red-500"><X size={16} /></button>
              </div>
            )}
            <div className="flex items-center gap-2">
              <input type="file" accept=".pdf" ref={fileInputRef} onChange={handleFileSelect} className="border p-2 rounded" />
              {selectedFile && <span className="text-sm text-gray-600">{selectedFile.name}</span>}
            </div>
            {uploading && <p className="text-sm text-blue-600 mt-1">جارٍ رفع الملف...</p>}
          </div>

          <button type="submit" disabled={saving || uploading} className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50">{saving ? 'جارٍ الحفظ...' : 'حفظ التعديلات'}</button>
        </form>
      </div>
    </DashboardLayout></AuthGuard>
  );
}