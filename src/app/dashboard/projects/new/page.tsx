'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Client } from '@/types';
import { listClients, createProject } from '@/lib/services';
import { Query } from '@/lib/services';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import { toast } from 'sonner';
import { generateUniqueProjectNumber } from '@/lib/helpers';

export default function NewProjectPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [formData, setFormData] = useState({
    projectNumber: '',
    name: '',
    location: '',
    clientId: '',
    contractor: '',
    consultant: '',
    startDate: '',
    status: 'نشط',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [generatingNumber, setGeneratingNumber] = useState(true);

  // توليد رقم المشروع تلقائياً باستخدام الدالة الموحدة
  useEffect(() => {
    const fetchNumber = async () => {
      try {
        const newNumber = await generateUniqueProjectNumber();
        setFormData(prev => ({ ...prev, projectNumber: newNumber }));
      } catch {
        // رقم افتراضي في حال الفشل
        setFormData(prev => ({ ...prev, projectNumber: `PRJ-${new Date().getFullYear()}-001` }));
      } finally {
        setGeneratingNumber(false);
      }
    };
    fetchNumber();
  }, []);

  // جلب قائمة العملاء
  useEffect(() => {
    const fetchClients = async () => {
      try {
        const response = await listClients([Query.limit(200)]);
        setClients(response.documents);
      } catch {
        toast.error('فشل تحميل قائمة العملاء');
      }
    };
    fetchClients();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let isSuccess = false;
      let nextNumberStr = formData.projectNumber;
      let attempts = 0;
      while (!isSuccess && attempts < 10) {
        try {
          await createProject(nextNumberStr, { ...formData, projectNumber: nextNumberStr });
          isSuccess = true;
        } catch (err: unknown) {
          const appwriteErr = err as { code?: number };
          if (appwriteErr.code === 409) {
            attempts++;
            const currentYear = new Date().getFullYear();
            const prefix = `PRJ-${currentYear}-`;
            const lastNum = parseInt(nextNumberStr.split('-').pop() || '0', 10);
            nextNumberStr = `${prefix}${String(lastNum + 1).padStart(3, '0')}`;
          } else {
            throw err;
          }
        }
      }
      if (isSuccess) {
        toast.success('تم إضافة المشروع بنجاح');
        router.push('/dashboard/projects');
      } else {
        throw new Error('تعذر توليد رقم مشروع فريد بعد عدة محاولات.');
      }
    } catch (err: unknown) {
      toast.error('خطأ في إضافة المشروع: ' + (err instanceof Error ? err.message : String(err)));
      setLoading(false);
    }
  };

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow">
          <h1 className="text-2xl font-bold mb-6">إضافة مشروع جديد</h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block mb-1">رقم المشروع *</label>
              <input
                name="projectNumber"
                value={formData.projectNumber}
                onChange={handleChange}
                required
                className="w-full border p-2 rounded bg-concrete-50"
                placeholder={generatingNumber ? 'جارٍ التوليد...' : 'رقم المشروع'}
                readOnly={generatingNumber}
              />
              <p className="text-sm text-concrete-500 mt-1">يتم توليده تلقائياً (يمكنك تعديله يدوياً)</p>
            </div>
            <div>
              <label className="block mb-1">اسم المشروع *</label>
              <input name="name" value={formData.name} onChange={handleChange} required className="w-full border p-2 rounded" />
            </div>
            <div>
              <label className="block mb-1">العميل *</label>
              <select name="clientId" value={formData.clientId} onChange={handleChange} required className="w-full border p-2 rounded">
                <option value="">اختر العميل</option>
                {clients.map(client => <option key={client.$id} value={client.$id}>{client.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block mb-1">الموقع</label>
              <input name="location" value={formData.location} onChange={handleChange} className="w-full border p-2 rounded" />
            </div>
            <div>
              <label className="block mb-1">المقاول</label>
              <input name="contractor" value={formData.contractor} onChange={handleChange} className="w-full border p-2 rounded" />
            </div>
            <div>
              <label className="block mb-1">الاستشاري</label>
              <input name="consultant" value={formData.consultant} onChange={handleChange} className="w-full border p-2 rounded" />
            </div>
            <div>
              <label className="block mb-1">تاريخ البداية</label>
              <input name="startDate" type="date" value={formData.startDate} onChange={handleChange} className="w-full border p-2 rounded" />
            </div>
            <div>
              <label className="block mb-1">الحالة *</label>
              <select name="status" value={formData.status} onChange={handleChange} required className="w-full border p-2 rounded">
                <option value="نشط">نشط</option>
                <option value="مكتمل">مكتمل</option>
                <option value="متوقف">متوقف</option>
              </select>
            </div>
            <div>
              <label className="block mb-1">ملاحظات</label>
              <textarea name="notes" value={formData.notes} onChange={handleChange} rows={3} className="w-full border p-2 rounded" />
            </div>
            <button type="submit" disabled={loading} className="bg-petrol text-white px-6 py-2 rounded hover:bg-petrol-dark disabled:opacity-50">
              {loading ? 'جارٍ الحفظ...' : 'حفظ المشروع'}
            </button>
          </form>
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}