'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { databases } from '@/lib/appwrite';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import {
  DATABASE_ID,
  SAMPLES_COLLECTION_ID,
  PROJECTS_COLLECTION_ID,
  EMPLOYEES_COLLECTION_ID,
  SAMPLE_TYPES_COLLECTION_ID,
  STANDARD_TESTS_COLLECTION_ID,
} from '@/lib/constants';
import { toast } from 'sonner';
import { Query } from 'appwrite';
import { Plus, X } from 'lucide-react';

export default function NewSamplePage() {
  const router = useRouter();
  const [projects, setProjects] = useState<any[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [sampleTypes, setSampleTypes] = useState<any[]>([]);
  const [standardTests, setStandardTests] = useState<any[]>([]);
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [selectedTypeCode, setSelectedTypeCode] = useState('GEN');

  const [formData, setFormData] = useState({
    sampleNumber: '',
    type: 'خرسانة',
    projectId: '',
    clientId: '',
    status: 'تم الاستلام',
    samplingDate: '',
    preparationDate: '',
    deliveryDate: '',
    samplerId: '',
    preparerId: '',
    transporterId: '',
    test7DaysDate: '',
    test28DaysDate: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [generatingNumber, setGeneratingNumber] = useState(false);

  // دالة توليد رقم عينة فريد باستخدام الكود من sampleTypes
  const generateSampleNumber = async (type: string) => {
    setGeneratingNumber(true);
    // نحصل على الكود من النوع المختار
    const selectedType = sampleTypes.find(t => t.name === type);
    const code = selectedType?.code || 'GEN';
    setSelectedTypeCode(code);
    
    const currentYear = new Date().getFullYear();
    const prefix = `LAB-${currentYear}-${code}-`;

    let nextNumber = 1;
    try {
      const response = await databases.listDocuments(DATABASE_ID, SAMPLES_COLLECTION_ID, [
        Query.startsWith('sampleNumber', prefix),
        Query.orderDesc('sampleNumber'),
        Query.limit(1),
      ]);
      if (response.documents.length > 0) {
        const lastNumber = response.documents[0].sampleNumber.split('-').pop();
        if (lastNumber) nextNumber = parseInt(lastNumber, 10) + 1;
      }
    } catch {}

    let isUnique = false;
    let newNumber = '';
    while (!isUnique) {
      const padded = String(nextNumber).padStart(5, '0');
      newNumber = `${prefix}${padded}`;
      try {
        const check = await databases.listDocuments(DATABASE_ID, SAMPLES_COLLECTION_ID, [
          Query.equal('sampleNumber', newNumber),
          Query.limit(1),
        ]);
        if (check.documents.length === 0) isUnique = true;
        else nextNumber++;
      } catch { isUnique = true; }
    }

    setFormData((prev) => ({ ...prev, sampleNumber: newNumber }));
    setGeneratingNumber(false);
  };

  // دالة حساب تواريخ الفحص للخرسانة
  const calculateTestDates = (type: string, samplingDate: string) => {
    if (type === 'خرسانة' && samplingDate) {
      const d = new Date(samplingDate);
      const d7 = new Date(d); d7.setDate(d7.getDate() + 7);
      const d28 = new Date(d); d28.setDate(d28.getDate() + 28);
      setFormData(prev => ({
        ...prev,
        test7DaysDate: d7.toISOString().split('T')[0],
        test28DaysDate: d28.toISOString().split('T')[0],
      }));
    } else if (type !== 'خرسانة') {
      setFormData(prev => ({ ...prev, test7DaysDate: '', test28DaysDate: '' }));
    }
  };

  // جلب البيانات الأساسية
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [projRes, techRes, typesRes] = await Promise.all([
          databases.listDocuments(DATABASE_ID, PROJECTS_COLLECTION_ID, [Query.limit(200)]),
          databases.listDocuments(DATABASE_ID, EMPLOYEES_COLLECTION_ID, [
            Query.equal('role', 'فني'),
            Query.equal('status', 'يعمل'),
            Query.limit(100),
          ]),
          databases.listDocuments(DATABASE_ID, SAMPLE_TYPES_COLLECTION_ID, [Query.limit(100)]),
        ]);
        setProjects(projRes.documents);
        setTechnicians(techRes.documents);
        setSampleTypes(typesRes.documents);
      } catch (err: any) {
        toast.error('فشل تحميل البيانات الأساسية');
      }
    };
    fetchData();
  }, []);

  // عند تغيير نوع العينة، نجلب الفحوصات المرتبطة ونعيد توليد الرقم
  useEffect(() => {
    if (formData.type) {
      generateSampleNumber(formData.type);
      const selectedType = sampleTypes.find(t => t.name === formData.type);
      if (selectedType) {
        databases.listDocuments(DATABASE_ID, STANDARD_TESTS_COLLECTION_ID, [
          Query.equal('sampleTypeId', selectedType.$id),
          Query.limit(50),
        ]).then(res => setStandardTests(res.documents));
      } else {
        setStandardTests([]);
      }
      setSelectedTests([]);
    }
    calculateTestDates(formData.type, formData.samplingDate);
  }, [formData.type, sampleTypes]);

  useEffect(() => {
    calculateTestDates(formData.type, formData.samplingDate);
  }, [formData.samplingDate]);

  const toggleTestSelection = (testId: string) => {
    setSelectedTests(prev =>
      prev.includes(testId) ? prev.filter(id => id !== testId) : [...prev, testId]
    );
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const newData = { ...prev, [name]: value };
      if (name === 'projectId') {
        const project = projects.find((p) => p.$id === value);
        newData.clientId = project?.clientId || '';
      }
      return newData;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const sample = await databases.createDocument(DATABASE_ID, SAMPLES_COLLECTION_ID, 'unique()', formData);
      if (selectedTests.length > 0) {
        for (const testId of selectedTests) {
          const stdTest = standardTests.find(t => t.$id === testId);
          if (stdTest) {
            // توليد رقم فحص فريد لكل فحص يتم إنشاؤه
            const testNumber = await generateTestNumber(selectedTypeCode);
            await databases.createDocument(DATABASE_ID, 'tests', 'unique()', {
              testNumber: testNumber,
              testName: stdTest.name,
              sampleId: sample.$id,
              projectId: formData.projectId,
              clientId: formData.clientId,
              status: 'قيد الانتظار',
              unit: stdTest.unit || '',
              specification: stdTest.specification || '',
              assignedTo: formData.preparerId || formData.samplerId || '',
              notes: '',
            });
          }
        }
      }
      toast.success('تم إضافة العينة والفحوصات بنجاح');
      router.push('/dashboard/samples');
    } catch (err: any) {
      toast.error('خطأ في إضافة العينة: ' + err.message);
      setLoading(false);
    }
  };

  // دالة توليد رقم فحص فريد
  const generateTestNumber = async (code: string) => {
    const currentYear = new Date().getFullYear();
    const prefix = `TST-${currentYear}-${code}-`;
    let nextNumber = 1;
    try {
      const response = await databases.listDocuments(DATABASE_ID, 'tests', [
        Query.startsWith('testNumber', prefix),
        Query.orderDesc('testNumber'),
        Query.limit(1),
      ]);
      if (response.documents.length > 0) {
        const lastNumber = response.documents[0].testNumber.split('-').pop();
        if (lastNumber) nextNumber = parseInt(lastNumber, 10) + 1;
      }
    } catch {}

    let isUnique = false;
    let newNumber = '';
    while (!isUnique) {
      const padded = String(nextNumber).padStart(5, '0');
      newNumber = `${prefix}${padded}`;
      try {
        const check = await databases.listDocuments(DATABASE_ID, 'tests', [
          Query.equal('testNumber', newNumber),
          Query.limit(1),
        ]);
        if (check.documents.length === 0) isUnique = true;
        else nextNumber++;
      } catch { isUnique = true; }
    }
    return newNumber;
  };

  const selectedProject = projects.find((p) => p.$id === formData.projectId);

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="max-w-3xl mx-auto bg-white p-6 rounded-lg shadow">
          <h1 className="text-2xl font-bold mb-6">إضافة عينة جديدة</h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block mb-1">نوع العينة *</label>
                <select name="type" value={formData.type} onChange={handleChange} required className="w-full border p-2 rounded">
                  <option value="">اختر النوع</option>
                  {sampleTypes.map((t) => (
                    <option key={t.$id} value={t.name}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block mb-1">رقم العينة</label>
                <input value={formData.sampleNumber} readOnly className="w-full border p-2 rounded bg-gray-100 font-mono" />
                {generatingNumber && <p className="text-sm text-gray-500">جارٍ توليد الرقم...</p>}
              </div>
            </div>

            <div>
              <label className="block mb-1">المشروع *</label>
              <select name="projectId" value={formData.projectId} onChange={handleChange} required className="w-full border p-2 rounded">
                <option value="">اختر المشروع</option>
                {projects.map((p) => (<option key={p.$id} value={p.$id}>{p.name}</option>))}
              </select>
            </div>

            <div>
              <label className="block mb-1">العميل</label>
              <input value={selectedProject ? (selectedProject.clientId || 'غير معروف') : ''} readOnly className="w-full border p-2 rounded bg-gray-100 text-gray-500" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><label className="block mb-1">تاريخ أخذ العينة</label><input type="date" name="samplingDate" value={formData.samplingDate} onChange={handleChange} className="w-full border p-2 rounded" /></div>
              <div><label className="block mb-1">تاريخ تحضير العينة</label><input type="date" name="preparationDate" value={formData.preparationDate} onChange={handleChange} className="w-full border p-2 rounded" /></div>
              <div><label className="block mb-1">تاريخ إحضار العينة للمختبر</label><input type="date" name="deliveryDate" value={formData.deliveryDate} onChange={handleChange} className="w-full border p-2 rounded" /></div>
            </div>

            {formData.type === 'خرسانة' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-blue-50 p-4 rounded-lg">
                <div><label className="block mb-1 text-blue-800">تاريخ فحص 7 أيام (تلقائي)</label><input type="date" name="test7DaysDate" value={formData.test7DaysDate} onChange={handleChange} className="w-full border p-2 rounded bg-white" /></div>
                <div><label className="block mb-1 text-blue-800">تاريخ فحص 28 يوم (تلقائي)</label><input type="date" name="test28DaysDate" value={formData.test28DaysDate} onChange={handleChange} className="w-full border p-2 rounded bg-white" /></div>
              </div>
            )}

            {standardTests.length > 0 && (
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-bold mb-2 text-green-800">الفحوصات المطلوبة</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {standardTests.map((test) => (
                    <label key={test.$id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedTests.includes(test.$id)}
                        onChange={() => toggleTestSelection(test.$id)}
                      />
                      {test.name} {test.specification ? `(${test.specification})` : ''}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><label className="block mb-1">فني أخذ العينة</label><select name="samplerId" value={formData.samplerId} onChange={handleChange} className="w-full border p-2 rounded"><option value="">اختر الفني</option>{technicians.map((t) => (<option key={t.$id} value={t.$id}>{t.name}</option>))}</select></div>
              <div><label className="block mb-1">فني تحضير العينة</label><select name="preparerId" value={formData.preparerId} onChange={handleChange} className="w-full border p-2 rounded"><option value="">اختر الفني</option>{technicians.map((t) => (<option key={t.$id} value={t.$id}>{t.name}</option>))}</select></div>
              <div><label className="block mb-1">فني إحضار العينة</label><select name="transporterId" value={formData.transporterId} onChange={handleChange} className="w-full border p-2 rounded"><option value="">اختر الفني</option>{technicians.map((t) => (<option key={t.$id} value={t.$id}>{t.name}</option>))}</select></div>
            </div>

            <div>
              <label className="block mb-1">الحالة *</label>
              <select name="status" value={formData.status} onChange={handleChange} required className="w-full border p-2 rounded">
                <option value="تم الاستلام">تم الاستلام</option><option value="تحت الفحص">تحت الفحص</option><option value="منجز">منجز</option><option value="مرفوض">مرفوض</option>
              </select>
            </div>

            <div><label className="block mb-1">ملاحظات</label><textarea name="notes" value={formData.notes} onChange={handleChange} rows={3} className="w-full border p-2 rounded" /></div>
            <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50">{loading ? 'جارٍ الحفظ...' : 'حفظ العينة والفحوصات'}</button>
          </form>
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}