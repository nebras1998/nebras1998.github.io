'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { databases } from '@/lib/appwrite';
import { Query } from 'appwrite';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import { DATABASE_ID, PROJECTS_COLLECTION_ID, CLIENTS_COLLECTION_ID } from '@/lib/constants';
import { toast } from 'sonner';

export default function EditProjectPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // جلب بيانات المشروع وقائمة العملاء
  useEffect(() => {
    const fetchData = async () => {
      try {
        // جلب بيانات المشروع
        const project = await databases.getDocument(DATABASE_ID, PROJECTS_COLLECTION_ID, projectId);
        setFormData({
          projectNumber: project.projectNumber,
          name: project.name,
          location: project.location || '',
          clientId: project.clientId,
          contractor: project.contractor || '',
          consultant: project.consultant || '',
          startDate: project.startDate || '',
          status: project.status,
          notes: project.notes || '',
        });

        // جلب قائمة العملاء للاختيار
        const clientsRes = await databases.listDocuments(DATABASE_ID, CLIENTS_COLLECTION_ID, [Query.limit(100)]);
        setClients(clientsRes.documents);
      } catch (err: any) {
        toast.error('خطأ في جلب البيانات: ' + err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [projectId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await databases.updateDocument(DATABASE_ID, PROJECTS_COLLECTION_ID, projectId, formData);
      toast.success('تم تحديث المشروع بنجاح');
      router.push('/dashboard/projects');
    } catch (err: any) {
      toast.error('خطأ في تحديث المشروع: ' + err.message);
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AuthGuard>
        <DashboardLayout>
          <div className="text-center p-10">جارٍ تحميل بيانات المشروع...</div>
        </DashboardLayout>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow">
          <h1 className="text-2xl font-bold mb-6">تعديل بيانات المشروع</h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block mb-1">رقم المشروع *</label>
              <input name="projectNumber" value={formData.projectNumber} onChange={handleChange} required className="w-full border p-2 rounded" />
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
            <button type="submit" disabled={saving} className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'جارٍ الحفظ...' : 'حفظ التعديلات'}
            </button>
          </form>
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}