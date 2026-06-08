'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { databases } from '@/lib/appwrite';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import { DATABASE_ID, VEHICLES_COLLECTION_ID } from '@/lib/constants';
import { toast } from 'sonner';

export default function NewVehiclePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    plateNumber: '',
    brand: '',
    model: '',
    year: '',
    type: 'بيك أب',
    color: '',
    status: 'جاهزة',
    notes: '',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await databases.createDocument(DATABASE_ID, VEHICLES_COLLECTION_ID, 'unique()', form);
      toast.success('تم إضافة المركبة');
      router.push('/dashboard/vehicles');
    } catch (err: any) {
      toast.error('خطأ: ' + err.message);
      setLoading(false);
    }
  };

  return (
    <AuthGuard><DashboardLayout>
      <div className="max-w-xl mx-auto bg-white p-6 rounded-lg shadow">
        <h1 className="text-2xl font-bold mb-6">إضافة مركبة جديدة</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="block mb-1">رقم اللوحة *</label><input name="plateNumber" value={form.plateNumber} onChange={handleChange} required className="w-full border p-2 rounded" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block mb-1">الماركة</label><input name="brand" value={form.brand} onChange={handleChange} className="w-full border p-2 rounded" /></div>
            <div><label className="block mb-1">الموديل</label><input name="model" value={form.model} onChange={handleChange} className="w-full border p-2 rounded" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block mb-1">سنة الصنع</label><input name="year" value={form.year} onChange={handleChange} className="w-full border p-2 rounded" /></div>
            <div><label className="block mb-1">اللون</label><input name="color" value={form.color} onChange={handleChange} className="w-full border p-2 rounded" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block mb-1">النوع</label><select name="type" value={form.type} onChange={handleChange} className="w-full border p-2 rounded"><option value="بيك أب">بيك أب</option><option value="سيارة">سيارة</option><option value="شاحنة">شاحنة</option></select></div>
            <div><label className="block mb-1">الحالة *</label><select name="status" value={form.status} onChange={handleChange} required className="w-full border p-2 rounded"><option value="جاهزة">جاهزة</option><option value="قيد الصيانة">قيد الصيانة</option><option value="خارج الخدمة">خارج الخدمة</option></select></div>
          </div>
          <div><label className="block mb-1">ملاحظات</label><textarea name="notes" value={form.notes} onChange={handleChange} rows={2} className="w-full border p-2 rounded" /></div>
          <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50">{loading ? 'جارٍ الحفظ...' : 'حفظ المركبة'}</button>
        </form>
      </div>
    </DashboardLayout></AuthGuard>
  );
}