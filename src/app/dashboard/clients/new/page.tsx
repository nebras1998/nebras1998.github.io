'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { databases } from '@/lib/appwrite';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import { DATABASE_ID, CLIENTS_COLLECTION_ID } from '@/lib/constants';
import { toast } from 'sonner';

export default function NewClientPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    type: 'مكتب هندسي',
    email: '',
    phone: '',
    address: '',
    taxId: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await databases.createDocument(DATABASE_ID, CLIENTS_COLLECTION_ID, 'unique()', formData);
      toast.success('تم إضافة العميل بنجاح');
      router.push('/dashboard/clients');
    } catch (err: any) {
      toast.error('خطأ في إضافة العميل: ' + err.message);
      setLoading(false);
    }
  };

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow">
          <h1 className="text-2xl font-bold mb-6">إضافة عميل جديد</h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block mb-1">الاسم *</label>
              <input
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full border p-2 rounded"
              />
            </div>
            <div>
              <label className="block mb-1">النوع *</label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                required
                className="w-full border p-2 rounded"
              >
                <option value="مكتب هندسي">مكتب هندسي</option>
                <option value="مقاول">مقاول</option>
                <option value="بلدية">بلدية</option>
                <option value="جهة حكومية">جهة حكومية</option>
                <option value="فرد">فرد</option>
              </select>
            </div>
            <div>
              <label className="block mb-1">الهاتف *</label>
              <input
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
                className="w-full border p-2 rounded"
              />
            </div>
            <div>
              <label className="block mb-1">البريد الإلكتروني</label>
              <input
                name="email"
                value={formData.email}
                onChange={handleChange}
                type="email"
                className="w-full border p-2 rounded"
                placeholder="اختياري"
              />
            </div>
            <div>
              <label className="block mb-1">العنوان</label>
              <input
                name="address"
                value={formData.address}
                onChange={handleChange}
                className="w-full border p-2 rounded"
              />
            </div>
            <div>
              <label className="block mb-1">الرقم الضريبي</label>
              <input
                name="taxId"
                value={formData.taxId}
                onChange={handleChange}
                className="w-full border p-2 rounded"
              />
            </div>
            <div>
              <label className="block mb-1">ملاحظات</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                className="w-full border p-2 rounded"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'جارٍ الحفظ...' : 'حفظ العميل'}
            </button>
          </form>
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}