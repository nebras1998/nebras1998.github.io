'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { databases } from '@/lib/appwrite';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import { DATABASE_ID, SERVICES_COLLECTION_ID } from '@/lib/constants';
import { toast } from 'sonner';

const COMMON_CATEGORIES = [
  'فحوصات خرسانة',
  'فحوصات تربة',
  'فحوصات أسفلت',
  'فحوصات ركام',
  'فحوصات مياه',
  'فحوصات فولاذ',
  'فحوصات حجر وبلاط',
  'خدمات ميدانية',
  'أخرى',
];

export default function NewServicePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '',
    category: '',
    description: '',
    unit: '',
    price: '',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await databases.createDocument(DATABASE_ID, SERVICES_COLLECTION_ID, 'unique()', {
        ...form,
        price: parseFloat(form.price) || 0,
      });
      toast.success('تم إضافة الخدمة');
      router.push('/dashboard/finance/services');
    } catch (err: any) {
      toast.error('خطأ: ' + err.message);
      setLoading(false);
    }
  };

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="max-w-xl mx-auto bg-white p-6 rounded-lg shadow">
          <h1 className="text-2xl font-bold mb-6">إضافة خدمة جديدة</h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block mb-1">الاسم *</label>
              <input name="name" value={form.name} onChange={handleChange} required className="w-full border p-2 rounded" />
            </div>
            <div>
              <label className="block mb-1">الفئة</label>
              <select name="category" value={form.category} onChange={handleChange} className="w-full border p-2 rounded">
                <option value="">اختر الفئة</option>
                {COMMON_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
              <p className="text-xs text-gray-500 mt-1">يمكنك كتابة فئة جديدة مباشرة</p>
            </div>
            <div>
              <label className="block mb-1">الوصف</label>
              <textarea name="description" value={form.description} onChange={handleChange} rows={2} className="w-full border p-2 rounded" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block mb-1">الوحدة</label>
                <input name="unit" value={form.unit} onChange={handleChange} className="w-full border p-2 rounded" placeholder="مثلاً: مكعب، عينة" />
              </div>
              <div>
                <label className="block mb-1">السعر (₪) *</label>
                <input name="price" type="number" step="0.01" value={form.price} onChange={handleChange} required className="w-full border p-2 rounded" />
              </div>
            </div>
            <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'جارٍ الحفظ...' : 'حفظ الخدمة'}
            </button>
          </form>
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}