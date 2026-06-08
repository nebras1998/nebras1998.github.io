'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { databases } from '@/lib/appwrite';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import {
  DATABASE_ID,
  PROJECTS_COLLECTION_ID,
  CLIENTS_COLLECTION_ID,
} from '@/lib/constants';
import { toast } from 'sonner';
import { Query } from 'appwrite';

export default function NewProjectPage() {
  const router = useRouter();
  const [clients, setClients] = useState<any[]>([]);
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

  // دالة توليد رقم مشروع فريد
  const generateProjectNumber = async () => {
    const currentYear = new Date().getFullYear();
    const prefix = `PRJ-${currentYear}-`;

    // 1. جلب آخر رقم مستخدم
    let nextNumber = 1;
    try {
      const response = await databases.listDocuments(DATABASE_ID, PROJECTS_COLLECTION_ID, [
        Query.startsWith('projectNumber', prefix),
        Query.orderDesc('projectNumber'),
        Query.limit(1),
      ]);
      if (response.documents.length > 0) {
        const lastNumber = response.documents[0].projectNumber.split('-').pop();
        if (lastNumber) {
          nextNumber = parseInt(lastNumber, 10) + 1;
        }
      }
    } catch {
      // إذا فشل الجلب، نبدأ من 1
    }

    // 2. حلقة التحقق من عدم التكرار
    let isUnique = false;
    let newNumber = '';
    while (!isUnique) {
      const padded = String(nextNumber).padStart(3, '0');
      newNumber = `${prefix}${padded}`;
      try {
        const check = await databases.listDocuments(DATABASE_ID, PROJECTS_COLLECTION_ID, [
          Query.equal('projectNumber', newNumber),
          Query.limit(1),
        ]);
        if (check.documents.length === 0) {
          isUnique = true;
        } else {
          nextNumber++;
        }
      } catch {
        // في حال فشل التحقق، نعتبر الرقم فريداً ونتابع
        isUnique = true;
      }
    }

    setFormData((prev) => ({ ...prev, projectNumber: newNumber }));
    setGeneratingNumber(false);
  };

  // جلب العملاء وتوليد رقم المشروع
  useEffect(() => {
    const fetchClients = async () => {
      try {
        const response = await databases.listDocuments(DATABASE_ID, CLIENTS_COLLECTION_ID, [Query.limit(200)]);
        setClients(response.documents);
      } catch (err: any) {
        toast.error('فشل تحميل قائمة العملاء');
      }
    };
    fetchClients();
    generateProjectNumber();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await databases.createDocument(DATABASE_ID, PROJECTS_COLLECTION_ID, 'unique()', formData);
      toast.success('تم إضافة المشروع بنجاح');
      router.push('/dashboard/projects');
    } catch (err: any) {
      toast.error('خطأ في إضافة المشروع: ' + err.message);
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
                className="w-full border p-2 rounded bg-gray-50"
                placeholder={generatingNumber ? 'جارٍ التوليد...' : 'رقم المشروع'}
                readOnly={generatingNumber}
              />
              <p className="text-sm text-gray-500 mt-1">يتم توليده تلقائياً (يمكنك تعديله يدوياً)</p>
            </div>
            <div>
              <label className="block mb-1">اسم المشروع *</label>
              <input name="name" value={formData.name} onChange={handleChange} required className="w-full border p-2 rounded" />
            </div>
            <div>
              <label className="block mb-1">العميل *</label>
              <select name="clientId" value={formData.clientId} onChange={handleChange} required className="w-full border p-2 rounded">
                <option value="">اختر العميل</option>
                {clients.map((client) => (
                  <option key={client.$id} value={client.$id}>{client.name}</option>
                ))}
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
            <button type="submit" disabled={loading} className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'جارٍ الحفظ...' : 'حفظ المشروع'}
            </button>
          </form>
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}