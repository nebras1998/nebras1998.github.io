'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { databases } from '@/lib/appwrite';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import { DATABASE_ID, EQUIPMENT_COLLECTION_ID } from '@/lib/constants';
import { toast } from 'sonner';

export default function NewEquipmentPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    model: '',
    serialNumber: '',
    purchaseDate: '',
    calibrationDate: '',
    nextCalibrationDate: '',
    maintenanceDate: '',
    status: 'يعمل',
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
      await databases.createDocument(DATABASE_ID, EQUIPMENT_COLLECTION_ID, 'unique()', formData);
      toast.success('تم إضافة الجهاز بنجاح');
      router.push('/dashboard/equipment');
    } catch (err: any) {
      toast.error('خطأ في إضافة الجهاز: ' + err.message);
      setLoading(false);
    }
  };

  return (
    <AuthGuard><DashboardLayout>
      <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow">
        <h1 className="text-2xl font-bold mb-6">إضافة جهاز جديد</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-1">اسم الجهاز *</label>
              <input name="name" value={formData.name} onChange={handleChange} required className="w-full border p-2 rounded" />
            </div>
            <div>
              <label className="block mb-1">الموديل</label>
              <input name="model" value={formData.model} onChange={handleChange} className="w-full border p-2 rounded" />
            </div>
          </div>
          <div>
            <label className="block mb-1">الرقم التسلسلي</label>
            <input name="serialNumber" value={formData.serialNumber} onChange={handleChange} className="w-full border p-2 rounded" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-1">تاريخ الشراء</label>
              <input name="purchaseDate" type="date" value={formData.purchaseDate} onChange={handleChange} className="w-full border p-2 rounded" />
            </div>
            <div>
              <label className="block mb-1">تاريخ آخر معايرة</label>
              <input name="calibrationDate" type="date" value={formData.calibrationDate} onChange={handleChange} className="w-full border p-2 rounded" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-1">تاريخ المعايرة القادمة</label>
              <input name="nextCalibrationDate" type="date" value={formData.nextCalibrationDate} onChange={handleChange} className="w-full border p-2 rounded" />
            </div>
            <div>
              <label className="block mb-1">تاريخ آخر صيانة</label>
              <input name="maintenanceDate" type="date" value={formData.maintenanceDate} onChange={handleChange} className="w-full border p-2 rounded" />
            </div>
          </div>
          <div>
            <label className="block mb-1">الحالة *</label>
            <select name="status" value={formData.status} onChange={handleChange} required className="w-full border p-2 rounded">
              <option value="يعمل">يعمل</option>
              <option value="قيد الصيانة">قيد الصيانة</option>
              <option value="متوقف">متوقف</option>
              <option value="خارج الخدمة">خارج الخدمة</option>
            </select>
          </div>
          <div>
            <label className="block mb-1">ملاحظات</label>
            <textarea name="notes" value={formData.notes} onChange={handleChange} rows={3} className="w-full border p-2 rounded" />
          </div>
          <button type="submit" disabled={loading} className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'جارٍ الحفظ...' : 'حفظ الجهاز'}
          </button>
        </form>
      </div>
    </DashboardLayout></AuthGuard>
  );
}