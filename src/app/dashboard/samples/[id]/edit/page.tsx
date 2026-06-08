'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { databases } from '@/lib/appwrite';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import {
  DATABASE_ID,
  SAMPLES_COLLECTION_ID,
  PROJECTS_COLLECTION_ID,
  EMPLOYEES_COLLECTION_ID,
} from '@/lib/constants';
import { toast } from 'sonner';
import { Query } from 'appwrite';

const TYPE_CODES: Record<string, string> = {
  'خرسانة': 'CON', 'تربة': 'SOI', 'أسفلت': 'ASP', 'ركام': 'AGG', 'مياه': 'WAT', 'فولاذ': 'STL', 'أخرى': 'OTH',
};

export default function EditSamplePage() {
  const router = useRouter();
  const params = useParams();
  const sampleId = params.id as string;

  const [projects, setProjects] = useState<any[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    sampleNumber: '', type: 'خرسانة', projectId: '', clientId: '', status: 'تم الاستلام',
    samplingDate: '', preparationDate: '', deliveryDate: '',
    samplerId: '', preparerId: '', transporterId: '',
    test7DaysDate: '', test28DaysDate: '', notes: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const calculateTestDates = (type: string, samplingDate: string) => {
    if (type === 'خرسانة' && samplingDate) {
      const d = new Date(samplingDate);
      const d7 = new Date(d); d7.setDate(d7.getDate() + 7);
      const d28 = new Date(d); d28.setDate(d28.getDate() + 28);
      setFormData(prev => ({ ...prev, test7DaysDate: d7.toISOString().split('T')[0], test28DaysDate: d28.toISOString().split('T')[0] }));
    } else if (type !== 'خرسانة') {
      setFormData(prev => ({ ...prev, test7DaysDate: '', test28DaysDate: '' }));
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sample, projectsRes, techRes] = await Promise.all([
          databases.getDocument(DATABASE_ID, SAMPLES_COLLECTION_ID, sampleId),
          databases.listDocuments(DATABASE_ID, PROJECTS_COLLECTION_ID, [Query.limit(200)]),
          databases.listDocuments(DATABASE_ID, EMPLOYEES_COLLECTION_ID, [Query.equal('role', 'فني'), Query.equal('status', 'يعمل'), Query.limit(100)]),
        ]);
        setFormData({
          sampleNumber: sample.sampleNumber, type: sample.type, projectId: sample.projectId, clientId: sample.clientId || '',
          status: sample.status, samplingDate: sample.samplingDate || '', preparationDate: sample.preparationDate || '',
          deliveryDate: sample.deliveryDate || '', samplerId: sample.samplerId || '', preparerId: sample.preparerId || '',
          transporterId: sample.transporterId || '', test7DaysDate: sample.test7DaysDate || '', test28DaysDate: sample.test28DaysDate || '',
          notes: sample.notes || '',
        });
        setProjects(projectsRes.documents);
        setTechnicians(techRes.documents);
      } catch (err: any) { toast.error('خطأ في جلب البيانات: ' + err.message); } finally { setLoading(false); }
    };
    fetchData();
  }, [sampleId]);

  useEffect(() => { calculateTestDates(formData.type, formData.samplingDate); }, [formData.type, formData.samplingDate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const newData = { ...prev, [name]: value };
      if (name === 'projectId') { const project = projects.find((p) => p.$id === value); newData.clientId = project?.clientId || ''; }
      return newData;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => { e.preventDefault(); setSaving(true);
    try { await databases.updateDocument(DATABASE_ID, SAMPLES_COLLECTION_ID, sampleId, formData); toast.success('تم تحديث العينة بنجاح'); router.push('/dashboard/samples'); }
    catch (err: any) { toast.error('خطأ في التحديث: ' + err.message); setSaving(false); }
  };

  if (loading) return <AuthGuard><DashboardLayout><div className="text-center p-10">جارٍ تحميل بيانات العينة...</div></DashboardLayout></AuthGuard>;

  const selectedProject = projects.find((p) => p.$id === formData.projectId);

  return (
    <AuthGuard><DashboardLayout>
      <div className="max-w-3xl mx-auto bg-white p-6 rounded-lg shadow">
        <h1 className="text-2xl font-bold mb-6">تعديل بيانات العينة</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block mb-1">نوع العينة *</label><select name="type" value={formData.type} onChange={handleChange} required className="w-full border p-2 rounded">{Object.keys(TYPE_CODES).map((t) => (<option key={t} value={t}>{t}</option>))}</select></div>
            <div><label className="block mb-1">رقم العينة</label><input value={formData.sampleNumber} readOnly className="w-full border p-2 rounded bg-gray-100 font-mono" /></div>
          </div>
          <div><label className="block mb-1">المشروع *</label><select name="projectId" value={formData.projectId} onChange={handleChange} required className="w-full border p-2 rounded"><option value="">اختر المشروع</option>{projects.map((p) => (<option key={p.$id} value={p.$id}>{p.name}</option>))}</select></div>
          <div><label className="block mb-1">العميل</label><input value={selectedProject ? (selectedProject.clientId || 'غير معروف') : ''} readOnly className="w-full border p-2 rounded bg-gray-100 text-gray-500" /></div>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><label className="block mb-1">فني أخذ العينة</label><select name="samplerId" value={formData.samplerId} onChange={handleChange} className="w-full border p-2 rounded"><option value="">اختر الفني</option>{technicians.map((t) => (<option key={t.$id} value={t.$id}>{t.name}</option>))}</select></div>
            <div><label className="block mb-1">فني تحضير العينة</label><select name="preparerId" value={formData.preparerId} onChange={handleChange} className="w-full border p-2 rounded"><option value="">اختر الفني</option>{technicians.map((t) => (<option key={t.$id} value={t.$id}>{t.name}</option>))}</select></div>
            <div><label className="block mb-1">فني إحضار العينة</label><select name="transporterId" value={formData.transporterId} onChange={handleChange} className="w-full border p-2 rounded"><option value="">اختر الفني</option>{technicians.map((t) => (<option key={t.$id} value={t.$id}>{t.name}</option>))}</select></div>
          </div>
          <div><label className="block mb-1">الحالة *</label><select name="status" value={formData.status} onChange={handleChange} required className="w-full border p-2 rounded"><option value="تم الاستلام">تم الاستلام</option><option value="تحت الفحص">تحت الفحص</option><option value="منجز">منجز</option><option value="مرفوض">مرفوض</option></select></div>
          <div><label className="block mb-1">ملاحظات</label><textarea name="notes" value={formData.notes} onChange={handleChange} rows={3} className="w-full border p-2 rounded" /></div>
          <button type="submit" disabled={saving} className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50">{saving ? 'جارٍ الحفظ...' : 'حفظ التعديلات'}</button>
        </form>
      </div>
    </DashboardLayout></AuthGuard>
  );
}