'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { databases } from '@/lib/appwrite';
import { DATABASE_ID, VEHICLES_COLLECTION_ID, VEHICLE_TRIPS_COLLECTION_ID } from '@/lib/constants';
import { useAuthStore } from '@/store/useAuthStore';
import { toast } from 'sonner';
import { ArrowRight } from 'lucide-react';
import TechnicianBottomNav from '@/components/TechnicianBottomNav';
import { createNotification } from '@/lib/notifications';

export default function NewTripPage() {
  const router = useRouter();
  const { employee } = useAuthStore();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [form, setForm] = useState({
    vehicleId: '',
    driverId: employee?.$id || '',
    companionId: '',
    departureTime: new Date().toISOString().slice(0, 16),
    destination: '',
    purpose: '',
    startMileage: '',
    status: 'قيد الرحلة',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const res = await databases.listDocuments(DATABASE_ID, VEHICLES_COLLECTION_ID, []);
        setVehicles(res.documents);
      } catch (err: any) {
        toast.error('فشل تحميل المركبات');
      }
    };
    fetchVehicles();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.vehicleId) { toast.error('اختر المركبة'); return; }
    setLoading(true);
    try {
      await databases.createDocument(DATABASE_ID, VEHICLE_TRIPS_COLLECTION_ID, 'unique()', {
        ...form,
        startMileage: parseInt(form.startMileage) || 0,
        returnTime: '',
      });

      // --- إنشاء تنبيه ---
      if (employee) {
        const vehicle = vehicles.find(v => v.$id === form.vehicleId);
        await createNotification({
          type: 'رحلة_بدء',
          message: `بدأ ${employee.name} رحلة بالمركبة ${vehicle?.plateNumber || ''} إلى ${form.destination || 'بدون وجهة'}`,
          employeeId: employee.$id,
          employeeName: employee.name,
        });
      }
      // --- نهاية التنبيه ---

      toast.success('تم بدء الرحلة بنجاح');
      router.push('/technician/vehicles');
    } catch (err: any) {
      toast.error('خطأ: ' + err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-16" dir="rtl">
      <header className="bg-green-600 text-white p-4 flex items-center gap-3 shadow">
        <button onClick={() => router.back()} className="text-white">
          <ArrowRight size={20} />
        </button>
        <h1 className="text-lg font-bold">بدء رحلة جديدة</h1>
      </header>

      <main className="p-4">
        <form onSubmit={handleSubmit} className="bg-white p-4 rounded-lg shadow space-y-4">
          <div>
            <label className="block mb-1 font-bold">المركبة *</label>
            <select name="vehicleId" value={form.vehicleId} onChange={handleChange} required className="w-full border p-2 rounded">
              <option value="">اختر المركبة</option>
              {vehicles.map((v) => (
                <option key={v.$id} value={v.$id}>{v.plateNumber} ({v.brand} {v.model})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-1 font-bold">السائق (أنت)</label>
            <input type="text" value={employee?.name || ''} disabled className="w-full border p-2 rounded bg-gray-100" />
          </div>

          <div>
            <label className="block mb-1 font-bold">تاريخ ووقت الانطلاق *</label>
            <input type="datetime-local" name="departureTime" value={form.departureTime} onChange={handleChange} required className="w-full border p-2 rounded" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block mb-1 font-bold">الوجهة</label>
              <input name="destination" value={form.destination} onChange={handleChange} className="w-full border p-2 rounded" placeholder="موقع المشروع" />
            </div>
            <div>
              <label className="block mb-1 font-bold">الغرض</label>
              <input name="purpose" value={form.purpose} onChange={handleChange} className="w-full border p-2 rounded" placeholder="أخذ عينات، فحص..." />
            </div>
          </div>

          <div>
            <label className="block mb-1 font-bold">قراءة العداد (الانطلاق)</label>
            <input type="number" name="startMileage" value={form.startMileage} onChange={handleChange} className="w-full border p-2 rounded" placeholder="كم" />
          </div>

          <button type="submit" disabled={loading} className="w-full bg-green-600 text-white py-3 rounded-lg font-bold text-lg hover:bg-green-700 disabled:opacity-50">
            {loading ? 'جارٍ البدء...' : 'بدء الرحلة'}
          </button>
        </form>
      </main>

      <TechnicianBottomNav />
    </div>
  );
}