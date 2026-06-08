'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { databases } from '@/lib/appwrite';
import { DATABASE_ID, VEHICLE_TRIPS_COLLECTION_ID, VEHICLES_COLLECTION_ID } from '@/lib/constants';
import { toast } from 'sonner';
import { ArrowRight, Save } from 'lucide-react';
import TechnicianBottomNav from '@/components/TechnicianBottomNav';
import { useAuthStore } from '@/store/useAuthStore';
import { createNotification } from '@/lib/notifications';

export default function EditTripPage() {
  const router = useRouter();
  const params = useParams();
  const tripId = params.tripId as string;
  const { employee } = useAuthStore();
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [form, setForm] = useState({
    departureTime: '',
    returnTime: new Date().toISOString().slice(0, 16),
    destination: '',
    purpose: '',
    startMileage: '',
    endMileage: '',
    notes: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchTrip = async () => {
      try {
        const trip = await databases.getDocument(DATABASE_ID, VEHICLE_TRIPS_COLLECTION_ID, tripId);
        setForm({
          departureTime: trip.departureTime,
          returnTime: trip.returnTime || new Date().toISOString().slice(0, 16),
          destination: trip.destination || '',
          purpose: trip.purpose || '',
          startMileage: trip.startMileage || '',
          endMileage: trip.endMileage || '',
          notes: trip.notes || '',
        });
        if (trip.vehicleId) {
          const vehicle = await databases.getDocument(DATABASE_ID, VEHICLES_COLLECTION_ID, trip.vehicleId);
          setVehiclePlate(vehicle.plateNumber);
        }
      } catch (err: any) {
        toast.error('فشل تحميل الرحلة');
      } finally {
        setLoading(false);
      }
    };
    fetchTrip();
  }, [tripId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await databases.updateDocument(DATABASE_ID, VEHICLE_TRIPS_COLLECTION_ID, tripId, {
        returnTime: form.returnTime,
        endMileage: parseInt(form.endMileage) || null,
        destination: form.destination,
        purpose: form.purpose,
        notes: form.notes,
        status: 'مكتملة',
      });

      // --- إنشاء تنبيه ---
      if (employee) {
        const distance = (parseInt(form.endMileage) || 0) - (parseInt(form.startMileage) || 0);
        await createNotification({
          type: 'رحلة_انهاء',
          message: `أنهى ${employee.name} رحلة المركبة ${vehiclePlate} وقطع ${distance > 0 ? distance : '?'} كم`,
          employeeId: employee.$id,
          employeeName: employee.name,
        });
      }
      // --- نهاية التنبيه ---

      toast.success('تم إنهاء الرحلة بنجاح');
      router.push('/technician/vehicles');
    } catch (err: any) {
      toast.error('خطأ: ' + err.message);
      setSaving(false);
    }
  };

  if (loading) return <div className="p-4 text-center">جارٍ التحميل...</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-16" dir="rtl">
      <header className="bg-green-600 text-white p-4 flex items-center gap-3 shadow">
        <button onClick={() => router.back()} className="text-white">
          <ArrowRight size={20} />
        </button>
        <h1 className="text-lg font-bold">إنهاء الرحلة - {vehiclePlate}</h1>
      </header>

      <main className="p-4">
        <form onSubmit={handleSubmit} className="bg-white p-4 rounded-lg shadow space-y-4">
          <div>
            <label className="block mb-1 font-bold">تاريخ ووقت الانطلاق</label>
            <input type="datetime-local" value={form.departureTime} disabled className="w-full border p-2 rounded bg-gray-100" />
          </div>

          <div>
            <label className="block mb-1 font-bold">تاريخ ووقت العودة *</label>
            <input type="datetime-local" name="returnTime" value={form.returnTime} onChange={handleChange} required className="w-full border p-2 rounded" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block mb-1 font-bold">الوجهة</label>
              <input name="destination" value={form.destination} onChange={handleChange} className="w-full border p-2 rounded" />
            </div>
            <div>
              <label className="block mb-1 font-bold">الغرض</label>
              <input name="purpose" value={form.purpose} onChange={handleChange} className="w-full border p-2 rounded" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block mb-1 font-bold">عداد الانطلاق</label>
              <input type="number" value={form.startMileage} disabled className="w-full border p-2 rounded bg-gray-100" />
            </div>
            <div>
              <label className="block mb-1 font-bold">عداد العودة *</label>
              <input type="number" name="endMileage" value={form.endMileage} onChange={handleChange} required className="w-full border p-2 rounded" />
            </div>
          </div>

          <div>
            <label className="block mb-1 font-bold">ملاحظات</label>
            <textarea name="notes" value={form.notes} onChange={handleChange} rows={2} className="w-full border p-2 rounded" placeholder="أي ملاحظات إضافية..." />
          </div>

          <button type="submit" disabled={saving} className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold text-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
            <Save size={20} />
            {saving ? 'جارٍ الحفظ...' : 'إنهاء الرحلة'}
          </button>
        </form>
      </main>

      <TechnicianBottomNav />
    </div>
  );
}